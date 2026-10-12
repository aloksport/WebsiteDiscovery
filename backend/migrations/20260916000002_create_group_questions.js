exports.up = function (knex) {
  return knex.schema.createTable('group_questions', (table) => {
    table.increments('id').primary();
    table
      .integer('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
      .onDelete('CASCADE');
    table
      .integer('question_id')
      .notNullable()
      .references('id')
      .inTable('questions')
      .onDelete('CASCADE');
    table.integer('sort_order').notNullable().defaultTo(0);
    // A question can only appear once within a given group (its "unique
    // question" per group).
    table.unique(['group_id', 'question_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('group_questions');
};
