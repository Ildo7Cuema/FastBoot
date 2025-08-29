const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/fastboot.db');
const db = new sqlite3.Database(dbPath);

const username = 'IldoAdmin';
const password = 'Ildo7..Marques';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Erro:', err);
        return;
    }
    
    console.log('Hash gerado:', hash);
    
    const sql = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
    db.run(sql, [username, hash, 'admin'], function(err) {
        if (err) {
            console.error('Erro ao inserir:', err);
        } else {
            console.log('✅ Usuário criado!');
            console.log('👤 Username:', username);
            console.log('🔑 Senha:', password);
        }
        db.close();
    });
});
