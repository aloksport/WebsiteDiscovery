import db from '../db';
import { QuestionType } from '../types';

export interface OrderedQuestion {
  id: number;
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
}

/**
 * The full, ordered, deduplicated list of questions a client's questionnaire
 * shows: every question in every group assigned to every category assigned
 * to this client.
 *
 * Ordering flows through the whole chain the admin panel builds:
 *   client's category order (client_categories.sort_order)
 *   -> that category's group order (category_groups.sort_order)
 *   -> that group's question order (group_questions.sort_order)
 *
 * If the same question is reachable more than once (e.g. the same group is
 * assigned to two categories both given to this client), it appears once,
 * at its earliest position.
 */
export async function getOrderedClientQuestions(clientId: number): Promise<OrderedQuestion[]> {
  const rows = await db('client_categories as cc')
    .join('category_groups as cg', 'cg.category_id', 'cc.category_id')
    .join('group_questions as gq', 'gq.group_id', 'cg.group_id')
    .join('questions as q', 'q.id', 'gq.question_id')
    .where('cc.client_id', clientId)
    .select(
      'q.id',
      'q.text',
      'q.type',
      'q.options',
      'q.required',
      db.raw('min(cc.sort_order * 1000000 + cg.sort_order * 1000 + gq.sort_order) as rank')
    )
    .groupBy('q.id', 'q.text', 'q.type', 'q.options', 'q.required')
    .orderBy('rank');

  return rows.map((r: any) => ({
    id: r.id,
    text: r.text,
    type: r.type,
    required: r.required,
    options: r.options ? (typeof r.options === 'string' ? JSON.parse(r.options) : r.options) : null,
  }));
}
