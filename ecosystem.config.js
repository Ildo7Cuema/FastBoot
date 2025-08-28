module.exports = {
  apps: [
    {
      name: 'fastboot-web',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        JWT_SECRET: 'dev-secret-key-change-in-production'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 5000
    }
  ],

  deploy: {
    production: {
      user: 'fastboot',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:seu-usuario/fastboot-factory-reset-web.git',
      path: '/var/www/fastboot-web',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
