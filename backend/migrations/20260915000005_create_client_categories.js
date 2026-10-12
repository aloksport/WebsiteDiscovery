exports.up = function (knex) {
  return knex.schema.createTable('client_categories', (table) => {
    table.increments('id').primary();
    table
      .integer('client_id')
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    table
      .integer('category_id')
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');
    table.unique(['client_id', 'category_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('client_categories');
};
