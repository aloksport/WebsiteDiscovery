exports.up = function (knex) {
  return knex.schema.createTable('questions', (table) => {
    table.increments('id').primary();
    table.text('text').notNullable();
    // one of: text, textarea, checkbox, radio, date, select
    table.string('type', 20).notNullable();
    // used by checkbox / radio / select questions, array of option labels
    table.jsonb('options');
    table.boolean('required').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('questions');
};
