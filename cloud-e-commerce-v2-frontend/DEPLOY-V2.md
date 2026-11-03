# Cloud E-Commerce V2 — Professional UI update

This ZIP changes ONLY two frontend files:

- `frontend/src/main.jsx`
- `frontend/src/styles.css`

It intentionally DOES NOT include a `compose.yaml`, `.env`, backend code, database scripts, or Nginx configuration. The current production gateway security fix and PostgreSQL data remain untouched.

## GitHub upload (current nested repository layout)

The VPS repository is `/root/cloud-e-commerce` and the live application directory is:

`/root/cloud-e-commerce/cloud-e-commerce/cloud-e-commerce/`

On the GitHub `feature/professional-ui` branch, the actual frontend folder is:

`cloud-e-commerce/cloud-e-commerce/frontend/`

Replace the existing files at:

- `cloud-e-commerce/cloud-e-commerce/frontend/src/main.jsx`
- `cloud-e-commerce/cloud-e-commerce/frontend/src/styles.css`

Do **not** upload this zip as one file or add another enclosing folder. You can use Git to copy the two files over the existing paths, commit, and push. The correct GitHub browser location is the `src` folder inside that nested `frontend` directory.

## Safe deployment steps

```bash
cd /root/cloud-e-commerce
git switch feature/professional-ui
git status --short
# Confirm clean; .env must remain local and must never be committed.
git pull --ff-only origin feature/professional-ui

cd /root/cloud-e-commerce/cloud-e-commerce/cloud-e-commerce
docker compose config --quiet
# Rebuild ONLY the frontend service, without touching the database volume.
docker compose up -d --build --no-deps frontend
docker compose ps
curl -I https://shop.skillopsacademy.tech/
curl -fsS https://shop.skillopsacademy.tech/api/products | head -c 250
```

The redesigned frontend uses the existing `/api/products` and `/api/orders` routes. Product photos use public Unsplash URLs and require internet access in visitors' browsers, with emoji fallback on image errors. The dashboard uses live inventory and only shows demo orders created in the current browser session. The assistant is a labeled rule-based demo, NOT an actual LLM integration.

## Rollback of frontend changes

The last source-code snapshot before this UI is `ddf8543` (the secured Compose commit). Preserve the `feature/professional-ui` branch for development, and use `git restore --source=ddf8543 -- cloud-e-commerce/cloud-e-commerce/frontend/src/main.jsx cloud-e-commerce/cloud-e-commerce/frontend/src/styles.css` from `/root/cloud-e-commerce` to restore the old frontend **only** if necessary. Then rebuild the frontend service. Avoid `docker compose down -v` as it can delete database volumes.

## Validation

JSX syntax has been parsed with TypeScript successfully. Complete Vite/Docker build and visual browser test could not be performed in this environment. The VPS build is the definitive check.
