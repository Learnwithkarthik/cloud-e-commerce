# Cloud E-Commerce — CloudCart

A practical, **deployable e-commerce starter** for teaching Git, DevOps, cloud-native application development, and later ML/MLOps/GenAI/Agentic AI.

**Current MVP**: responsive React storefront, 8 seed products, category/search filters, shopping cart, demo checkout, Product Service, Order Service, PostgreSQL, Nginx API gateway, Docker Compose, and GitHub Actions build workflows.

> **Educational demo only.** Orders do not charge money, send emails, or fulfill shipments. No customer login, payments, admin authorization, or anti-abuse protection is implemented. Do not enter real personal data; use synthetic identities.

## Architecture

```text
Browser
  |
  v
Nginx gateway :8080 (only publicly exposed container port)
  |-- /           --> React frontend (Nginx static build)
  |-- /api/products --> FastAPI product-service --> PostgreSQL
  `-- /api/orders   --> FastAPI order-service   --> PostgreSQL
```

Two services access a shared database for starter simplicity. In a mature microservice system, each service should own its data and integrate via APIs/events.

## Requirements

- Docker Engine and Docker Compose plugin (`docker compose`)
- About 4 GB RAM recommended for a small demonstration
- Host port 8080 available (or set `HOST_PORT`)

## Local / VPS quick start

```bash
git clone https://github.com/Learnwithkarthik/cloud-e-commerce.git
cd cloud-e-commerce
cp .env.example .env
# Edit .env and set a LONG random POSTGRES_PASSWORD. Do not commit .env!
nano .env
docker compose config --quiet
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/api/products/health
curl http://127.0.0.1:8080/api/orders/health
```

Go to `http://SERVER_IP:8080` for a preliminary demo **only after** reviewing firewall exposure. The default port is HTTP; use a proper domain and HTTPS reverse proxy before public student access. Ensure port 8080 does not conflict with existing applications. Never expose PostgreSQL port 5432 directly to the internet.

> PostgreSQL will initialize from `database/001_init.sql` **only on the first creation of the named Docker volume**. Subsequent edits to that file will not reinitialize the existing database.

### Useful commands

```bash
docker compose logs -f --tail=80
docker compose logs -f product-service order-service
docker compose ps
docker compose down              # stop, KEEP database volume
docker compose up -d --build     # rebuild and start
```

**Do not** run `docker compose down -v` unless you intentionally want to erase demo orders and products.

## Test APIs

```bash
curl http://localhost:8080/api/products
curl -X POST http://localhost:8080/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"customer_name":"Demo Student","customer_email":"student@example.com","items":[{"product_id":1,"quantity":1}]}'
```

Order totals are calculated **server-side**, and PostgreSQL transactions lock products during checkout to avoid overselling. Items are not a real payment transaction.

## GitHub workflow

1. Develop locally in `feature/...` branches and push to GitHub. Run `npm install` in `frontend/` to generate and commit `package-lock.json` for repeatable dependency resolution; then change Docker/CI install commands to `npm ci`.
2. Open a pull request. `.github/workflows/ci.yml` builds the frontend and Docker images.
3. Merge after review. On VPS, `git pull --ff-only origin main && docker compose up -d --build` for an initial manual deployment.
4. **Optional**: `.github/workflows/deploy.yml` is a manual GitHub Actions deployment. Set repository secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` and environment variable `DEPLOY_PATH` (full VPS checkout directory). Create a dedicated non-root deploy user with key-only SSH and necessary Docker access, and configure a protected GitHub `production` environment before enabling. Verify known-host fingerprint from the VPS provider out of band. GitHub Actions builds can later publish immutable images to GHCR to reduce load on a 1-vCPU VPS.

## Production caution

This is **not production-ready commerce software**. Before real public use, implement HTTPS, authentication, rate limiting, input sanitization policies, secure secret management, auditing, privacy/retention controls, backups, monitoring, database migrations, application tests, and payment integration from a compliant provider. Customer email/name storage in this demo is for teaching only.

## Roadmap

See [docs/TEACHING-ROADMAP.md](docs/TEACHING-ROADMAP.md) for ML, MLOps, RAG, and Agentic AI extensions.
