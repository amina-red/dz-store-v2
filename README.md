# DZ Store v2

An online shop for Algerian sellers: Arabic first (with French and English), cash on delivery, delivery prices per wilaya, and an admin panel to confirm, ship and track orders.

**Stack:** Symfony 7.4 (PHP 8.3) + PostgreSQL 16 for the API · Next.js 15 + Tailwind CSS 4 for the shop and the admin · Docker Compose to run everything with one command.

The full plan (features, data model, API, design system, milestones) is in the project document. The screen designs are on the design canvas.

## Run it on your PC

You only need **Docker Desktop** and **Git**. PHP, Composer, Node and PostgreSQL run inside containers.

```bash
cp .env.example .env          # then set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters)
docker compose up --build     # first start downloads packages: a few minutes
```

| What | Where |
| --- | --- |
| Shop | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| API | http://localhost:8000/api/products |
| Database | localhost:5432, user `dzstore`, password from `.env` |

On the first start the API container:

1. installs the PHP packages,
2. **generates the first database migration** from the entities in `backend/migrations/` (commit this file to Git),
3. creates the tables, adds the 58 wilayas and a demo catalog (8 products, no photos),
4. creates your admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Useful commands:

```bash
docker compose exec api vendor/bin/phpunit                    # backend tests
docker compose exec api php bin/console app:create-admin you@shop.dz   # add an admin or change a password
docker compose exec api php bin/console doctrine:migrations:diff       # after you change an entity
docker compose exec web npm run typecheck                     # frontend type check
docker compose down -v                                        # stop and DELETE all data (fresh start)
```

## How it is organized

```
backend/                     Symfony API
  src/Domain/                Pure business rules, no framework: prices, phone numbers, order statuses, cart rules
  src/Entity/                Doctrine entities = the 9 database tables
  src/Service/               CartQuoter (prices a cart), OrderPlacer (places an order), OrderWorkflow (status changes), Presenter (JSON shapes)
  src/Controller/Api/        Public endpoints: catalog, quote, order, tracking
  src/Controller/Admin/      Admin endpoints (login required)
  src/Security/, src/EventListener/   JSON login/logout, 401/403 answers, CSRF header check, JSON errors
  src/Command/               app:seed (wilayas + demo), app:create-admin
  tests/Domain/              Unit tests for the business rules
frontend/                    Next.js
  src/app/(shop)/            Storefront: home, products, product page, cart, checkout, tracking
  src/app/admin/             Admin: login, dashboard, orders queue, products, categories, wilayas, blocked phones
  src/app/api/[...path]/     Forwards browser calls /api/* to Symfony (one domain, no CORS)
  src/lib/                   API helpers, cart, translations (i18n.ts), formatting
```

## The rules that protect the shop

- **The server decides every price.** The browser sends only variant ids and quantities. Symfony recomputes prices, delivery fee and total (`src/Domain/Pricing.php`).
- **No overselling.** Placing an order locks the variant rows in one transaction, checks stock, then subtracts it. Cancelling or returning puts stock back.
- **Fake orders cost less.** Phones are normalized (`+213 555…` = `0555…`), blocked numbers are refused, at most 3 "new" orders per phone in 24 h, and the admin sees how many parcels each phone refused before.
- **Order statuses can only move forward** along the allowed arrows (`src/Domain/OrderStatus.php`); every change is saved with who did it.
- **Admin security:** password hashing, session cookie (HttpOnly, SameSite=Lax), 5 wrong passwords = 15 minutes locked, and every admin change needs the `X-Requested-With: dz-store` header (CSRF protection).
- **Uploads:** JPEG/PNG/WebP only, checked from the file content, 5 MB max, random file names.

## Deploy a free demo (no card)

1. **Database:** create a free Postgres on Neon or Supabase, copy its connection string.
2. **API on Render:** New Web Service → your GitHub repo → root directory `backend` → Docker. Environment: `APP_ENV=prod`, `APP_SECRET` (long random), `DATABASE_URL`, `FREE_DELIVERY_FROM`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Commit the generated migration first.
3. **Shop on Vercel:** import the repo, root directory `frontend`, environment `API_URL=https://<your-api>.onrender.com`.

Free-tier limits: the Render API sleeps after 15 minutes idle (the first visit then waits about a minute), its disk is wiped on each deploy (uploaded photos disappear; move uploads to Cloudinary when that matters), and Vercel Hobby is for non-commercial use. A paying client pays for real hosting.

## Known limits of this first version

- Written without running `composer install` / `npm install` in the environment where it was made: the business rules were tested in plain PHP and the frontend was type-checked against stand-in types. **The first real check is your first `docker compose up`**; fix anything it reports before building on top.
- API error messages are in English. The checkout translates the stock error, but form-field messages and limits (e.g. "too many orders") still show in English. Translating them is a good first task.
- The admin is in French only.
- No delivery company API, no Chargily card payments, no SMS yet: see milestone M6 in the project document.

## License

Add a license before you make the repository public (MIT is the usual choice for a portfolio project).
