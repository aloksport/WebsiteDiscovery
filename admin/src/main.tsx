import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

// Must match vite.config.ts's `base` (BASE_PATH + "/admin"), so client-side
// routing and the server-rendered <base> URL agree.
const basePath = (import.meta.env.VITE_BASE_PATH || '/websitediscovery').replace(/\/+$/, '');
const adminBasename = `${basePath}/admin`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={adminBasename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
