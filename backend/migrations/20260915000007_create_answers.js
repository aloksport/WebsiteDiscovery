exports.up = function (knex) {
  return knex.schema.createTable('answers', (table) => {
    table.increments('id').primary();
    table
      .integer('respondent_id')
      .notNullable()
      .references('id')
      .inTable('respondents')
      .onDelete('CASCADE');
    table
      .integer('question_id')
      .notNullable()
      .references('id')
      .inTable('questions')
      .onDelete('CASCADE');
    // JSON-encoded value: a string for text/textarea/radio/select/date,
    // an array of strings for checkbox
    table.text('value');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['respondent_id', 'question_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('answers');
};
