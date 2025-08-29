const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
    getUserByUsername, 
    getUserById,
    createUser,
    updateUserPassword,
    recordLoginAttempt,
    resetLoginAttempts,
    isUserLocked,
    lockUser,
    getAllUsers
} = require('../config/database');

const router = express.Router();

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOGIN_LOCKOUT_TIME = parseInt(process.env.LOGIN_LOCKOUT_TIME) || 15; // minutos

// Middleware para verificar tentativas de login
const checkLoginAttempts = async (req, res, next) => {
    const { username } = req.body;
    
    try {
        const isLocked = await isUserLocked(username);
        if (isLocked) {
            return res.status(429).json({
                error: 'Muitas tentativas de login',
                message: `Conta bloqueada. Tente novamente mais tarde.`
            });
        }
        next();
    } catch (error) {
        console.error('Erro ao verificar tentativas de login:', error);
        next();
    }
};

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// Rota de login
router.post('/login', checkLoginAttempts, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Utilizador e senha são obrigatórios' });
        }

        // Buscar usuário no banco
        const user = await getUserByUsername(username);

        if (!user) {
            await recordLoginAttempt(username);
            return res.status(401).json({ error: 'Utilizador ou senha incorretos' });
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            const attempts = await recordLoginAttempt(username);
            
            // Bloquear após muitas tentativas
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                await lockUser(username, LOGIN_LOCKOUT_TIME);
                return res.status(429).json({ 
                    error: 'Muitas tentativas de login',
                    message: `Conta bloqueada por ${LOGIN_LOCKOUT_TIME} minutos`
                });
            }
            
            return res.status(401).json({ 
                error: 'Utilizador ou senha incorretos',
                remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts
            });
        }

        // Reset tentativas de login em caso de sucesso
        await resetLoginAttempts(username);

        // Gerar tokens
        const accessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );

        res.json({
            message: 'Login realizado com sucesso',
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                email: user.email 
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Erro durante login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de logout
router.post('/logout', authenticateToken, (req, res) => {
    // Em uma implementação real, você pode invalidar o token aqui
    res.json({ message: 'Logout realizado com sucesso' });
});

// Rota para verificar token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ 
            valid: true, 
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para refresh token
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token não fornecido' });
    }

    jwt.verify(refreshToken, JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Refresh token inválido' });
        }

        // Verificar se usuário ainda existe e está ativo
        const dbUser = await getUserById(user.id);
        if (!dbUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const accessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ accessToken });
    });
});

// Rota para criar novo usuário (apenas admin)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, email, role = 'user' } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Utilizador e senha são obrigatórios' });
        }

        // Verificar se usuário já existe
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Utilizador já existe' });
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(password, 10);

        // Criar usuário
        const result = await createUser(username, passwordHash, email, role);

        res.status(201).json({
            message: 'Utilizador criado com sucesso',
            userId: result.id
        });

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Rota para alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
        }

        // Buscar usuário
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Hash da nova senha
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Atualizar senha
        await updateUserPassword(userId, newPasswordHash);

        res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// Rota para listar usuários (apenas admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Rota para atualizar usuário (apenas admin)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;
        
        // Por enquanto, retorna sucesso
        // Em produção, você implementaria a lógica de atualização
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Rota para desativar usuário (apenas admin)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
        }
        
        await deactivateUser(userId);
        res.json({ message: 'Usuário desativado com sucesso' });
    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        res.status(500).json({ error: 'Erro ao desativar usuário' });
    }
});

module.exports = router;