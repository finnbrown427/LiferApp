# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Cloudflare Wrangler workflows

This project uses `src/worker.ts` as its Cloudflare Worker. The Worker serves
the built browser app from `dist` and proxies `/api/ebird/*` requests to eBird,
adding the eBird API token on the server side. Do not put that token in a
`VITE_` variable.

### Build the browser app

Run this before testing or deploying the Worker so `dist` contains the latest
app. The build needs `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` available in the environment or root `.env`
file.

```sh
npm run build
```

### Run the Vite development server

```sh
npm run dev
```

This starts Vite with hot reload, but does not run the Cloudflare Worker or its
eBird proxy. Use it for frontend work that does not need `/api/ebird`.
Similarly, `npm run preview` serves the built Vite app only; it is not a
Cloudflare Worker preview.

### Run the Worker locally

Put the token in a root `.dev.vars` file:

```text
EBIRD_API_TOKEN=your-eBird-token
```

`.dev.vars` is ignored by Git. After building, run:

```sh
npx wrangler dev
```

This runs the Worker locally and serves the built app. Wrangler reads
`.dev.vars`, so the local eBird proxy works without deploying or pushing code
to Git. Re-run `npm run build` after frontend changes so the `dist` assets are
up to date.

### Create a Cloudflare Preview

After building and logging in to Cloudflare with `npx wrangler login`, run:

```sh
npx wrangler preview
```

This uploads the current local Worker and `dist` assets as a Cloudflare Preview;
it does not require a Git push and does not deploy to production. Wrangler
Preview is currently an open-beta feature. Local `.dev.vars` is for local
development; configure the eBird token for the Preview separately:

```sh
npx wrangler preview secret put EBIRD_API_TOKEN
```

Wrangler prompts for the secret. Preview secrets are separate from production
Worker secrets.

### Deploy to production

After building, configure the production Worker secret (Wrangler prompts for
its value) with:

```sh
npx wrangler secret put EBIRD_API_TOKEN
```

The Worker must exist before you can set its secret. For a first deployment,
run `npx wrangler deploy` once to create it, then set the secret. For later code
changes, run `npx wrangler deploy` to publish the current local Worker and
`dist` assets.

`npx wrangler deploy` uploads the current local Worker and `dist` assets to the
production Worker configured in `wrangler.json`. It does not require a Git
push. Only run it when you intend to update the production app.

## Supabase configuration

The Vite build requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Set both as build-time variables in the
Cloudflare Worker project for production (and preview deployments, if used), then
redeploy. These must be available to the build; setting them only as runtime
Worker variables will not add them to the already-built browser app. Local
development can use the same variable names in the ignored root `.env` file.
Builds fail with a list of missing variables if either is unset.

## Import species images from iNaturalist

This one-time batch job uploads licensed JPEGs to the public `species-images`
Supabase Storage bucket. It saves the species, image path, license, attribution,
and import progress in Supabase tables. It does not expose the service-role key
to the browser.

1. In the Supabase SQL Editor, run
   [`supabase/migrations/20261127000000_species_images.sql`](./supabase/migrations/20261127000000_species_images.sql)
   and
   [`supabase/migrations/20261127001000_life_list_observed_date.sql`](./supabase/migrations/20261127001000_life_list_observed_date.sql).
2. In your Supabase project's **Settings → API Keys**, create/copy a **Secret
   key** and add it as `SUPABASE_SECRET_KEY=...` in the root `.env` file. The
   importer also accepts a legacy `service_role` key as
   `SUPABASE_SERVICE_ROLE_KEY`. Keep either key private and never use a `VITE_`
   prefix.
3. Generate an input list for an eBird region. The command reads
   `EBIRD_API_TOKEN` from `.dev.vars`:

   ```sh
   npm run species:export -- NZ
   ```

   This writes `NZ-species.csv` in the project root. Add an output filename to
   the command to choose a different location. To limit it to species reported
   in the last 30 days or less, add `--recent-days 30`.
4. First try a small batch, then run the full import:

   ```sh
   npm run images:import -- NZ-species.csv --limit 20
   npm run images:import -- NZ-species.csv
   ```

   To replace a poor iNaturalist photo for one species, use its eBird species code
   from the CSV:

   ```sh
   npm run images:import -- NZ-species.csv --refresh-species SPECIES_CODE
   ```

   Replace `SPECIES_CODE` with the code from the first column of your CSV. This
   fetches fresh iNaturalist taxon data and skips the currently stored photo. The
   existing image is retained if no different photo with an allowed license is
   available. Manual images are not replaced.

The importer accepts only `cc0`, `cc-by`, and `cc-by-sa` licenses by default.
It can be resumed safely; `--retry-failed` retries unresolved taxa and failed
photo lookups. The `unresolved.csv` report lists species without an uploaded
image. Generated CSVs and cached iNaturalist responses are ignored by Git.
Reimport your eBird life-list CSV after applying the migration to populate the
observation dates and common names used by the dashboard's recent-bird cards.
