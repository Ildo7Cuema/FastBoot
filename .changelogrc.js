module.exports = {
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'docs', section: '📚 Documentation' },
    { type: 'style', section: '💄 Styles' },
    { type: 'refactor', section: '♻️ Code Refactoring' },
    { type: 'perf', section: '⚡ Performance Improvements' },
    { type: 'test', section: '🚨 Tests' },
    { type: 'build', section: '🔨 Build System' },
    { type: 'ci', section: '👷 CI Configuration' },
    { type: 'chore', section: '🔧 Chores' },
    { type: 'revert', section: '⏪ Reverts' },
    { type: 'security', section: '🔒 Security' },
    { type: 'wip', section: '🚧 Work in Progress' },
  ],

  // Configurações de template
  template: {
    commit: '{{hash}} {{message}}',
    issue: '- {{name}} [{{text}}]({{url}})',
    merge: '- {{name}} {{text}}',
    note: '\n\n{{text}}\n',
    revert: '{{header}}\n\n{{body}}',
    group: '\n### {{title}}\n',
    breaking: '\n\n#### BREAKING CHANGES\n{{body}}',
    footer: '\n\n{{footer}}',
    finalize: '\n\n{{footer}}',
    release: '## {{release}} ({{date}})\n{{body}}',
  },

  // Configurações de release
  releaseCount: 0,
  outputUnreleased: true,

  // Configurações de grupos
  groupBy: 'type',
  commitGroupsSort: 'title',
  commitsSort: 'header',

  // Configurações de links
  issuePrefixes: ['#'],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: '{{host}}/{{owner}}/{{repository}}/issues/{{id}}',
  userUrlFormat: '{{host}}/{{user}}',

  // Configurações de data
  dateFormat: 'YYYY-MM-DD',

  // Configurações de repositório
  repositoryUrl: 'https://github.com/seu-usuario/fastboot-factory-reset-web',

  // Configurações de labels
  labels: {
    feat: 'enhancement',
    fix: 'bug',
    docs: 'documentation',
    style: 'style',
    refactor: 'refactor',
    perf: 'performance',
    test: 'test',
    build: 'build',
    ci: 'ci',
    chore: 'chore',
    revert: 'revert',
    security: 'security',
    wip: 'wip',
  },
};
