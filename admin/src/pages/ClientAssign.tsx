import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, Category, Client } from '../api';

const BASE_PATH = (import.meta.env.VITE_BASE_PATH || '/websitediscovery').replace(/\/+$/, '');

export default function ClientAssign() {
  const { id } = useParams();
  const clientId = Number(id);

  const [client, setClient] = useState<Client | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listClients(), api.listCategories(), api.getClientCategories(clientId)])
      .then(([clients, categories, assigned]) => {
        setClient(clients.find((c) => c.id === clientId) || null);
        setAllCategories(categories);
        setAssignedIds(assigned.map((c) => c.id));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [clientId]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const assignedCategories = assignedIds.map((cid) => categoryById.get(cid)).filter(Boolean) as Category[];
  const availableCategories = allCategories.filter((c) => !assignedIds.includes(c.id));

  function add(cid: number) {
    setAssignedIds([...assignedIds, cid]);
  }

  function remove(cid: number) {
    setAssignedIds(assignedIds.filter((id) => id !== cid));
  }

  function move(cid: number, direction: -1 | 1) {
    const idx = assignedIds.indexOf(cid);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= assignedIds.length) return;
    const next = assignedIds.slice();
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setAssignedIds(next);
  }

  async function handleSave() {
    setError('');
    setSuccess('');
    try {
      await api.setClientCategories(clientId, assignedIds);
      setSuccess('Assigned categories saved.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save assignment');
    }
  }

  if (loading) return <p className="empty-state">Loading&hellip;</p>;
  if (!client) return <p className="empty-state">Client not found.</p>;

  return (
    <div>
      <h1>Assign categories</h1>
      <p className="page-subtitle">
        Client: <strong>{client.name}</strong> &mdash; {client.company_name}
      </p>
      <p>
        Questionnaire URL: <span className="url-preview">{BASE_PATH}/{client.slug}</span>
      </p>
      <p>
        <Link className="link-button" to="/clients">
          &larr; Back to clients
        </Link>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="form-grid">
        <div className="card">
          <h2>Assigned to this client ({assignedCategories.length})</h2>
          <p className="page-subtitle">Order here controls the order categories (and their questions) appear in on the questionnaire.</p>
          {assignedCategories.length === 0 ? (
            <p className="empty-state">No categories assigned yet. Add some from the list on the right.</p>
          ) : (
            <div className="assign-list">
              {assignedCategories.map((c, idx) => (
                <div className="assign-row" key={c.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">
                      {idx + 1}. {c.name}
                    </div>
                    <div className="assign-row-meta">{c.slug}</div>
                  </div>
                  <button className="btn btn-small" onClick={() => move(c.id, -1)} disabled={idx === 0}>
                    &uarr;
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => move(c.id, 1)}
                    disabled={idx === assignedCategories.length - 1}
                  >
                    &darr;
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => remove(c.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleSave}>
              Save assignment
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Available categories ({availableCategories.length})</h2>
          {availableCategories.length === 0 ? (
            <p className="empty-state">
              {allCategories.length === 0 ? (
                <>
                  No categories exist yet. <Link to="/categories">Create some first</Link>.
                </>
              ) : (
                'All categories are already assigned to this client.'
              )}
            </p>
          ) : (
            <div className="assign-list">
              {availableCategories.map((c) => (
                <div className="assign-row" key={c.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">{c.name}</div>
                    <div className="assign-row-meta">{c.slug}</div>
                  </div>
                  <button className="btn btn-small" onClick={() => add(c.id)}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
