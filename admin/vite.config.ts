import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin app is served under {VITE_BASE_PATH}/admin (e.g.
// /websitediscovery/admin), so every built asset path needs that prefix.
// This MUST match the backend's BASE_PATH (see backend/.env.example) -
// set it in admin/.env, or as a build-time env var (Docker passes it as a
// build arg - see the root Dockerfile).
//
// VITE_API_PROXY_TARGET lets the backend URL be overridden — used by Docker
// Compose, where the backend is reached as http://backend:4000 (its service
// name) rather than http://localhost:4000.
const basePath = (process.env.VITE_BASE_PATH || '/websitediscovery').replace(/\/+$/, '');
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  base: `${basePath}/admin/`,
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so the dev server is reachable from outside a container
    watch: {
      // Bind-mounted volumes (used for hot reload in Docker) don't always
      // deliver native filesystem change events, so fall back to polling
      // when CHOKIDAR_USEPOLLING=true is set (docker-compose.yml sets this).
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    // Everything under BASE_PATH except the admin panel itself goes to the
    // backend: the API, the public questionnaire pages
    // (http://localhost:5173{BASE_PATH}/<client-slug>) and their CSS/JS. This
    // gives local development the same URLs as the live server.
    proxy: {
      [`^${basePath}(?!/admin(?:[/?]|$))(?:[/?]|$)`]: {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
