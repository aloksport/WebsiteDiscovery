import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Question, QuestionType } from '../api';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Text box',
  textarea: 'Text area',
  checkbox: 'Checkbox (multi-select)',
  radio: 'Radio button (single choice)',
  date: 'Date picker',
  select: 'Select box (dropdown)',
};

const OPTION_TYPES: QuestionType[] = ['checkbox', 'radio', 'select'];

const emptyForm = { id: 0, text: '', type: 'text' as QuestionType, options: [''] as string[], required: false };

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const editing = form.id !== 0;
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(
    questions,
    (q) => [q.text, TYPE_LABELS[q.type], ...(q.options || [])]
  );

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .listQuestions()
      .then(setQuestions)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load questions'))
      .finally(() => setLoading(false));
  }

  function startEdit(q: Question) {
    setForm({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options && q.options.length ? q.options : [''],
      required: q.required,
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(q: Question) {
    if (!window.confirm(`Delete the question "${q.text}"? This also removes it from any categories and any answers already collected for it.`)) return;
    try {
      await api.deleteQuestion(q.id);
      setSuccess('Question deleted.');
      if (form.id === q.id) resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete question');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const payload = {
      text: form.text,
      type: form.type,
      options: OPTION_TYPES.includes(form.type) ? form.options.filter((o) => o.trim()) : undefined,
      required: form.required,
    };
    try {
      if (editing) {
        await api.updateQuestion(form.id, payload);
        setSuccess('Saved as a new question. The original question is unchanged.');
      } else {
        await api.createQuestion(payload);
        setSuccess('Question added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save question');
    }
  }

  function updateOption(idx: number, value: string) {
    const next = form.options.slice();
    next[idx] = value;
    setForm({ ...form, options: next });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, ''] });
  }

  function removeOption(idx: number) {
    const next = form.options.filter((_, i) => i !== idx);
    setForm({ ...form, options: next.length ? next : [''] });
  }

  return (
    <div>
      <h1>Questions</h1>
      <p className="page-subtitle">Create the questions that can be assigned to categories.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>{editing ? 'Edit question' : 'Add a question'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full">
              <label>Question</label>
              <textarea
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="e.g. What is your company name?"
                required
              />
            </div>

            <div className="form-field">
              <label>Answer input type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {editing && (
                <small className="field-hint">
                  Saving an edit creates a new question; the original stays as it is.
                </small>
              )}
            </div>

            <div className="form-field">
              <label>&nbsp;</label>
              <span className="checkbox-field">
                <input
                  type="checkbox"
                  id="required"
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                />
                <label htmlFor="required">This question is required</label>
              </span>
            </div>

            {OPTION_TYPES.includes(form.type) && (
              <div className="form-field full">
                <label>Options</label>
                <div className="option-editor">
                  {form.options.map((opt, idx) => (
                    <div className="option-editor-row" key={idx}>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button type="button" className="btn btn-small" onClick={() => removeOption(idx)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <div>
                    <button type="button" className="btn btn-small" onClick={addOption}>
                      + Add option
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save as new question' : 'Add question'}
            </button>
            {editing && (
              <button type="button" className="btn" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="list-header">
          <h2>
            All questions ({query ? `${filtered.length} of ${questions.length}` : questions.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search questions…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : questions.length === 0 ? (
          <p className="empty-state">No questions yet. Add your first question above.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No questions match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((q) => (
                  <tr key={q.id}>
                    <td>{q.text}</td>
                    <td>{TYPE_LABELS[q.type]}</td>
                    <td>{q.required ? 'Yes' : 'No'}</td>
                    <td className="actions-cell">
                      <button className="btn btn-small" onClick={() => startEdit(q)}>
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(q)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
