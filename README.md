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

## eBird API access

The browser app requests eBird data through the Cloudflare Worker. The eBird API
token is only used by the Worker; do not put it in a `VITE_` variable.

Set `EBIRD_API_TOKEN` as a secret in the Cloudflare Worker environment (and
preview environment if you use preview deployments). For local Worker
development, put the token in a root `.dev.vars` file:

```text
EBIRD_API_TOKEN=your-eBird-token
```

`.dev.vars` is ignored by Git. Build the app, then run `npx wrangler dev` to
serve the Worker and its assets locally. Running `npm run dev` starts Vite only
and does not run the Worker, so eBird requests will not work in that mode.

## Supabase configuration

The Vite build requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Set both as build-time variables in the
Cloudflare Worker project for production (and preview deployments, if used), then
redeploy. These must be available to the build; setting them only as runtime
Worker variables will not add them to the already-built browser app. Local
development can use the same variable names in the ignored root `.env` file.
Builds fail with a list of missing variables if either is unset.
