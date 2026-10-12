import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import questionsRouter from './routes/questions';
import categoriesRouter from './routes/categories';
import groupsRouter from './routes/groups';
import clientsRouter from './routes/clients';
import respondentsRouter from './routes/respondents';
import publicRouter from './routes/public';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import dashboardRouter from './routes/dashboard';
import { requireAuth } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Every customer-facing URL (admin panel, public questionnaire pages) lives
// under this prefix, e.g. BASE_PATH=/websitediscovery gives
// /websitediscovery/admin and /websitediscovery/<client-slug>.
// Normalize: must start with "/" and never end with one.
function normalizeBasePath(raw: string): string {
  let p = raw.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  return p;
}
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || '/websitediscovery');


// ---- Auth API (login is public; /me requires a valid token internally) ----
app.use(`${BASE_PATH}/api/auth`, authRouter);

app.use(`${BASE_PATH}/api/admin`, requireAuth);
app.use(`${BASE_PATH}/api/admin/questions`, questionsRouter);
app.use(`${BASE_PATH}/api/admin/categories`, categoriesRouter);
app.use(`${BASE_PATH}/api/admin/groups`, groupsRouter);
app.use(`${BASE_PATH}/api/admin/clients`, clientsRouter);
app.use(`${BASE_PATH}/api/admin/respondents`, respondentsRouter);
app.use(`${BASE_PATH}/api/admin/users`, usersRouter);
app.use(`${BASE_PATH}/api/admin/dashboard`, dashboardRouter);

app.use(`${BASE_PATH}/api/public`, publicRouter);

// ---- Public questionnaire frontend (plain HTML/CSS/JS) ----
// Its CSS/JS assets are served under BASE_PATH (index.html references
// /websitediscovery/questionnaire-assets/...), since the reverse proxy only
// forwards BASE_PATH to this app. The unprefixed mount is kept for direct
// access to the container.
// Example shared URL: https://your-domain.com/websitediscovery/abeo
const publicFrontendDir = path.join(__dirname, '..', 'public-frontend');
const publicAssets = express.static(publicFrontendDir, { index: false });
app.use(`${BASE_PATH}/questionnaire-assets`, publicAssets);
app.use('/questionnaire-assets', publicAssets);

// ---- Admin SPA (React build output) ----
// Registered BEFORE the "/:slug" catch-all below so "<BASE_PATH>/admin"
// never falls through to being treated as a client slug.
// Not present when the backend is run on its own without the admin panel
// having been built alongside it (e.g. the Docker Compose dev setup, where
// the admin panel runs as its own Vite dev server instead) - fall back to a
// friendly message instead of erroring on a missing file in that case.
const adminDistDir = path.join(__dirname, '..', '..', 'admin', 'dist');
const adminDistIndex = path.join(adminDistDir, 'index.html');
const adminBuildExists = fs.existsSync(adminDistIndex);
const adminBasePath = `${BASE_PATH}/admin`;

if (adminBuildExists) {
  app.use(adminBasePath, express.static(adminDistDir));
  app.get(`${adminBasePath}/*`, (_req: Request, res: Response) => {
    res.sendFile(adminDistIndex);
  });
} else {
  app.get([adminBasePath, `${adminBasePath}/*`], (_req: Request, res: Response) => {
    res
      .status(503)
      .send(
        `The admin panel has not been built here. In local Docker development, use the Vite dev server instead: http://localhost:5173${adminBasePath}`
      );
  });
}

// ---- Public questionnaire page ----
// Must come after the admin routes above so "<BASE_PATH>/admin" is never
// matched here. "admin" is also rejected as a client company-name slug in
// routes/clients.ts, so this can never legitimately collide with a client.
app.get(`${BASE_PATH}/:slug`, (_req: Request, res: Response) => {
  res.sendFile(path.join(publicFrontendDir, 'index.html'));
});

app.get(BASE_PATH, (_req: Request, res: Response) => {
  res.redirect(adminBasePath);
});

app.get('/', (_req: Request, res: Response) => {
  res.redirect(adminBasePath);
});

// ---- Error handler (must be last) ----
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Admin panel:            http://localhost:${PORT}${adminBasePath}`);
  console.log(`Example questionnaire:  http://localhost:${PORT}${BASE_PATH}/<client-slug>`);
});
