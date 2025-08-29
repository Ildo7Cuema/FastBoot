const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const LOGIN_ATTEMPTS_FILE = path.join(__dirname, '../data/login_attempts.json');

const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [];
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

function loadLoginAttempts() {
    try {
        if (fs.existsSync(LOGIN_ATTEMPTS_FILE)) {
            const data = fs.readFileSync(LOGIN_ATTEMPTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading login attempts:', error);
    }
    return {};
}

function saveLoginAttempts(attempts) {
    try {
        fs.writeFileSync(LOGIN_ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
    } catch (error) {
        console.error('Error saving login attempts:', error);
    }
}

module.exports = { loadUsers, saveUsers, loadLoginAttempts, saveLoginAttempts };
