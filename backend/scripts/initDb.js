import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, '..', 'src', 'db');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

async function run() {
  const conn = await mysql.createConnection(config);
  console.log('» Connected to MySQL, applying schema…');

  const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
  await conn.query(schema);
  console.log('» schema.sql applied');

  const views = fs.readFileSync(path.join(dbDir, 'powerbi_views.sql'), 'utf8');
  await conn.query(views);
  console.log('» powerbi_views.sql applied');

  const seed = fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8');
  await conn.query(seed);
  console.log('» seed.sql applied');

  await conn.end();

  // Give demo users real, working bcrypt passwords.
  const { resetDemoPasswords } = await import('./seedDemoPasswords.js');
  await resetDemoPasswords();

  const { default: pool } = await import('../src/config/db.js');
  await pool.end();

  console.log('\n✔ Database initialised.');
  console.log('  Demo logins:');
  console.log('    admin@leadflow.io    / Admin@123   (Admin)');
  console.log('    priya@leadflow.io    / Admin@123   (Employee)');
  console.log('    arun@leadflow.io     / Admin@123   (Developer)\n');
}

run().catch((err) => {
  console.error('✖ DB init failed:', err.message);
  process.exit(1);
});
