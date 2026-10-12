exports.up = function (knex) {
  return knex.schema.createTable('respondents', (table) => {
    table.increments('id').primary();
    table
      .integer('client_id')
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    table.string('email', 255).notNullable();
    // draft: auto-saved because the visitor left before pressing Save
    // submitted: the visitor explicitly pressed Save
    table.string('status', 20).notNullable().defaultTo('draft');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['client_id', 'email']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('respondents');
};
