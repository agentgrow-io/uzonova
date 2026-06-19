# Uzonova Blog

Auto-provisioned blog for **Uzonova**, served via GitHub Pages at
<https://agentgrow-io.github.io/uzonova/>.

## How it works

- **Source of truth:** `docs/posts/*.html` — one file per post.
- **Generated artefacts:** `docs/posts-data.json` + `docs/sitemap.xml` are
  rebuilt from the posts by `docs/scripts/regenerate_indexes.py`. **Never edit
  them by hand** — they will be clobbered.
- **Landing page:** `docs/index.html` reads `posts-data.json` client-side and
  renders the post cards (shows "First post coming soon" while empty).
- **Pages config:** branch `main`, folder `/docs`. `.nojekyll` keeps GitHub
  Pages from running Jekyll over the static files.

## Publishing

```bash
# 1. add/edit a post under docs/posts/<slug>.html
# 2. rebuild indexes, commit, push:
./docs/scripts/publish.sh "Add: <post title>"
```

`publish.sh` regenerates the indexes, commits, pushes, and (best-effort)
submits new URLs to IndexNow + the Google Indexing API. Indexing is skipped
cleanly when no `INDEXNOW_KEY` / Google service-account key is configured.

CI (`.github/workflows/validate-indexes.yml`) fails the build if the committed
`posts-data.json` / `sitemap.xml` drift from a fresh regenerate — always
publish via `publish.sh`.

## Canonical URLs

`BLOG_BASE` (set by `publish.sh`) is `https://agentgrow-io.github.io/uzonova`.
Asset links in pages are **relative**, so the site is robust to the project-
pages subpath.
