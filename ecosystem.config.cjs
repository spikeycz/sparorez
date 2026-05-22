module.exports = {
  apps: [{
    name: 'sparorez',
    script: 'npx',
    args: 'tsx server/index.ts',
    cwd: '/home/petr/sparorez',
    env: {
      NODE_ENV: 'production',
      PORT: 3060,
      DATABASE_URL: 'postgresql://petr@/sparorez?host=/var/run/postgresql',
      JWT_SECRET: 'bf701f37c99c821a0e6d88805682506fcd6c2065b69da8754a809aeffff3c447',
    },
  }],
};
