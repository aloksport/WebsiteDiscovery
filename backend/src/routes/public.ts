import { Router, Request, Response } from 'express';
import db from '../db';
import { getOrderedClientQuestions } from '../utils/questionnaire';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/public/client/:slug - the questionnaire (client info + merged question list)
router.get('/client/:slug', async (req: Request, res: Response) => {
  const client = await db('clients').where({ slug: req.params.slug }).first();
  if (!client) return res.status(404).json({ error: 'This questionnaire link is not valid' });

  const questions = await getOrderedClientQuestions(client.id);

  res.json({ client: { name: client.name, companyName: client.company_name }, questions });
});

// GET /api/public/client/:slug/respondent?email=  - fetch previously saved answers for this email
router.get('/client/:slug/respondent', async (req: Request, res: Response) => {
  const client = await db('clients').where({ slug: req.params.slug }).first();
  if (!client) return res.status(404).json({ error: 'This questionnaire link is not valid' });

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });

  // An open draft is what gets restored into the form; otherwise just report
  // the most recent submission (its answers are never re-filled).
  const draft = await db('respondents')
    .where({ client_id: client.id, email, status: 'draft' })
    .orderBy('updated_at', 'desc')
    .first();
  if (!draft) {
    const lastSubmitted = await db('respondents')
      .where({ client_id: client.id, email, status: 'submitted' })
      .orderBy('updated_at', 'desc')
      .first();
    if (!lastSubmitted) return res.json({ status: null, answers: {} });
    return res.json({ status: 'submitted', updatedAt: lastSubmitted.updated_at, answers: {} });
  }
  const respondent = draft;

  const answers = await db('answers').where({ respondent_id: respondent.id }).select('question_id', 'value');
  const answerMap: Record<string, any> = {};
  for (const a of answers) {
    try {
      answerMap[a.question_id] = JSON.parse(a.value);
    } catch {
      answerMap[a.question_id] = a.value;
    }
  }
  res.json({ status: respondent.status, updatedAt: respondent.updated_at, answers: answerMap });
});

// POST /api/public/client/:slug/save  body: { email, answers: {questionId: value}, submit: boolean }
// Called both by the explicit "Save" button (submit: true) and automatically
// when the visitor leaves the page without saving (submit: false, via sendBeacon).
// A submitted response is never changed afterwards: saves go into this email's
// open draft (created if there isn't one), and submitting turns that draft into
// a submitted response, so the same email can submit any number of times.
router.post('/client/:slug/save', async (req: Request, res: Response) => {
  const client = await db('clients').where({ slug: req.params.slug }).first();
  if (!client) return res.status(404).json({ error: 'This questionnaire link is not valid' });

  const email = String(req.body.email || '').trim().toLowerCase();
  const answers = req.body.answers || {};
  const submit = !!req.body.submit;

  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });

  await db.transaction(async (trx) => {
    let respondent = await trx('respondents')
      .where({ client_id: client.id, email, status: 'draft' })
      .orderBy('updated_at', 'desc')
      .forUpdate()
      .first();

    if (!respondent) {
      [respondent] = await trx('respondents')
        .insert({ client_id: client.id, email, status: submit ? 'submitted' : 'draft' })
        .returning('*');
    } else {
      await trx('respondents')
        .where({ id: respondent.id })
        .update({ status: submit ? 'submitted' : 'draft', updated_at: trx.fn.now() });
    }

    for (const [questionIdRaw, value] of Object.entries(answers)) {
      const questionId = Number(questionIdRaw);
      if (!Number.isInteger(questionId)) continue;

      const serialized = JSON.stringify(value);
      const existingAnswer = await trx('answers')
        .where({ respondent_id: respondent.id, question_id: questionId })
        .first();
      if (existingAnswer) {
        await trx('answers').where({ id: existingAnswer.id }).update({ value: serialized, updated_at: trx.fn.now() });
      } else {
        await trx('answers').insert({ respondent_id: respondent.id, question_id: questionId, value: serialized });
      }
    }
  });

  res.json({ ok: true });
});

export default router;
