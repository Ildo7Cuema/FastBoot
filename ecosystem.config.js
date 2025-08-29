module.exports = {
  apps: [
    {
      name: 'fastboot-factory-reset',
      script: './server/index.js',
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        watch: ['server', 'src'],
        ignore_watch: ['node_modules', 'logs', 'uploads', 'data', 'backups'],
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: process.env.PORT || 5000,
      },

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 5000,

      // Monitoring
      min_uptime: '10s',
      max_restarts: 10,

      // Auto restart on file changes in development
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000,
      },

      // Error handling
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      combine_logs: true,

      // Advanced PM2 features
      instance_var: 'INSTANCE_ID',

      // Pre and post scripts
      pre_setup: "echo 'Setting up FastBoot application'",
      post_setup: "echo 'FastBoot application setup complete'",

      // Restart delay
      restart_delay: 4000,

      // CPU and memory alerts
      max_memory_restart: '1G',

      // Node.js arguments
      node_args: '--max-old-space-size=1024',

      // Interpreter arguments
      interpreter_args: '',

      // Cron restart
      cron_restart: '0 2 * * *', // Restart daily at 2 AM

      // Source map support
      source_map_support: true,
    },
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: process.env.DEPLOY_HOST || 'your-server.com',
      ref: 'origin/master',
      repo: 'git@github.com:your-repo/fastboot-factory-reset.git',
      path: '/var/www/fastboot',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no',
    },
    staging: {
      user: 'deploy',
      host: process.env.STAGING_HOST || 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-repo/fastboot-factory-reset.git',
      path: '/var/www/fastboot-staging',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
};
