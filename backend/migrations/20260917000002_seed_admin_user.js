const bcrypt = require('bcryptjs');

// Seeded so there's always at least one account that can log in to the
// admin panel out of the box. Change this password after first login.
const SEED_EMAIL = 'alok@sportainmentdesign.com';
const SEED_PASSWORD = '123456';

exports.up = async function (knex) {
  const existing = await knex('users').whereRaw('lower(email) = ?', [SEED_EMAIL]).first();
  if (existing) return;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await knex('users').insert({
    full_name: 'Alok',
    email: SEED_EMAIL,
    phone: null,
    password_hash: passwordHash,
    role: 'admin',
  });
};

exports.down = async function (knex) {
  await knex('users').whereRaw('lower(email) = ?', [SEED_EMAIL]).delete();
};
