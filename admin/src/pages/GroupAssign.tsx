import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, Group, Question } from '../api';

export default function GroupAssign() {
  const { id } = useParams();
  const groupId = Number(id);

  const [group, setGroup] = useState<Group | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listGroups(), api.listQuestions(), api.getGroupQuestions(groupId)])
      .then(([groups, questions, assigned]) => {
        setGroup(groups.find((g) => g.id === groupId) || null);
        setAllQuestions(questions);
        setAssignedIds(assigned.map((q) => q.id));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const questionById = new Map(allQuestions.map((q) => [q.id, q]));
  const assignedQuestions = assignedIds.map((qid) => questionById.get(qid)).filter(Boolean) as Question[];
  const availableQuestions = allQuestions.filter((q) => !assignedIds.includes(q.id));

  function add(qid: number) {
    setAssignedIds([...assignedIds, qid]);
  }

  function remove(qid: number) {
    setAssignedIds(assignedIds.filter((id) => id !== qid));
  }

  function move(qid: number, direction: -1 | 1) {
    const idx = assignedIds.indexOf(qid);
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
      await api.setGroupQuestions(groupId, assignedIds);
      setSuccess('Assigned questions saved.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save assignment');
    }
  }

  if (loading) return <p className="empty-state">Loading&hellip;</p>;
  if (!group) return <p className="empty-state">Group not found.</p>;

  return (
    <div>
      <h1>Assign questions</h1>
      <p className="page-subtitle">
        Group: <strong>{group.name}</strong>
      </p>
      <p>
        <Link className="link-button" to="/groups">
          &larr; Back to groups
        </Link>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="form-grid">
        <div className="card">
          <h2>Assigned to this group ({assignedQuestions.length})</h2>
          {assignedQuestions.length === 0 ? (
            <p className="empty-state">No questions assigned yet. Add some from the list on the right.</p>
          ) : (
            <div className="assign-list">
              {assignedQuestions.map((q, idx) => (
                <div className="assign-row" key={q.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">
                      {idx + 1}. {q.text}
                    </div>
                    <div className="assign-row-meta">{q.type}</div>
                  </div>
                  <button className="btn btn-small" onClick={() => move(q.id, -1)} disabled={idx === 0}>
                    &uarr;
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => move(q.id, 1)}
                    disabled={idx === assignedQuestions.length - 1}
                  >
                    &darr;
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => remove(q.id)}>
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
          <h2>Available questions ({availableQuestions.length})</h2>
          {availableQuestions.length === 0 ? (
            <p className="empty-state">
              {allQuestions.length === 0 ? (
                <>
                  No questions exist yet. <Link to="/questions">Create some first</Link>.
                </>
              ) : (
                'All questions are already assigned to this group.'
              )}
            </p>
          ) : (
            <div className="assign-list">
              {availableQuestions.map((q) => (
                <div className="assign-row" key={q.id}>
                  <div style={{ flex: 1 }}>
                    <div className="assign-row-text">{q.text}</div>
                    <div className="assign-row-meta">{q.type}</div>
                  </div>
                  <button className="btn btn-small" onClick={() => add(q.id)}>
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
