const bcrypt = require('bcryptjs');

// Gerar hash da senha 'admin123'
const generateAdminPassword = async () => {
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
};

// Usuários padrão (em produção, usar banco de dados)
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$rQZ9K8mN2pL1vX3yJ6hG7tU4iE5fA8bC9dD0eF1gH2iI3jJ4kK5lL6mM7nN8oO9pP0qQ1rR2sS3tT4uU5vV6wW7xX8yY9zZ0', // admin123
    role: 'admin',
    createdAt: new Date(),
    lastLogin: null
  }
];

// Função para verificar se um usuário existe
const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

// Função para verificar se um usuário existe por ID
const findUserById = (id) => {
  return users.find(user => user.id === id);
};

// Função para atualizar último login
const updateLastLogin = (userId) => {
  const user = findUserById(userId);
  if (user) {
    user.lastLogin = new Date();
  }
};

module.exports = {
  users,
  findUserByUsername,
  findUserById,
  updateLastLogin,
  generateAdminPassword
};
