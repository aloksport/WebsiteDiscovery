// The same email can now submit a client's questionnaire as many times as
// it likes - every submission is its own respondents row - so the
// one-row-per-email constraint goes. An email still has at most one open
// draft at a time (enforced in routes/public.ts).
exports.up = function (knex) {
  return knex.schema.alterTable('respondents', (table) => {
    table.dropUnique(['client_id', 'email']);
    table.index(['client_id', 'email']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('respondents', (table) => {
    table.dropIndex(['client_id', 'email']);
    table.unique(['client_id', 'email']);
  });
};
