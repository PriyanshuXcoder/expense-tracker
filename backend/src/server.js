require('dotenv').config();
const app  = require('./app');
const { connectDB } = require('./db/database');

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`✅  Expense Tracker API listening on http://localhost:${PORT}`);
    console.log(`    Health: http://localhost:${PORT}/health`);
    console.log(`    Mode:   ${process.env.NODE_ENV || 'development'}`);
  });

  function shutdown(signal) {
    console.log(`\n[shutdown] Received ${signal}. Closing HTTP server…`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      console.log('[shutdown] All connections and DB drained. Exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[shutdown] Forced exit after timeout.');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
