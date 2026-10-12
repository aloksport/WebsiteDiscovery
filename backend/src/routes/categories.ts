import { Router, Request, Response } from 'express';
import db from '../db';
import { slugify } from '../utils/slugify';

const router = Router();

// GET /api/admin/categories
router.get('/', async (_req: Request, res: Response) => {
  const categories = await db('categories').select('*').orderBy('name');
  res.json(categories);
});

// GET /api/admin/categories/:id
router.get('/:id', async (req: Request, res: Response) => {
  const cat = await db('categories').where({ id: req.params.id }).first();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
});

// POST /api/admin/categories
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Category name is required' });
  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'Category name must contain letters or numbers' });

  const dupName = await db('categories').whereRaw('lower(name) = ?', [String(name).trim().toLowerCase()]).first();
  if (dupName) return res.status(409).json({ error: 'A category with this name already exists' });
  const dupSlug = await db('categories').where({ slug }).first();
  if (dupSlug) {
    return res.status(409).json({ error: 'A category producing the same URL already exists, please choose a different name' });
  }

  const [row] = await db('categories').insert({ name: String(name).trim(), slug }).returning('*');
  res.status(201).json(row);
});

// PUT /api/admin/categories/:id
// Editing never modifies a category: every save creates a new category and
// the original (with its group and client assignments) is left untouched.
router.put('/:id', async (req: Request, res: Response) => {
  const existing = await db('categories').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Category name is required' });
  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'Category name must contain letters or numbers' });

  const dupName = await db('categories').whereRaw('lower(name) = ?', [String(name).trim().toLowerCase()]).first();
  if (dupName) return res.status(409).json({ error: 'A category with this name already exists' });
  const dupSlug = await db('categories').where({ slug }).first();
  if (dupSlug) {
    return res.status(409).json({ error: 'A category producing the same URL already exists, please choose a different name' });
  }

  const [row] = await db('categories').insert({ name: String(name).trim(), slug }).returning('*');
  res.status(201).json({ ...row, created: true });
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await db('categories').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  await db('categories').where({ id: req.params.id }).delete();
  res.status(204).send();
});

// GET /api/admin/categories/:id/groups - groups currently assigned, in order
router.get('/:id/groups', async (req: Request, res: Response) => {
  const cat = await db('categories').where({ id: req.params.id }).first();
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const rows = await db('category_groups as cg')
    .join('groups as g', 'g.id', 'cg.group_id')
    .where('cg.category_id', req.params.id)
    .orderBy('cg.sort_order')
    .select('g.*', 'cg.sort_order');
  res.json(rows);
});

// PUT /api/admin/categories/:id/groups  body: { groupIds: number[] } in display order
router.put('/:id/groups', async (req: Request, res: Response) => {
  const cat = await db('categories').where({ id: req.params.id }).first();
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const { groupIds } = req.body;
  if (!Array.isArray(groupIds)) return res.status(400).json({ error: 'groupIds must be an array' });

  const uniqueIds = Array.from(new Set(groupIds));

  await db.transaction(async (trx) => {
    await trx('category_groups').where({ category_id: req.params.id }).delete();
    for (let i = 0; i < uniqueIds.length; i++) {
      await trx('category_groups').insert({
        category_id: req.params.id,
        group_id: uniqueIds[i],
        sort_order: i,
      });
    }
  });
  res.status(204).send();
});

export default router;
