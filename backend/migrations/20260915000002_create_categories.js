exports.up = function (knex) {
  return knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    // url-safe slug generated from name, no spaces, unique
    table.string('slug', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['name']);
    table.unique(['slug']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('categories');
};
