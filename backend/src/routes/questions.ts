import { Router, Request, Response } from 'express';
import db from '../db';
import { VALID_QUESTION_TYPES, OPTION_BASED_TYPES } from '../types';

const router = Router();

function mapQuestion(row: any) {
  if (!row) return row;
  return {
    ...row,
    options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
  };
}

function validateQuestionBody(body: any): string | null {
  const { text, type, options } = body;
  if (!text || !String(text).trim()) return 'Question text is required';
  if (!VALID_QUESTION_TYPES.includes(type)) {
    return `type must be one of ${VALID_QUESTION_TYPES.join(', ')}`;
  }
  if (OPTION_BASED_TYPES.includes(type)) {
    const cleaned = Array.isArray(options) ? options.map((o: string) => String(o).trim()).filter(Boolean) : [];
    if (cleaned.length === 0) {
      return `${type} questions require at least one option`;
    }
  }
  return null;
}

function cleanOptions(type: any, options: any): string | null {
  return OPTION_BASED_TYPES.includes(type)
    ? JSON.stringify((options as string[]).map((o) => String(o).trim()).filter(Boolean))
    : null;
}

// A question is identified by its text together with its answer input type:
// the same text with a different type is treated as a different question.
async function findDuplicate(text: string, type: string) {
  return db('questions')
    .whereRaw('LOWER(TRIM(text)) = LOWER(?)', [text])
    .andWhere({ type })
    .first();
}

const DUPLICATE_ERROR = 'A question with the same text and answer input type already exists';

// GET /api/admin/questions
router.get('/', async (_req: Request, res: Response) => {
  const questions = await db('questions').select('*').orderBy('id', 'desc');
  res.json(questions.map(mapQuestion));
});

// GET /api/admin/questions/:id
router.get('/:id', async (req: Request, res: Response) => {
  const q = await db('questions').where({ id: req.params.id }).first();
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json(mapQuestion(q));
});

// POST /api/admin/questions
router.post('/', async (req: Request, res: Response) => {
  const error = validateQuestionBody(req.body);
  if (error) return res.status(400).json({ error });

  const { text, type, options, required } = req.body;
  const trimmed = String(text).trim();
  if (await findDuplicate(trimmed, type)) return res.status(409).json({ error: DUPLICATE_ERROR });

  const [row] = await db('questions')
    .insert({ text: trimmed, type, options: cleanOptions(type, options), required: !!required })
    .returning('*');
  res.status(201).json(mapQuestion(row));
});

// PUT /api/admin/questions/:id
// Editing never modifies a question: every save creates a new question and
// the original (with its answers and group assignments) is left untouched.
// Only rejected when an identical question (same text, type, options and
// required flag) already exists, i.e. nothing was actually changed.
router.put('/:id', async (req: Request, res: Response) => {
  const existing = await db('questions').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  const error = validateQuestionBody(req.body);
  if (error) return res.status(400).json({ error });

  const { text, type, options, required } = req.body;
  const trimmed = String(text).trim();
  const cleaned = cleanOptions(type, options);

  const identical = db('questions')
    .whereRaw('LOWER(TRIM(text)) = LOWER(?)', [trimmed])
    .andWhere({ type, required: !!required });
  if (cleaned === null) identical.whereNull('options');
  else identical.whereRaw('options = ?::jsonb', [cleaned]);
  if (await identical.first()) {
    return res.status(409).json({ error: 'An identical question already exists - change something before saving' });
  }

  const [row] = await db('questions')
    .insert({ text: trimmed, type, options: cleaned, required: !!required })
    .returning('*');
  res.status(201).json({ ...mapQuestion(row), created: true });
});

// DELETE /api/admin/questions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await db('questions').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  await db('questions').where({ id: req.params.id }).delete();
  res.status(204).send();
});

export default router;
