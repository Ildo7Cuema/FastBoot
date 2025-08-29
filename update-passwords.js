const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/fastboot.db');
const db = new sqlite3.Database(dbPath);

const users = [
    { username: 'IldoAdmin', password: 'Ildo7..Marques' },
    { username: 'admin', password: 'admin123' }
];

let completed = 0;

users.forEach(user => {
    bcrypt.hash(user.password, 12, (err, hash) => {
        if (err) {
            console.error(`Erro ao gerar hash para ${user.username}:`, err);
            return;
        }
        
        const sql = 'UPDATE users SET password_hash = ? WHERE username = ?';
        db.run(sql, [hash, user.username], function(err) {
            if (err) {
                console.error(`Erro ao atualizar ${user.username}:`, err);
            } else {
                console.log(`✅ ${user.username} atualizado com sucesso!`);
                console.log(`   Senha: ${user.password}`);
            }
            
            completed++;
            if (completed === users.length) {
                console.log('\n🎉 Todas as senhas foram atualizadas!');
                db.close();
            }
        });
    });
});
