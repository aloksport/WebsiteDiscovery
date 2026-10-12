# Deploying to the live server (sed-abeo.com)

The live site is:

- **Admin panel**: https://sed-abeo.com/websitediscovery/admin/
- **Questionnaire**: `https://sed-abeo.com/websitediscovery/<client-slug>` (e.g. https://sed-abeo.com/websitediscovery/abeo)

The code lives in **`/home/adminroot/public_html/websitediscovery`**. Three Docker containers run from `docker-compose.prod.yml`: `db` (PostgreSQL), `app` (API + admin panel + questionnaire) and `nginx` (a small proxy in front of the app). The server's existing **Apache** web server, which already handles the domain and HTTPS, forwards every `/websitediscovery/*` request to the nginx container through the `.htaccess` file in that folder (see step 6).

```
Browser ──► Apache (sed-abeo.com, HTTPS)
              │  public_html/websitediscovery/.htaccess
              ▼
            127.0.0.1:8070  nginx container (nginx/default.conf)
              │  Docker network
              ▼
            app:4000  app container ──► db container

(127.0.0.1:4001 also reaches the app directly, for checks from the server)
(127.0.0.1:5433 reaches PostgreSQL)
```

## 1. Prerequisites on the server

- Docker Engine + the Compose plugin (`docker --version`, `docker compose version`)
- Apache with `mod_rewrite`, `mod_proxy` and `mod_proxy_http` enabled (the `[P]` flag in `.htaccess` needs them)
- `AllowOverride` permitting `.htaccess` rewrite rules in `public_html`

## 2. Upload the project

From your own machine, copy the project to the server. This uploads everything except `node_modules`/`dist` (built fresh inside the containers) and your local `.env`:

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  ./ adminroot@sed-abeo.com:/home/adminroot/public_html/websitediscovery/
```

(If you're using git instead, `git clone` the repository into `/home/adminroot/public_html/websitediscovery`.) Make sure the `.htaccess` file at the project root is uploaded — it is what connects the domain to the app.

Run the rest of the commands in this guide from that folder:

```bash
cd /home/adminroot/public_html/websitediscovery
```

## 3. Configure environment variables

```bash
cp .env.example .env
nano .env
```

```
DB_NAME=questionnaire1
DB_USER=questionnaire_user
DB_PASSWORD=choose-a-strong-password
BASE_PATH=/websitediscovery
JWT_SECRET=paste-a-long-random-string-here
```

Generate `JWT_SECRET` with `openssl rand -hex 32`. Anyone who has this value can forge admin logins, so treat it like a password.

`BASE_PATH` must stay `/websitediscovery`: it has to match the folder name under `public_html` and the `RewriteBase` in `.htaccess`. It is baked into the admin panel at build time, so after changing it you must rebuild (step 4).

`.env` sits inside `public_html`, but `.htaccess` forwards every request to the app, so Apache never serves the file itself.

## 4. Build and start the app

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the production image (React admin panel + compiled backend in one image), starts PostgreSQL with a persistent volume, the app and the nginx proxy. On every start the app container runs the database migrations before serving traffic, so there's no separate migration step. The first run also seeds one admin login (see "Admin login" below).

The nginx proxy listens on `127.0.0.1:8070` and the app on `127.0.0.1:4001` — neither is reachable from the internet directly; Apache forwards the public URLs to nginx.

Check it's healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
curl -I http://127.0.0.1:8070/websitediscovery/admin/   # through nginx (what Apache uses)
curl -I http://127.0.0.1:4001/websitediscovery/admin/   # the app directly
```

### Optional: load demo data

Only on a brand-new database:

```bash
docker compose -f docker-compose.prod.yml exec app npm run seed
```

⚠️ Skip this once you have real data — it wipes every table.

## 5. Restart on boot

Every service in `docker-compose.prod.yml` has `restart: unless-stopped`, so containers come back after a reboot as long as the Docker service is enabled:

```bash
sudo systemctl is-enabled docker
```

## 6. Apache (`.htaccess`)

`/home/adminroot/public_html/websitediscovery/.htaccess` (included in the project):

```apache
RewriteEngine On
RewriteBase /websitediscovery/

RewriteRule ^(.*)$ http://127.0.0.1:8070/websitediscovery/$1 [P,L]
```

It forwards every path under `/websitediscovery/` to the nginx container, which passes it to the app unchanged (`nginx/default.conf`); the app itself decides what is the admin panel (`/websitediscovery/admin`), the API (`/websitediscovery/api`) and a client questionnaire (`/websitediscovery/<client-slug>`). HTTPS is handled by Apache's existing certificate for sed-abeo.com.

If you change the nginx port in `docker-compose.prod.yml` (`127.0.0.1:8070:80`), change it here too.

On the live site, responses under `/websitediscovery/` carry `Server: nginx` — that's this container; the rest of sed-abeo.com shows `Server: Apache`.

## 7. Firewall

Only Apache (ports 80/443) needs to be public. nginx is bound to `127.0.0.1:8070` and the app to `127.0.0.1:4001`. The database is published on host port `5433` for admin tools; if you don't need that from outside the server, change it to `"127.0.0.1:5433:5432"` in `docker-compose.prod.yml` or block it in the firewall.

## 8. Sharing questionnaire links

Once a client has categories assigned in the admin panel, their link is:

```
https://sed-abeo.com/websitediscovery/<client-slug>
```

For example, a client with company name "Abeo" gets https://sed-abeo.com/websitediscovery/abeo.

## Redeploying after changes

```bash
cd /home/adminroot/public_html/websitediscovery
git pull                       # or re-upload with rsync (step 2)
docker compose -f docker-compose.prod.yml up -d --build
```

The rebuilt container runs any new migrations automatically before it starts serving traffic. The nginx container looks the app up again on every request, so it keeps working after the app container is recreated. After changing `nginx/default.conf`, restart it: `docker compose -f docker-compose.prod.yml restart nginx`.

## Backups

Back up the PostgreSQL database regularly:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U questionnaire_user questionnaire1 > questionnaire_backup_$(date +%F).sql
```

(Use the `DB_USER`/`DB_NAME` from `.env`, and keep the dump outside `public_html`.) To restore into a fresh database:

```bash
cat questionnaire_backup_2026-09-16.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U questionnaire_user questionnaire1
```

## Admin login

The admin panel requires signing in — only **Admin** or **Manager** accounts (managed on the **Users** page) can log in.

The first time migrations run against a fresh database, one admin account is seeded:

- **Email**: `alok@sportainmentdesign.com`
- **Password**: `123456`

⚠️ **Change this immediately after your first deploy** from the **Users** page.

Sessions are signed with `JWT_SECRET` and last 7 days. To log everyone out at once, change `JWT_SECRET` in `.env` and redeploy.
