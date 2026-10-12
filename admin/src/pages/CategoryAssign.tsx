import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, Category, Group } from '../api';

export default function CategoryAssign() {
  const { id } = useParams();
  const categoryId = Number(id);

  const [category, setCategory] = useState<Category | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listCategories(), api.listGroups(), api.getCategoryGroups(categoryId)])
      .then(([categories, groups, assigned]) => {
        setCategory(categories.find((c) => c.id === categoryId) || null);
        setAllGroups(groups);
        setAssignedIds(assigned.map((g) => g.id));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const assignedGroups = assignedIds.map((gid) => groupById.get(gid)).filter(Boolean) as Group[];
  const availableGroups = allGroups.filter((g) => !assignedIds.includes(g.id));

  function add(gid: number) {
    setAssignedIds([...assignedIds, gid]);
  }

  function remove(gid: number) {
    setAssignedIds(assignedIds.filter((id) => id !== gid));
  }

  function move(gid: number, direction: -1 | 1) {
    const idx = assignedIds.indexOf(gid);
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
      await api.setCategoryGroups(categoryId, assignedIds);
      setSuccess('Assigned groups saved.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save assignment');
    }
  }

  if (loading) return <p className="empty-state">Loading&hellip;</p>;
  if (!category) return <p className="empty-state">Category not found.</p>;

  return (
    <div>
      <h1>Assign groups</h1>
      <p className="page-subtitle">
        Category: <strong>{category.name}</strong> (<span className="url-preview">{category.slug}</span>)
      </p>
      <p>
        <Link className="link-button" to="/categories">
          &larr; Back to categories
        </Link>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="form-grid">
        <div className="card">
          <h2>Assigned to this category ({assignedGroups.length})</h2>
          {assignedGroups.length === 0 ? (
            <p className="empty-state">No groups assigned yet. Add some from the list on the right.</p>
          ) : (
            <div className="assign-list">
              {assignedGroups.map((g, idx) => (
                <div className="assign-row" key={g.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">
                      {idx + 1}. {g.name}
                    </div>
                  </div>
                  <button className="btn btn-small" onClick={() => move(g.id, -1)} disabled={idx === 0}>
                    &uarr;
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => move(g.id, 1)}
                    disabled={idx === assignedGroups.length - 1}
                  >
                    &darr;
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => remove(g.id)}>
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
          <h2>Available groups ({availableGroups.length})</h2>
          {availableGroups.length === 0 ? (
            <p className="empty-state">
              {allGroups.length === 0 ? (
                <>
                  No groups exist yet. <Link to="/groups">Create some first</Link>.
                </>
              ) : (
                'All groups are already assigned to this category.'
              )}
            </p>
          ) : (
            <div className="assign-list">
              {availableGroups.map((g) => (
                <div className="assign-row" key={g.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">{g.name}</div>
                  </div>
                  <button className="btn btn-small" onClick={() => add(g.id)}>
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
