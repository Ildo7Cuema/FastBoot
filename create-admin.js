const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/fastboot.db');
const db = new sqlite3.Database(dbPath);

const username = 'IldoAdmin';
const password = 'Ildo7..Marques';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Erro ao gerar hash:', err);
        db.close();
        return;
    }
    
    const sql = 'INSERT OR REPLACE INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, ?)';
    db.run(sql, [username, hash, 'admin', 1], function(err) {
        if (err) {
            console.error('Erro ao inserir usuário:', err);
        } else {
            console.log('✅ Usuário administrador criado com sucesso!');
            console.log('👤 Username:', username);
            console.log('🔑 Senha:', password);
        }
        db.close();
    });
});
