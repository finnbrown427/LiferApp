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

The browser app requests eBird data through a Cloudflare Pages Function. The eBird
API token is only used by that Function; do not put it in a `VITE_` variable.

Set `EBIRD_API_TOKEN` as a secret in the Cloudflare Pages project's production
environment (and preview environment if you use preview deployments). For local
Pages Function development, put the token in a root `.dev.vars` file:

```text
EBIRD_API_TOKEN=your-eBird-token
```

`.dev.vars` is ignored by Git. To run the Pages Function locally, build the app
and serve it with Wrangler using `npx wrangler pages dev dist`.
