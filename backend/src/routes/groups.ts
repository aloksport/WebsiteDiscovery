import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function mapQuestion(row: any) {
  return {
    ...row,
    options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
  };
}

// GET /api/admin/groups
router.get('/', async (_req: Request, res: Response) => {
  const groups = await db('groups').select('*').orderBy('name');
  res.json(groups);
});

// GET /api/admin/groups/:id
router.get('/:id', async (req: Request, res: Response) => {
  const g = await db('groups').where({ id: req.params.id }).first();
  if (!g) return res.status(404).json({ error: 'Group not found' });
  res.json(g);
});

// POST /api/admin/groups
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Group name is required' });

  const dupName = await db('groups').whereRaw('lower(name) = ?', [String(name).trim().toLowerCase()]).first();
  if (dupName) return res.status(409).json({ error: 'A group with this name already exists' });

  const [row] = await db('groups').insert({ name: String(name).trim() }).returning('*');
  res.status(201).json(row);
});

// PUT /api/admin/groups/:id
// Editing never modifies a group: every save creates a new group and the
// original (with its question and category assignments) is left untouched.
router.put('/:id', async (req: Request, res: Response) => {
  const existing = await db('groups').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Group not found' });

  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Group name is required' });

  const dupName = await db('groups').whereRaw('lower(name) = ?', [String(name).trim().toLowerCase()]).first();
  if (dupName) return res.status(409).json({ error: 'A group with this name already exists' });

  const [row] = await db('groups').insert({ name: String(name).trim() }).returning('*');
  res.status(201).json({ ...row, created: true });
});

// DELETE /api/admin/groups/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await db('groups').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Group not found' });
  await db('groups').where({ id: req.params.id }).delete();
  res.status(204).send();
});

// GET /api/admin/groups/:id/questions - questions currently assigned, in order
router.get('/:id/questions', async (req: Request, res: Response) => {
  const g = await db('groups').where({ id: req.params.id }).first();
  if (!g) return res.status(404).json({ error: 'Group not found' });

  const rows = await db('group_questions as gq')
    .join('questions as q', 'q.id', 'gq.question_id')
    .where('gq.group_id', req.params.id)
    .orderBy('gq.sort_order')
    .select('q.*', 'gq.sort_order');
  res.json(rows.map(mapQuestion));
});

// PUT /api/admin/groups/:id/questions  body: { questionIds: number[] } in display order
// Each question can only appear once in a group (enforced by a unique
// constraint on group_id+question_id at the database level too).
router.put('/:id/questions', async (req: Request, res: Response) => {
  const g = await db('groups').where({ id: req.params.id }).first();
  if (!g) return res.status(404).json({ error: 'Group not found' });

  const { questionIds } = req.body;
  if (!Array.isArray(questionIds)) return res.status(400).json({ error: 'questionIds must be an array' });

  const uniqueIds = Array.from(new Set(questionIds));

  await db.transaction(async (trx) => {
    await trx('group_questions').where({ group_id: req.params.id }).delete();
    for (let i = 0; i < uniqueIds.length; i++) {
      await trx('group_questions').insert({ group_id: req.params.id, question_id: uniqueIds[i], sort_order: i });
    }
  });
  res.status(204).send();
});

export default router;
