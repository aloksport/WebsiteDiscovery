import { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Questions from './pages/Questions';
import Groups from './pages/Groups';
import GroupAssign from './pages/GroupAssign';
import Categories from './pages/Categories';
import CategoryAssign from './pages/CategoryAssign';
import Clients from './pages/Clients';
import ClientAssign from './pages/ClientAssign';
import Respondents from './pages/Respondents';
import RespondentDetail from './pages/RespondentDetail';
import { useAuth } from './context/AuthContext';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="auth-loading">Loading&hellip;</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return <>{children}</>;
}

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // The login page has no sidebar/layout chrome of its own.
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <RequireAuth>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">Questionnaire Admin</div>
          <nav>
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/questions" className={navClass}>
              Questions
            </NavLink>
            <NavLink to="/groups" className={navClass}>
              Groups
            </NavLink>
            <NavLink to="/categories" className={navClass}>
              Categories
            </NavLink>
            <NavLink to="/clients" className={navClass}>
              Clients
            </NavLink>
            <NavLink to="/respondents" className={navClass}>
              Answers
            </NavLink>
            <NavLink to="/users" className={navClass}>
              Users
            </NavLink>
          </nav>
          {user && (
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-name">{user.fullName}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
              <button className="btn btn-small sidebar-logout" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id/assign" element={<GroupAssign />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:id/assign" element={<CategoryAssign />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id/assign" element={<ClientAssign />} />
            <Route path="/respondents" element={<Respondents />} />
            <Route path="/respondents/:id" element={<RespondentDetail />} />
            <Route path="/users" element={<Users />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </RequireAuth>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link active' : 'nav-link';
}
