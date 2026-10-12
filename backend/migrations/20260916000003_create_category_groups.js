exports.up = function (knex) {
  return knex.schema.createTable('category_groups', (table) => {
    table.increments('id').primary();
    table
      .integer('category_id')
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');
    table
      .integer('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
      .onDelete('CASCADE');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.unique(['category_id', 'group_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('category_groups');
};
