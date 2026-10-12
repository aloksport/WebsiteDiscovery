exports.up = function (knex) {
  return knex.schema.alterTable('client_categories', (table) => {
    table.integer('sort_order').notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('client_categories', (table) => {
    table.dropColumn('sort_order');
  });
};
