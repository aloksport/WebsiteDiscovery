import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, Respondent } from '../api';
import { Pagination, SearchBox, useSearchPagination } from '../components/ListControls';

function statusLabel(status: string) {
  return status === 'submitted' ? 'Submitted' : 'Draft (in progress)';
}

export default function Respondents() {
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { query, setQuery, page, setPage, totalPages, filtered, pageItems } = useSearchPagination(
    respondents,
    (r) => [r.email, r.client_name, r.company_name, statusLabel(r.status)]
  );

  useEffect(() => {
    api
      .listRespondents()
      .then(setRespondents)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load answers'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Answers</h1>
      <p className="page-subtitle">Every person who has started or completed a questionnaire, grouped by client.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="list-header">
          <h2>
            All answers ({query ? `${filtered.length} of ${respondents.length}` : respondents.length})
          </h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by email, client, status…" />
        </div>
        {loading ? (
          <p className="empty-state">Loading&hellip;</p>
        ) : respondents.length === 0 ? (
          <p className="empty-state">No one has answered a questionnaire yet.</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No answers match &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Respondent email</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>
                      {r.client_name} &mdash; {r.company_name}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'submitted' ? 'badge-submitted' : 'badge-draft'}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td>{new Date(r.updated_at).toLocaleString()}</td>
                    <td>
                      <Link className="btn btn-small" to={`/respondents/${r.id}`}>
                        View answers
                      </Link>
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
