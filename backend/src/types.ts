export type QuestionType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'select';

export const VALID_QUESTION_TYPES: QuestionType[] = [
  'text',
  'textarea',
  'checkbox',
  'radio',
  'date',
  'select',
];

export const OPTION_BASED_TYPES: QuestionType[] = ['checkbox', 'radio', 'select'];

export interface QuestionRow {
  id: number;
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: number;
  name: string;
  email: string;
  company_name: string;
  phone: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}
