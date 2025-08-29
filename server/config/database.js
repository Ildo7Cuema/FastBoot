const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Configurar caminho do banco de dados
const dbPath = path.join(__dirname, '../data/fastboot.db');
const dbDir = path.dirname(dbPath);

// Criar diretório se não existir
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
    }
});

// Criar tabelas se não existirem
db.serialize(() => {
    // Tabela de usuários
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de tentativas de login
    db.run(`
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            attempts INTEGER DEFAULT 1,
            last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
            locked_until DATETIME
        )
    `);

    // Tabela de logs
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            meta TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de dispositivos
    db.run(`
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            model TEXT,
            manufacturer TEXT,
            android_version TEXT,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'offline'
        )
    `);

    // Criar usuário admin padrão se não existir
    db.get("SELECT * FROM users WHERE username = ?", ['admin'], async (err, row) => {
        if (!row) {
            const defaultPassword = 'admin123';
            const hash = await bcrypt.hash(defaultPassword, 10);
            
            db.run(
                "INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)",
                ['admin', hash, 'admin@example.com', 'admin'],
                (err) => {
                    if (err) {
                        console.error('Erro ao criar usuário admin:', err);
                    } else {
                        console.log('Usuário admin criado com sucesso!');
                        console.log('Username: admin');
                        console.log('Password: admin123');
                    }
                }
            );
        }
    });
});

// Funções auxiliares do banco
const dbFunctions = {
    // Buscar usuário por username
    getUserByUsername: (username) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM users WHERE username = ? AND is_active = 1",
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    // Buscar usuário por ID
    getUserById: (id) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT id, username, email, role, created_at FROM users WHERE id = ? AND is_active = 1",
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    // Criar novo usuário
    createUser: (username, passwordHash, email, role = 'user') => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)",
                [username, passwordHash, email, role],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    // Atualizar senha do usuário
    updateUserPassword: (userId, passwordHash) => {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [passwordHash, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Registrar tentativa de login
    recordLoginAttempt: (username) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM login_attempts WHERE username = ?",
                [username],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (row) {
                        // Atualizar tentativas existentes
                        db.run(
                            "UPDATE login_attempts SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP WHERE username = ?",
                            [username],
                            (err) => {
                                if (err) reject(err);
                                else resolve(row.attempts + 1);
                            }
                        );
                    } else {
                        // Criar novo registro
                        db.run(
                            "INSERT INTO login_attempts (username) VALUES (?)",
                            [username],
                            (err) => {
                                if (err) reject(err);
                                else resolve(1);
                            }
                        );
                    }
                }
            );
        });
    },

    // Resetar tentativas de login
    resetLoginAttempts: (username) => {
        return new Promise((resolve, reject) => {
            db.run(
                "DELETE FROM login_attempts WHERE username = ?",
                [username],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Verificar se usuário está bloqueado
    isUserLocked: (username) => {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM login_attempts WHERE username = ? AND locked_until > datetime('now')",
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    },

    // Bloquear usuário
    lockUser: (username, minutes = 15) => {
        return new Promise((resolve, reject) => {
            const lockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            db.run(
                "UPDATE login_attempts SET locked_until = ? WHERE username = ?",
                [lockedUntil, username],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Listar todos os usuários
    getAllUsers: () => {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC",
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    // Desativar usuário
    deactivateUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Adicionar log
    addLog: (level, message, meta = null) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO logs (level, message, meta) VALUES (?, ?, ?)",
                [level, message, JSON.stringify(meta)],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Buscar logs
    getLogs: (limit = 100, offset = 0) => {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                [limit, offset],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
};

module.exports = {
    db,
    ...dbFunctions
};