import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, DashboardStats } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="page-subtitle">{user ? `Welcome back, ${user.fullName}.` : 'Overview of the questionnaire system.'}</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="empty-state">Loading&hellip;</p>
      ) : (
        <div className="stat-grid">
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => navigate('/respondents')}
            title="View all answers"
          >
            <div className="stat-value">{stats?.answersReceived ?? 0}</div>
            <div className="stat-label">Answers received</div>
          </button>
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => navigate('/questions')}
            title="View all Questions"
          >
            <div className="stat-value">{stats?.questionsCount ?? 0}</div>
            <div className="stat-label">Questions</div>            
           </button> 
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => navigate('/clients')}
            title="View all clients"
          >
            <div className="stat-value">{stats?.companiesCount ?? 0}</div>
            <div className="stat-label">Companies</div>
          </button>
        </div>
      )}
    </div>
  );
}
