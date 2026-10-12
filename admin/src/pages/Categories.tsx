import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, Category } from '../api';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

const emptyForm = { id: 0, name: '' };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const editing = form.id !== 0;
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(
    categories,
    (c) => [c.name, c.slug]
  );

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .listCategories()
      .then(setCategories)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load categories'))
      .finally(() => setLoading(false));
  }

  function startEdit(c: Category) {
    setForm({ id: c.id, name: c.name });
    setError('');
    setSuccess('');
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(c: Category) {
    if (!window.confirm(`Delete the category "${c.name}"? This also removes it from any clients it is assigned to.`)) return;
    try {
      await api.deleteCategory(c.id);
      setSuccess('Category deleted.');
      if (form.id === c.id) resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete category');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await api.updateCategory(form.id, { name: form.name });
        setSuccess('Saved as a new category. The original category is unchanged.');
      } else {
        await api.createCategory({ name: form.name });
        setSuccess('Category added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save category');
    }
  }

  return (
    <div>
      <h1>Categories</h1>
      <p className="page-subtitle">
        Build a category out of one or more question groups. Each category name must be unique and generates a
        URL-safe slug (no spaces).
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>{editing ? 'Edit category' : 'Add a category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full">
              <label>Category name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Website Client Discovery"
                required
              />
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save as new category' : 'Add category'}
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
            All categories ({query ? `${filtered.length} of ${categories.length}` : categories.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search categories…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : categories.length === 0 ? (
          <p className="empty-state">No categories yet. Add your first category above.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No categories match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <span className="url-preview">{c.slug}</span>
                    </td>
                    <td className="actions-cell">
                      <Link className="btn btn-small" to={`/categories/${c.id}/assign`}>
                        Assign groups
                      </Link>
                      <button className="btn btn-small" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(c)}>
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
