/**
 * Optional demo data so you can see the app working end to end right away.
 * Run with: npm run seed
 * Safe to run multiple times against a fresh database; it clears the demo
 * tables first. Do NOT run this against a database with real data you want
 * to keep, since it wipes every table.
 */
exports.seed = async function (knex) {
  await knex('answers').del();
  await knex('respondents').del();
  await knex('client_categories').del();
  await knex('clients').del();
  await knex('category_groups').del();
  await knex('categories').del();
  await knex('group_questions').del();
  await knex('groups').del();
  await knex('questions').del();

  const [q1] = await knex('questions')
    .insert({ text: 'What is your company name?', type: 'text', required: true })
    .returning('*');
  const [q2] = await knex('questions')
    .insert({ text: 'What is the best email to reach you at?', type: 'text', required: false })
    .returning('*');
  const [q3] = await knex('questions')
    .insert({ text: 'Describe your project in a few sentences', type: 'textarea', required: true })
    .returning('*');
  const [q4] = await knex('questions')
    .insert({
      text: 'Which services are you interested in?',
      type: 'checkbox',
      options: JSON.stringify(['Web design', 'Branding', 'App development', 'Marketing']),
      required: false,
    })
    .returning('*');
  const [q5] = await knex('questions')
    .insert({
      text: 'What is your budget range?',
      type: 'radio',
      options: JSON.stringify(['Under $5,000', '$5,000 - $20,000', '$20,000+']),
      required: true,
    })
    .returning('*');
  const [q6] = await knex('questions')
    .insert({ text: 'Preferred project start date', type: 'date', required: false })
    .returning('*');
  const [q7] = await knex('questions')
    .insert({
      text: 'How did you hear about us?',
      type: 'select',
      options: JSON.stringify(['Referral', 'Search engine', 'Social media', 'Other']),
      required: false,
    })
    .returning('*');

  // Groups bundle related questions together, so the same bundle can be
  // reused across multiple categories.
  const [contactGroup] = await knex('groups').insert({ name: 'Contact Details' }).returning('*');
  const [projectGroup] = await knex('groups').insert({ name: 'Project Scope' }).returning('*');

  await knex('group_questions').insert([
    { group_id: contactGroup.id, question_id: q1.id, sort_order: 0 },
    { group_id: contactGroup.id, question_id: q2.id, sort_order: 1 },
    { group_id: projectGroup.id, question_id: q3.id, sort_order: 0 },
    { group_id: projectGroup.id, question_id: q4.id, sort_order: 1 },
    { group_id: projectGroup.id, question_id: q5.id, sort_order: 2 },
    { group_id: projectGroup.id, question_id: q6.id, sort_order: 3 },
    { group_id: projectGroup.id, question_id: q7.id, sort_order: 4 },
  ]);

  // A category is built from one or more groups.
  const [category] = await knex('categories')
    .insert({ name: 'Website Discovery', slug: 'website-discovery' })
    .returning('*');

  await knex('category_groups').insert([
    { category_id: category.id, group_id: contactGroup.id, sort_order: 0 },
    { category_id: category.id, group_id: projectGroup.id, sort_order: 1 },
  ]);

  const [client] = await knex('clients')
    .insert({
      name: 'Demo Client',
      email: 'demo-client@example.com',
      company_name: 'Abeo',
      phone: '555-0100',
      slug: 'abeo',
    })
    .returning('*');

  await knex('client_categories').insert({ client_id: client.id, category_id: category.id, sort_order: 0 });

  console.log('Demo data seeded. Try the public questionnaire at <BASE_PATH>/abeo (e.g. /websitediscovery/abeo)');
};
