exports.up = function (knex) {
  return knex.schema.createTable('category_questions', (table) => {
    table.increments('id').primary();
    table
      .integer('category_id')
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');
    table
      .integer('question_id')
      .notNullable()
      .references('id')
      .inTable('questions')
      .onDelete('CASCADE');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.unique(['category_id', 'question_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('category_questions');
};
