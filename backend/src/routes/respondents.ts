import { Router, Request, Response } from 'express';
import db from '../db';
import { getOrderedClientQuestions } from '../utils/questionnaire';

const router = Router();

function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

// GET /api/admin/respondents?clientId=  - "see all answers as per user" list view
router.get('/', async (req: Request, res: Response) => {
  const { clientId } = req.query;
  let query = db('respondents as r')
    .join('clients as c', 'c.id', 'r.client_id')
    .select(
      'r.id',
      'r.email',
      'r.status',
      'r.updated_at',
      'r.created_at',
      'c.id as client_id',
      'c.name as client_name',
      'c.company_name',
      'c.slug as client_slug'
    )
    .orderBy('r.updated_at', 'desc');
  if (clientId) query = query.where('r.client_id', clientId as string);
  const rows = await query;
  res.json(rows);
});

// GET /api/admin/respondents/:id - full detail with every answer
router.get('/:id', async (req: Request, res: Response) => {
  const respondent = await db('respondents as r')
    .join('clients as c', 'c.id', 'r.client_id')
    .where('r.id', req.params.id)
    .select('r.*', 'c.name as client_name', 'c.company_name', 'c.slug as client_slug')
    .first();
  if (!respondent) return res.status(404).json({ error: 'Respondent not found' });

  const answers = await db('answers as a')
    .join('questions as q', 'q.id', 'a.question_id')
    .where('a.respondent_id', req.params.id)
    .select('q.id as question_id', 'q.text as question_text', 'q.type', 'a.value');

  // Order answers the same way the question was ordered on the questionnaire
  // itself (group order within the category, category order for the
  // client) rather than by insertion/id. A question that's since been
  // unassigned from the client's categories/groups sorts to the end.
  const orderedQuestions = await getOrderedClientQuestions(respondent.client_id);
  const orderIndex = new Map(orderedQuestions.map((q, idx) => [q.id, idx]));

  const sortedAnswers = answers
    .map((a: any) => ({ ...a, value: safeParse(a.value) }))
    .sort((a: any, b: any) => {
      const ai = orderIndex.has(a.question_id) ? (orderIndex.get(a.question_id) as number) : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b.question_id) ? (orderIndex.get(b.question_id) as number) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.question_id - b.question_id;
    });

  res.json({
    ...respondent,
    answers: sortedAnswers,
  });
});

export default router;
