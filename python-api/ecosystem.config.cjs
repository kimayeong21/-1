module.exports = {
  apps: [
    {
      name: 'memorylink-python',
      script: 'python3',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
      cwd: '/home/user/memorylink/python-api',
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: '/home/user/memorylink/python-api'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: '/home/user/memorylink/logs/python-api-error.log',
      out_file: '/home/user/memorylink/logs/python-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
