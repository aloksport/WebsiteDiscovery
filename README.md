# Questionnaire Website

A full-stack questionnaire system: an admin panel to manage questions, groups, categories, clients and their answers, and a public page you share with each client at its own URL.

## What's included

- **`backend/`** — Node.js + Express + TypeScript API, backed by PostgreSQL (via Knex). Also serves the admin panel build and the public questionnaire page.
- **`admin/`** — React (Vite + TypeScript) single-page admin panel, served at `{BASE_PATH}/admin`.
- **`backend/public-frontend/`** — the plain HTML/CSS/JS public questionnaire page, served at `{BASE_PATH}/:client-slug`.

Every customer-facing URL lives under one configurable prefix, `BASE_PATH` (defaults to `/websitediscovery` — see `docs/SETUP_LOCALHOST.md` / `docs/SETUP_WEBSERVER.md` to change it).

## How it fits together

The admin panel requires signing in, then builds the questionnaire in four layers — Questions → Groups → Categories → Clients:

0. **Logging in** (admin → Login): only accounts with the **Admin** or **Manager** role can sign in; a **User**-role account is a record only and has no admin-panel access. One admin account is seeded automatically the first time migrations run — see `docs/SETUP_LOCALHOST.md` / `docs/SETUP_WEBSERVER.md` for the credentials and **change the password immediately**. Manage accounts from **admin → Users** (full name and email are mandatory; phone and password are set/changed there too).
1. **Dashboard** (admin → Dashboard, the page you land on after logging in): shows the total number of answers received, questions, and companies (clients). Clicking "Answers received" jumps straight to the Answers page.
2. **Questions** (admin → Questions): create individual questions, each with an answer type — text box, text area, checkbox (multi-select), radio button, date picker, or select box (dropdown). Checkbox/radio/select questions have a list of options you define.
3. **Groups** (admin → Groups): bundle related questions together into a reusable group (e.g. "Contact Details", "Project Scope"). Open **Assign questions** on a group to choose which questions belong to it and in what order — each question can only appear once within a given group.
4. **Categories** (admin → Categories): build a category out of one or more groups. A category's name must be unique, and a URL-safe slug (no spaces, e.g. `website-discovery`) is generated from it automatically. Open **Assign groups** on a category to choose which groups (and therefore which questions) belong to it, and in what order. The same group can be reused across multiple categories.
5. **Clients** (admin → Clients): each client has a name, a **mandatory** email, a company name, and an optional phone number. A URL-safe slug (no spaces) is generated from the company name — "admin" can't be used, since that's reserved for the admin panel's own URL. Open **Assign categories** on a client to choose which categories (and therefore which groups and questions) that client should see, and in what order.
6. **Sharing the questionnaire**: once a client has at least one category assigned, share this URL with them:

   ```
   https://your-domain.com{BASE_PATH}/<client-slug>
   ```

   For example, with `BASE_PATH=/websitediscovery`, a client with company name "Abeo" gets `https://your-domain.com/websitediscovery/abeo`.
7. **Filling it in**: the visitor sees every question from every group in every category assigned to that client, merged into one page in the order you assigned them (duplicates removed). They must enter their email. As they type, answers are saved to their browser's local storage immediately, and to the database a moment later if a valid email has been entered. If they close the tab or navigate away without pressing **Save**, whatever they've entered is still backed up to the database against their email (status: *draft*). Pressing **Save** shows a "successfully submitted" confirmation popup and submits it for good (status: *submitted*).

   A half-filled *draft* is loaded back in if they revisit the link and re-enter the same email — but once they've submitted, revisiting with that email starts a **blank** form rather than re-filling their old answers (since they can submit again — a new Save simply updates their existing response).
8. **Reviewing answers** (admin → Answers): see every respondent (by email) for every client, whether their submission is a draft or fully submitted, and open any one of them to see every answer they gave, in the same order the questions were assigned.

## Getting started

Everything runs in Docker containers — you don't need Node.js or PostgreSQL installed locally, just Docker itself.

- Running it on your own machine: see **`docs/SETUP_LOCALHOST.md`**.
- Putting it on a real server/domain: see **`docs/SETUP_WEBSERVER.md`**.

## Project layout

```
sed-questionnaire/
├── backend/                  Express + TypeScript API and static hosting
│   ├── src/                  application source
│   ├── migrations/           Knex database migrations
│   ├── seeds/                optional demo data
│   ├── public-frontend/      the public questionnaire page (HTML/CSS/JS)
│   ├── Dockerfile.dev        dev image (hot reload) used by docker-compose.yml
│   └── docker-entrypoint.sh  runs migrations, then starts the server (prod image)
├── admin/                    React admin panel (built and served under {BASE_PATH}/admin)
│   └── Dockerfile.dev        dev image (hot reload) used by docker-compose.yml
├── docs/                     setup guides
├── Dockerfile                 production image: builds admin + backend into one image
├── docker-compose.yml         local development stack (db + hot-reloading backend/admin)
├── docker-compose.prod.yml    production stack for a webserver (db + built app)
├── .env.example                DB credentials + BASE_PATH + JWT_SECRET for docker-compose.prod.yml
└── package.json                convenience scripts for running the sub-projects without Docker
```
