# Running it on localhost with Docker

This runs the whole stack — PostgreSQL, the backend API, and the admin panel — in containers, with hot reload for both the backend and the admin panel while you work.

## 1. Prerequisites

Install **Docker Desktop** (Windows/Mac) or **Docker Engine + the Compose plugin** (Linux):

- https://docs.docker.com/get-docker/

Check it's working:

```bash
docker --version
docker compose version
```

You do **not** need Node.js or PostgreSQL installed on your machine for this path — everything runs inside containers.

## 2. Unzip the project

Unzip the delivered file, then open a terminal in the resulting folder (it contains `backend/`, `admin/`, `docs/`, `docker-compose.yml`, and this file's parent folder).

## 3. Start everything

From the project root:

```bash
docker compose up --build
```

The first run downloads base images and installs dependencies inside the containers, so it takes a few minutes; after that, starts are fast. This starts three containers:

- **`db`** — PostgreSQL, with its data kept in a Docker volume (`db_data`) so it survives restarts.
- **`backend`** — the Express API on `http://localhost:4000`, hot-reloading on code changes (via `ts-node-dev`).
- **`admin`** — the React admin panel dev server on `http://localhost:5173/websitediscovery/admin`, hot-reloading on code changes (via Vite). It also forwards every other `/websitediscovery/...` URL (the API and the public questionnaire pages) to the backend, so you use port 5173 for everything.

Leave this running in its terminal (or add `-d` to run it in the background: `docker compose up --build -d`).

## 4. Run the database migrations

In a second terminal, from the project root:

```bash
docker compose exec backend npm run migrate
```

This creates all the tables (questions, groups, categories, clients, users, and the tables that link them together and store answers), and seeds one admin login (`alok@sportainmentdesign.com` / `123456` — see step 5). You only need to do this once per fresh database volume.

### Optional: load demo data

To see the app working right away with a few sample questions, a category and a client already set up:

```bash
docker compose exec backend npm run seed
```

⚠️ This wipes and reloads every table, so only run it right after `migrate` on a fresh database, not one with real data you want to keep.

## 5. Use the app

Every customer-facing URL lives under a shared prefix, `BASE_PATH` (`/websitediscovery` by default — see "Changing the URL prefix" below to use your own):

- **Admin panel**: http://localhost:5173/websitediscovery/admin
- **Public questionnaire page**, once a client has a category assigned: http://localhost:5173/websitediscovery/<client-slug> (e.g. http://localhost:5173/websitediscovery/abeo for a client whose company name is "Abeo")

The admin panel now requires signing in. A seeded account is created automatically the first time you run the migrations (step 4):

- **Email**: `alok@sportainmentdesign.com`
- **Password**: `123456`

⚠️ This is a well-known default. Sign in and change it (or create your own admin user and delete this one) from the **Users** page before using the app with any real data — see step 6.

Only accounts with the **Admin** or **Manager** role can sign in; a **User**-role account is a record only and cannot log in.

## 6. Trying it end-to-end

1. Open the admin panel and sign in with the seeded account above. You'll land on the **Dashboard**, showing counts of answers received, questions, and companies (clients) — clicking "Answers received" jumps to the Answers page.
2. Open **Users** and add your own admin account (or change the seeded password), then add a question or two under **Questions**.
3. Create a **Group** and use **Assign questions** to add questions to it (a group is a reusable bundle of questions, e.g. "Contact Details").
4. Create a **Category** and use **Assign groups** to add one or more groups to it.
5. Create a client (email is mandatory) and use **Assign categories** to give them that category.
6. Open `http://localhost:5173/websitediscovery/<client-slug>` in a new tab (or an incognito window, so it behaves like a fresh visitor) and fill it in.
7. Go back to the admin panel's **Answers** page to see the response, in the same question order you assigned it — even before pressing Save, if you entered an email and then closed the tab, a draft answer should already be there. Submitting shows a confirmation popup, and the same email can submit as many times as it likes - every submission is kept as its own response (a link is never re-filled with an *already-submitted* response automatically — only an in-progress draft is).

### Changing the URL prefix

To use your own prefix instead of `/websitediscovery` (e.g. to match `docs/SETUP_WEBSERVER.md`'s example), edit **both** of these in `docker-compose.yml` before starting, and keep them identical:

```yaml
  backend:
    environment:
      BASE_PATH: /your-prefix
  admin:
    environment:
      VITE_BASE_PATH: /your-prefix
```

Restart with `docker compose up --build` after changing it.

## 7. Everyday commands

```bash
docker compose up -d          # start in the background
docker compose logs -f        # tail logs from every service
docker compose logs -f backend  # just the backend
docker compose down           # stop and remove the containers (keeps the db_data volume)
docker compose down -v        # stop and also DELETE the database volume (fresh start)
docker compose restart backend  # restart just one service
```

Since your source folders (`backend/src`, `admin/src`, etc.) are mounted straight into the containers, editing code on your machine takes effect immediately — no rebuild needed. You only need `docker compose up --build` again after changing a `package.json` (new dependency) or a `Dockerfile.dev`.

## 8. Testing the production image locally (optional)

If you want to check the exact image that would run on a real server before deploying it:

```bash
cp .env.example .env
# edit .env if you like - any local values are fine for this test, but do
# set JWT_SECRET to something (even a random test string; see comment in
# .env.example) since it's required for the admin login to work

docker compose -f docker-compose.prod.yml up --build
```

This builds the single production image (admin panel + backend compiled together) and runs migrations automatically on startup. Open http://localhost:4000/websitediscovery/admin and http://localhost:4000/websitediscovery/<client-slug> (or your own prefix, if you set `BASE_PATH` in `.env`). Stop it with `docker compose -f docker-compose.prod.yml down` (add `-v` to also remove that test database).

## Troubleshooting

- **"port is already allocated"** — something on your machine is already using port 4000, 5173 or 5432. Stop that process, or change the left-hand side of the port mapping in `docker-compose.yml` (e.g. `"4001:4000"`) and use the new port in your browser.
- **Admin panel loads but API calls fail** — make sure the `backend` container is healthy: `docker compose logs backend`. The admin dev server proxies everything under `/websitediscovery` except `/websitediscovery/admin` to the backend container over the internal Docker network, not to your host machine.
- **"relation ... does not exist" errors** — you haven't run the migrations yet; see step 4.
- **Blank admin page** — open the browser console (F12); a JavaScript error there usually points at the file and line. After editing `admin/vite.config.ts`, restart the admin container: `docker compose restart admin`.
- **Changes to `package.json` aren't picked up** — rebuild that service: `docker compose up --build backend` (or `admin`).
- **Start completely fresh** — `docker compose down -v` removes the database volume too, then repeat steps 3–4.
