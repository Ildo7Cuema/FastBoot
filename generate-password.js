const bcrypt = require('bcryptjs');

const password = 'Ildo7..Marques';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Erro ao gerar hash:', err);
        return;
    }
    console.log('Hash da senha:', hash);
    
    // Testar se o hash está correto
    bcrypt.compare(password, hash, (err, result) => {
        if (err) {
            console.error('Erro ao verificar senha:', err);
            return;
        }
        console.log('Senha verificada com sucesso:', result);
    });
});
