import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, Client } from '../api';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

const emptyForm = { id: 0, name: '', email: '', companyName: '', phone: '' };
const BASE_PATH = (import.meta.env.VITE_BASE_PATH || '/websitediscovery').replace(/\/+$/, '');

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const editing = form.id !== 0;
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(clients, (c) => [
    c.name,
    c.email,
    c.company_name,
    c.phone,
    c.slug,
  ]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .listClients()
      .then(setClients)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load clients'))
      .finally(() => setLoading(false));
  }

  function startEdit(c: Client) {
    setForm({ id: c.id, name: c.name, email: c.email, companyName: c.company_name, phone: c.phone || '' });
    setError('');
    setSuccess('');
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(c: Client) {
    if (!window.confirm(`Delete the client "${c.name}"? This also removes their category assignment and their questionnaire URL will stop working.`)) return;
    try {
      await api.deleteClient(c.id);
      setSuccess('Client deleted.');
      if (form.id === c.id) resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete client');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const payload = { name: form.name, email: form.email, companyName: form.companyName, phone: form.phone || undefined };
    try {
      if (editing) {
        await api.updateClient(form.id, payload);
        setSuccess('Client updated.');
      } else {
        await api.createClient(payload);
        setSuccess('Client added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save client');
    }
  }

  return (
    <div>
      <h1>Clients</h1>
      <p className="page-subtitle">
        Each client's company name generates a URL-safe slug (no spaces) used for their questionnaire link.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>{editing ? 'Edit client' : 'Add a client'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Client name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Email (mandatory)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Company name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g. Abeo"
                required
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save changes' : 'Add client'}
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
            All clients ({query ? `${filtered.length} of ${clients.length}` : clients.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search clients…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : clients.length === 0 ? (
          <p className="empty-state">No clients yet. Add your first client above.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No clients match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Questionnaire URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.company_name}</td>
                    <td>{c.phone || '—'}</td>
                    <td>
                      <span className="url-preview">
                        {BASE_PATH}/{c.slug}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <Link className="btn btn-small" to={`/clients/${c.id}/assign`}>
                        Assign categories
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
