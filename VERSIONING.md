# Versioning and releases

LiferApp uses semantic versions in `MAJOR.MINOR.PATCH` form. The version in
`package.json` is the source of truth; `package-lock.json` must stay in sync.

The current release baseline is **1.2.0**. In the current workflow, each
promotion from `Staging` to `main` is a minor release, so the next promotion
will be **1.3.0**.

After this setup lands on `main`, tag that commit as `v1.2.0` to record the
current baseline:

```sh
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

## Release steps

1. Merge the ready changes from `Staging` into `main`.
2. Add a dated `1.x.0` section near the top of `CHANGELOG.md` with a short
   summary of user-visible changes.
3. Commit the changelog entry, then run `npm version minor` on `main`. This
   updates both package files and creates a release commit and matching
   `v1.x.0` Git tag.
4. Push the commit and tag with `git push origin main --follow-tags`.
5. Create a GitHub Release from that tag and use the matching changelog entry
   for its notes.

For intentional releases outside this flow, use `npm version patch` for a
backwards-compatible fix or `npm version major` for a breaking change. Those
bumps also update the package files and create a Git tag.

The initial `1.2.0` entry is a tracking baseline; historical release notes
were not backfilled.
