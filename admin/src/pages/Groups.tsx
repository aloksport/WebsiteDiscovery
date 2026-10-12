import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, Group } from '../api';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

const emptyForm = { id: 0, name: '' };

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const editing = form.id !== 0;
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(groups, (g) => [
    g.name,
  ]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .listGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load groups'))
      .finally(() => setLoading(false));
  }

  function startEdit(g: Group) {
    setForm({ id: g.id, name: g.name });
    setError('');
    setSuccess('');
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(g: Group) {
    if (!window.confirm(`Delete the group "${g.name}"? This also removes it from any categories it is assigned to.`)) return;
    try {
      await api.deleteGroup(g.id);
      setSuccess('Group deleted.');
      if (form.id === g.id) resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete group');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await api.updateGroup(form.id, { name: form.name });
        setSuccess('Saved as a new group. The original group is unchanged.');
      } else {
        await api.createGroup({ name: form.name });
        setSuccess('Group added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save group');
    }
  }

  return (
    <div>
      <h1>Groups</h1>
      <p className="page-subtitle">
        Bundle related questions into a group (e.g. "Contact Details"), then assign that group to one or more
        categories. Each question can only appear once within a given group.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>{editing ? 'Edit group' : 'Add a group'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full">
              <label>Group name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Contact Details"
                required
              />
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save as new group' : 'Add group'}
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
            All groups ({query ? `${filtered.length} of ${groups.length}` : groups.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search groups…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : groups.length === 0 ? (
          <p className="empty-state">No groups yet. Add your first group above.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No groups match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td className="actions-cell">
                      <Link className="btn btn-small" to={`/groups/${g.id}/assign`}>
                        Assign questions
                      </Link>
                      <button className="btn btn-small" onClick={() => startEdit(g)}>
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(g)}>
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
