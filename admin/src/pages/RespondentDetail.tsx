import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, RespondentDetail as RespondentDetailType } from '../api';

function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export default function RespondentDetail() {
  const { id } = useParams();
  const [respondent, setRespondent] = useState<RespondentDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getRespondent(Number(id))
      .then(setRespondent)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load answers'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="empty-state">Loading&hellip;</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!respondent) return <p className="empty-state">Not found.</p>;

  return (
    <div>
      <h1>{respondent.email}</h1>
      <p className="page-subtitle">
        {respondent.client_name} &mdash; {respondent.company_name} &middot;{' '}
        <span className={`badge ${respondent.status === 'submitted' ? 'badge-submitted' : 'badge-draft'}`}>
          {respondent.status === 'submitted' ? 'Submitted' : 'Draft (in progress)'}
        </span>{' '}
        &middot; Last updated {new Date(respondent.updated_at).toLocaleString()}
      </p>
      <p>
        <Link className="link-button" to="/respondents">
          &larr; Back to all answers
        </Link>
      </p>

      <div className="card">
        <h2>Answers ({respondent.answers.length})</h2>
        {respondent.answers.length === 0 ? (
          <p className="empty-state">No answers saved yet.</p>
        ) : (
          <div className="answers-list">
            {respondent.answers.map((a) => {
              const display = formatValue(a.value);
              return (
                <div className="answer-item" key={a.question_id}>
                  <div className="answer-question">{a.question_text}</div>
                  <div className={`answer-value ${display ? '' : 'empty'}`}>{display || 'No answer'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
