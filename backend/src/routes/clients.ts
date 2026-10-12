import { Router, Request, Response } from 'express';
import db from '../db';
import { slugify } from '../utils/slugify';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "admin" is where the admin panel itself lives (BASE_PATH/admin) and
// "questionnaire-assets" serves the public page's CSS/JS, so no client's
// company-name slug is allowed to collide with them.
const RESERVED_SLUGS = ['admin', 'questionnaire-assets'];

function validateClientBody(body: any): string | null {
  const { name, email, companyName } = body;
  if (!name || !String(name).trim()) return 'Client name is required';
  if (!email || !EMAIL_RE.test(String(email).trim())) return 'A valid email is required';
  if (!companyName || !String(companyName).trim()) return 'Company name is required';
  return null;
}

// GET /api/admin/clients
router.get('/', async (_req: Request, res: Response) => {
  const clients = await db('clients').select('*').orderBy('name');
  res.json(clients);
});

// GET /api/admin/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  const c = await db('clients').where({ id: req.params.id }).first();
  if (!c) return res.status(404).json({ error: 'Client not found' });
  res.json(c);
});

// POST /api/admin/clients
router.post('/', async (req: Request, res: Response) => {
  const error = validateClientBody(req.body);
  if (error) return res.status(400).json({ error });

  const { name, email, companyName, phone } = req.body;
  const slug = slugify(companyName);
  if (!slug) return res.status(400).json({ error: 'Company name must contain letters or numbers' });
  if (RESERVED_SLUGS.includes(slug)) {
    return res.status(400).json({ error: `Company name can't produce the URL "${slug}" - it's reserved. Please choose another.` });
  }

  const dupEmail = await db('clients').whereRaw('lower(email) = ?', [String(email).trim().toLowerCase()]).first();
  if (dupEmail) return res.status(409).json({ error: 'A client with this email already exists' });
  const dupSlug = await db('clients').where({ slug }).first();
  if (dupSlug) {
    return res.status(409).json({ error: 'A client producing the same URL already exists, please choose a different company name' });
  }

  const [row] = await db('clients')
    .insert({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      company_name: String(companyName).trim(),
      phone: phone ? String(phone).trim() : null,
      slug,
    })
    .returning('*');
  res.status(201).json(row);
});

// PUT /api/admin/clients/:id
router.put('/:id', async (req: Request, res: Response) => {
  const existing = await db('clients').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const error = validateClientBody(req.body);
  if (error) return res.status(400).json({ error });

  const { name, email, companyName, phone } = req.body;
  const slug = slugify(companyName);
  if (!slug) return res.status(400).json({ error: 'Company name must contain letters or numbers' });
  if (RESERVED_SLUGS.includes(slug)) {
    return res.status(400).json({ error: `Company name can't produce the URL "${slug}" - it's reserved. Please choose another.` });
  }

  const dupEmail = await db('clients')
    .whereRaw('lower(email) = ?', [String(email).trim().toLowerCase()])
    .whereNot({ id: req.params.id })
    .first();
  if (dupEmail) return res.status(409).json({ error: 'A client with this email already exists' });
  const dupSlug = await db('clients').where({ slug }).whereNot({ id: req.params.id }).first();
  if (dupSlug) {
    return res.status(409).json({ error: 'A client producing the same URL already exists, please choose a different company name' });
  }

  const [row] = await db('clients')
    .where({ id: req.params.id })
    .update({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      company_name: String(companyName).trim(),
      phone: phone ? String(phone).trim() : null,
      slug,
      updated_at: db.fn.now(),
    })
    .returning('*');
  res.json(row);
});

// DELETE /api/admin/clients/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await db('clients').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  await db('clients').where({ id: req.params.id }).delete();
  res.status(204).send();
});

// GET /api/admin/clients/:id/categories - categories currently assigned to
// this client, in the order they'll appear on the client's questionnaire
router.get('/:id/categories', async (req: Request, res: Response) => {
  const c = await db('clients').where({ id: req.params.id }).first();
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const rows = await db('client_categories as cc')
    .join('categories as cat', 'cat.id', 'cc.category_id')
    .where('cc.client_id', req.params.id)
    .orderBy('cc.sort_order')
    .select('cat.*', 'cc.sort_order');
  res.json(rows);
});

// PUT /api/admin/clients/:id/categories  body: { categoryIds: number[] } in display order
router.put('/:id/categories', async (req: Request, res: Response) => {
  const c = await db('clients').where({ id: req.params.id }).first();
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const { categoryIds } = req.body;
  if (!Array.isArray(categoryIds)) return res.status(400).json({ error: 'categoryIds must be an array' });

  await db.transaction(async (trx) => {
    await trx('client_categories').where({ client_id: req.params.id }).delete();
    for (let i = 0; i < categoryIds.length; i++) {
      await trx('client_categories').insert({ client_id: req.params.id, category_id: categoryIds[i], sort_order: i });
    }
  });
  res.status(204).send();
});

export default router;
