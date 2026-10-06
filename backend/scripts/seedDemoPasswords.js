import bcrypt from 'bcryptjs';
import { query, one } from '../src/config/db.js';

export async function resetDemoPasswords(password = 'Admin@123') {
  const hash = await bcrypt.hash(password, 10);
  const users = await query('SELECT id, email FROM employees');
  for (const u of users) {
    await query('UPDATE employees SET password_hash = ? WHERE id = ?', [hash, u.id]);
  }
  console.log(`» Passwords reset for ${users.length} seeded users → "${password}"`);
  return users.length;
}

// Allow standalone execution: `npm run db:seed-demo`
if (process.argv[1] && process.argv[1].endsWith('seedDemoPasswords.js')) {
  resetDemoPasswords()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
