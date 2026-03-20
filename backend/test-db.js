
const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  database: 'ocr_agent'
});
client.connect()
  .then(() => {
    console.log('Connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    process.exit(1);
  });
