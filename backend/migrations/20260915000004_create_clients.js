exports.up = function (knex) {
  return knex.schema.createTable('clients', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable();
    table.string('company_name', 255).notNullable();
    table.string('phone', 50);
    // url-safe slug generated from company_name, no spaces, unique
    table.string('slug', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['email']);
    table.unique(['slug']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('clients');
};
