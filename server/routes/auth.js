const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loadUsers, saveUsers, loadLoginAttempts, saveLoginAttempts } = require('../config/users');

const router = express.Router();

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOGIN_LOCKOUT_TIME = parseInt(process.env.LOGIN_LOCKOUT_TIME) || 15 * 60 * 1000;

// Middleware para verificar tentativas de login
const checkLoginAttempts = (req, res, next) => {
    const { username } = req.body;
    const attempts = loadLoginAttempts();
    const userAttempts = attempts[username] || { count: 0, lastAttempt: 0 };
    
    const now = Date.now();
    if (userAttempts.count >= MAX_LOGIN_ATTEMPTS && 
        (now - userAttempts.lastAttempt) < LOGIN_LOCKOUT_TIME) {
        return res.status(429).json({
            error: 'Too many login attempts',
            message: `Account locked for ${Math.ceil((LOGIN_LOCKOUT_TIME - (now - userAttempts.lastAttempt)) / 1000 / 60)} minutes`
        });
    }
    
    next();
};

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    message: 'Please refresh your token or login again'
                });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Rota de login
router.post('/login', checkLoginAttempts, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const users = loadUsers();
        const user = users.find(u => u.username === username && u.is_active);

        if (!user) {
            incrementLoginAttempts(username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            incrementLoginAttempts(username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        resetLoginAttempts(username);

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
            message: 'Login successful',
            user: { id: user.id, username: user.username, role: user.role, email: user.email },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rota de logout
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logout successful' });
});

// Rota para alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const users = loadUsers();
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        user.password_hash = newPasswordHash;
        user.updated_at = new Date().toISOString();

        saveUsers(users);
        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rota para refresh token
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        const accessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ accessToken });
    });
});

// Rota para verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: { id: req.user.id, username: req.user.username, role: req.user.role }
    });
});

// Funções auxiliares para login attempts
function incrementLoginAttempts(username) {
    const attempts = loadLoginAttempts();
    if (!attempts[username]) {
        attempts[username] = { count: 0, lastAttempt: 0 };
    }
    attempts[username].count++;
    attempts[username].lastAttempt = Date.now();
    saveLoginAttempts(attempts);
}

function resetLoginAttempts(username) {
    const attempts = loadLoginAttempts();
    if (attempts[username]) {
        attempts[username].count = 0;
        attempts[username].lastAttempt = 0;
        saveLoginAttempts(attempts);
    }
}

module.exports = router;
