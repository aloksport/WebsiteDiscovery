exports.up = function (knex) {
  return knex.schema.createTable('groups', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['name']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('groups');
};
