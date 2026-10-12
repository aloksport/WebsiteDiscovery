import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/admin/dashboard/stats
router.get('/stats', async (_req: Request, res: Response) => {
  const [{ count: answersReceived }] = await db('respondents').where({ status: 'submitted' }).count({ count: '*' });
  const [{ count: questionsCount }] = await db('questions').count({ count: '*' });
  const [{ count: companiesCount }] = await db('clients').count({ count: '*' });

  res.json({
    answersReceived: Number(answersReceived),
    questionsCount: Number(questionsCount),
    companiesCount: Number(companiesCount),
  });
});

export default router;
