import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, AppUser, UserRole } from '../api';
import { useAuth } from '../context/AuthContext';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
};

const emptyForm = { id: 0, fullName: '', email: '', phone: '', password: '', role: 'user' as UserRole };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const editing = form.id !== 0;
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(users, (u) => [
    u.full_name,
    u.email,
    u.phone,
    ROLE_LABELS[u.role],
  ]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  function startEdit(u: AppUser) {
    setForm({ id: u.id, fullName: u.full_name, email: u.email, phone: u.phone || '', password: '', role: u.role });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(u: AppUser) {
    if (!window.confirm(`Delete the user "${u.full_name}"?`)) return;
    try {
      await api.deleteUser(u.id);
      setSuccess('User deleted.');
      if (form.id === u.id) resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete user');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if ((!editing || form.password) && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const payload = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (editing) {
        await api.updateUser(form.id, payload as any);
        setSuccess('User updated.');
      } else {
        await api.createUser(payload as any);
        setSuccess('User added.');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save user');
    }
  }

  return (
    <div>
      <h1>Users</h1>
      <p className="page-subtitle">
        Manage who can sign in to this admin panel. Only the <strong>Admin</strong> and <strong>Manager</strong> roles can log in
        &mdash; the <strong>User</strong> role is a record-only account with no admin-panel access.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>{editing ? 'Edit user' : 'Add a user'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="form-field full">
              <label>{editing ? 'New password (leave blank to keep current)' : 'Password'}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save changes' : 'Add user'}
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
            All users ({query ? `${filtered.length} of ${users.length}` : users.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search users…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : users.length === 0 ? (
          <p className="empty-state">No users yet.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No users match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Full name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <span className={`badge badge-role-${u.role}`}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td className="actions-cell">
                        <button className="btn btn-small" onClick={() => startEdit(u)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? "You can't delete your own account while logged in" : undefined}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
