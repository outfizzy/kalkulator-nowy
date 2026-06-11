// PM2 Ecosystem Config — Polendach24 Pricing Worker
// Works on both Hetzner VPS and Mac Mini
//
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 logs polendach-worker
//   pm2 restart polendach-worker
//   pm2 stop polendach-worker

module.exports = {
  apps: [
    {
      name: 'polendach-worker',
      script: 'npx',
      args: 'tsx scripts/pricing-worker.ts',
      cwd: __dirname,
      
      // Restart policy
      max_memory_restart: '3G',
      restart_delay: 5000,
      max_restarts: 10,
      
      // Environment
      env: {
        NODE_ENV: 'production',
        HEADLESS: 'true',
      },
      
      // Logs
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Watch (disabled in production)
      watch: false,
    },
  ],
};
