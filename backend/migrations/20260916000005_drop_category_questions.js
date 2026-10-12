// Questions are no longer assigned to categories directly - they're
// assigned to a Group (group_questions), and a category is now built from
// Groups (category_groups) instead.
exports.up = function (knex) {
  return knex.schema.dropTableIfExists('category_questions');
};

exports.down = function (knex) {
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
