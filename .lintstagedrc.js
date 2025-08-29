module.exports = {
  // JavaScript/JSX files
  '*.{js,jsx}': ['eslint --fix', 'prettier --write'],

  // TypeScript files
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write'],

  // CSS/SCSS files
  '*.{css,scss}': ['prettier --write'],

  // HTML files
  '*.html': ['prettier --write'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],
};
