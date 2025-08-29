const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { findUserByUsername, updateLastLogin, updateUserPassword, getUserLoginAttempts, incrementLoginAttempts, resetLoginAttempts } = require('../config/users');

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'fastboot-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOGIN_LOCKOUT_TIME = parseInt(process.env.LOGIN_LOCKOUT_TIME) || 300000; // 5 minutos

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se o usuário está bloqueado
const checkLoginAttempts = async (username) => {
  const attempts = getUserLoginAttempts(username);
  if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < LOGIN_LOCKOUT_TIME) {
      const remainingTime = Math.ceil((LOGIN_LOCKOUT_TIME - timeSinceLastAttempt) / 1000 / 60);
      throw new Error(`Conta bloqueada. Tente novamente em ${remainingTime} minutos.`);
    } else {
      resetLoginAttempts(username);
    }
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    // Verificar tentativas de login
    try {
      await checkLoginAttempts(username);
    } catch (error) {
      return res.status(429).json({ error: error.message });
    }

    const user = findUserByUsername(username);
    if (!user) {
      incrementLoginAttempts(username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      incrementLoginAttempts(username);
      const attempts = getUserLoginAttempts(username);
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts.count;
      
      if (remainingAttempts > 0) {
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          remainingAttempts 
        });
      } else {
        return res.status(429).json({ 
          error: `Conta bloqueada após ${MAX_LOGIN_ATTEMPTS} tentativas falhas. Tente novamente em 5 minutos.` 
        });
      }
    }

    // Reset tentativas de login em caso de sucesso
    resetLoginAttempts(username);
    
    // Atualizar último login
    updateLastLogin(user.id);

    // Criar token com mais informações
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      loginTime: Date.now()
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Criar refresh token (opcional para implementação futura)
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    req.logger.info(`Login bem-sucedido para usuário: ${username}`);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      },
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    req.logger.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  // Aqui você pode implementar blacklist de tokens se necessário
  req.logger.info(`Logout do usuário: ${req.user.username}`);
  res.json({ message: 'Logout realizado com sucesso' });
});

// Alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = findUserByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    
    // Atualizar senha
    updateUserPassword(userId, hashedPassword);

    req.logger.info(`Senha alterada para usuário: ${req.user.username}`);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    req.logger.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }

    jwt.verify(refreshToken, JWT_SECRET, (err, decoded) => {
      if (err || decoded.type !== 'refresh') {
        return res.status(403).json({ error: 'Refresh token inválido' });
      }

      const user = findUserByUsername(decoded.username);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          loginTime: Date.now()
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({ token: newToken, expiresIn: JWT_EXPIRES_IN });
    });
  } catch (error) {
    req.logger.error('Erro ao renovar token:', error);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
