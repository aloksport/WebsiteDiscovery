exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('full_name', 255).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50);
    table.string('password_hash', 255).notNullable();
    // admin/manager can log in to the admin panel; 'user' cannot (see routes/auth.ts)
    table.string('role', 20).notNullable().defaultTo('user');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['email']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
