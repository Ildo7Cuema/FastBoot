module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Regras personalizadas para o projeto
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação de código
        'refactor', // Refatoração
        'perf',     // Melhorias de performance
        'test',     // Adição ou correção de testes
        'chore',    // Tarefas de manutenção
        'ci',       // Configurações de CI/CD
        'build',    // Build do sistema
        'revert',   // Reverter commit anterior
        'security', // Correções de segurança
        'wip',      // Trabalho em progresso
      ],
    ],
    
    // Tamanho do assunto do commit
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    
    // Tamanho do corpo do commit
    'body-max-line-length': [2, 'always', 100],
    
    // Tamanho do footer do commit
    'footer-max-line-length': [2, 'always', 100],
    
    // Regras específicas para o projeto
    'scope-enum': [
      2,
      'always',
      [
        'auth',      // Autenticação
        'api',       // API
        'ui',        // Interface do usuário
        'backend',   // Backend
        'frontend',  // Frontend
        'db',        // Banco de dados
        'test',      // Testes
        'docs',      // Documentação
        'ci',        // CI/CD
        'deps',      // Dependências
        'security',  // Segurança
        'perf',      // Performance
        'refactor',  // Refatoração
        'style',     // Estilo de código
      ],
    ],
    
    // Permitir commits sem escopo para mudanças gerais
    'scope-empty': [2, 'never'],
  },
  
  // Configurações de mensagens de commit
  prompt: {
    questions: {
      type: {
        description: 'Selecione o tipo de mudança:',
        enum: {
          feat: {
            description: '✨ Nova funcionalidade',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: '🐛 Correção de bug',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: '📚 Documentação',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: '💄 Formatação de código',
            title: 'Styles',
            emoji: '💄',
          },
          refactor: {
            description: '♻️ Refatoração',
            title: 'Code Refactoring',
            emoji: '♻️',
          },
          perf: {
            description: '⚡ Melhorias de performance',
            title: 'Performance Improvements',
            emoji: '⚡',
          },
          test: {
            description: '🚨 Adição ou correção de testes',
            title: 'Tests',
            emoji: '🚨',
          },
          chore: {
            description: '🔧 Tarefas de manutenção',
            title: 'Chores',
            emoji: '🔧',
          },
        },
      },
      scope: {
        description: 'Indique o escopo da mudança (opcional):',
      },
      subject: {
        description: 'Escreva uma descrição curta da mudança:',
      },
      body: {
        description: 'Forneça uma descrição mais detalhada da mudança (opcional):',
      },
      isBreaking: {
        description: 'Há mudanças que quebram a compatibilidade?',
      },
      breakingBody: {
        description: 'Descreva as mudanças que quebram a compatibilidade:',
      },
      breaking: {
        description: 'Descreva as mudanças que quebram a compatibilidade:',
      },
    },
  },
};
