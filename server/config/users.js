const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Arquivo para persistir dados de usuários (em produção, usar banco de dados)
const USERS_FILE = path.join(__dirname, '../../data/users.json');
const LOGIN_ATTEMPTS_FILE = path.join(__dirname, '../../data/login_attempts.json');

// Garantir que o diretório data existe
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar dados de usuários
let users = [];
let loginAttempts = {};

// Carregar usuários do arquivo se existir
const loadUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      users = JSON.parse(data);
    } else {
      // Criar usuário admin padrão
      users = [
        {
          id: 1,
          username: 'admin',
          password: '$2a$10$XRqSVqWJX5lHJBQr5BwJcOvqeHgkmRPGKzYE5hzhpWKcGM.RtBYGO', // admin123
          role: 'admin',
          email: 'admin@fastboot.com',
          createdAt: new Date().toISOString(),
          lastLogin: null,
          isActive: true,
          permissions: ['all']
        }
      ];
      saveUsers();
    }
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    // Usar usuário padrão em caso de erro
    users = [
      {
        id: 1,
        username: 'admin',
        password: '$2a$10$XRqSVqWJX5lHJBQr5BwJcOvqeHgkmRPGKzYE5hzhpWKcGM.RtBYGO', // admin123
        role: 'admin',
        email: 'admin@fastboot.com',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true,
        permissions: ['all']
      }
    ];
  }
};

// Carregar tentativas de login
const loadLoginAttempts = () => {
  try {
    if (fs.existsSync(LOGIN_ATTEMPTS_FILE)) {
      const data = fs.readFileSync(LOGIN_ATTEMPTS_FILE, 'utf8');
      loginAttempts = JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar tentativas de login:', error);
    loginAttempts = {};
  }
};

// Salvar usuários no arquivo
const saveUsers = () => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Erro ao salvar usuários:', error);
  }
};

// Salvar tentativas de login
const saveLoginAttempts = () => {
  try {
    fs.writeFileSync(LOGIN_ATTEMPTS_FILE, JSON.stringify(loginAttempts, null, 2));
  } catch (error) {
    console.error('Erro ao salvar tentativas de login:', error);
  }
};

// Gerar hash da senha
const generatePasswordHash = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
};

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
    user.lastLogin = new Date().toISOString();
    saveUsers();
  }
};

// Função para atualizar senha do usuário
const updateUserPassword = (userId, newPasswordHash) => {
  const user = findUserById(userId);
  if (user) {
    user.password = newPasswordHash;
    user.passwordChangedAt = new Date().toISOString();
    saveUsers();
    return true;
  }
  return false;
};

// Funções para gerenciar tentativas de login
const getUserLoginAttempts = (username) => {
  return loginAttempts[username] || { count: 0, lastAttempt: null };
};

const incrementLoginAttempts = (username) => {
  if (!loginAttempts[username]) {
    loginAttempts[username] = { count: 0, lastAttempt: null };
  }
  loginAttempts[username].count += 1;
  loginAttempts[username].lastAttempt = Date.now();
  saveLoginAttempts();
};

const resetLoginAttempts = (username) => {
  if (loginAttempts[username]) {
    delete loginAttempts[username];
    saveLoginAttempts();
  }
};

// Criar novo usuário
const createUser = async (userData) => {
  const existingUser = findUserByUsername(userData.username);
  if (existingUser) {
    throw new Error('Usuário já existe');
  }

  const newUser = {
    id: users.length + 1,
    username: userData.username,
    password: await generatePasswordHash(userData.password),
    role: userData.role || 'user',
    email: userData.email,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true,
    permissions: userData.permissions || []
  };

  users.push(newUser);
  saveUsers();
  return newUser;
};

// Listar todos os usuários
const getAllUsers = () => {
  return users.map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isActive: user.isActive
  }));
};

// Atualizar usuário
const updateUser = (userId, updates) => {
  const user = findUserById(userId);
  if (user) {
    Object.assign(user, updates);
    saveUsers();
    return user;
  }
  return null;
};

// Deletar usuário
const deleteUser = (userId) => {
  const index = users.findIndex(user => user.id === userId);
  if (index !== -1) {
    users.splice(index, 1);
    saveUsers();
    return true;
  }
  return false;
};

// Inicializar dados ao carregar o módulo
loadUsers();
loadLoginAttempts();

module.exports = {
  users,
  findUserByUsername,
  findUserById,
  updateLastLogin,
  updateUserPassword,
  getUserLoginAttempts,
  incrementLoginAttempts,
  resetLoginAttempts,
  generatePasswordHash,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
};
