module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',

  // Diretórios de teste
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  // Diretórios a serem ignorados
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Cobertura de código
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.js',
    'src/modules/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],

  // Diretório de cobertura
  coverageDirectory: 'coverage',

  // Tipos de arquivo para cobertura
  coverageReporters: ['text', 'lcov', 'html'],

  // Limite de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup de teste
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout dos testes
  testTimeout: 10000,

  // Verbose
  verbose: true,

  // Clear mocks entre testes
  clearMocks: true,

  // Restore mocks entre testes
  restoreMocks: true,

  // Configurações específicas para módulos
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@config/(.*)$': '<rootDir>/server/config/$1',
  },

  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Extensões de arquivo
  moduleFileExtensions: ['js', 'json'],

  // Configurações de ambiente
  testEnvironmentOptions: {
    url: 'http://localhost:5000',
  },
};
