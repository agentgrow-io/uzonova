#!/usr/bin/env python3
"""Submit a batch of blog URLs to IndexNow + Google Indexing API.

Invoked by docs/scripts/publish.sh after a successful push. Both calls are
best-effort — missing credentials or transient errors warn and continue,
they never block publishing. With no IndexNow key and no Google SA key
configured (the default for a freshly provisioned client repo) this script
skips cleanly and exits 0.

Usage:
    python3 docs/scripts/submit_indexing.py URL [URL...]

Env vars (all optional):
    INDEXNOW_KEY             IndexNow key (the same value hosted at
                             https://<host>/<key>.txt). If unset, IndexNow is
                             skipped — no crash.
    BLOG_HOST                Host for IndexNow (e.g. agentgrow-io.github.io).
                             If unset, derived from the first submitted URL.
    SKIP_INDEXNOW=1          force-disable IndexNow submission
    GOOGLE_INDEXING_SA_KEY   path to a service-account JSON with the
                             https://www.googleapis.com/auth/indexing scope.
    GOOGLE_INDEXING_SA_JSON  inline SA JSON (for K8s pods). Written to a 0600
                             temp file and deleted after submission. If both
                             are absent, Google Indexing is skipped — no crash.
    SKIP_GOOGLE_INDEXING=1   force-disable Google Indexing API submission
"""
import json
import os
import sys
import tempfile
import time
from urllib import request, error, parse


def log(msg):
    print(f"   {msg}")


def _resolve_host(urls):
    host = os.environ.get("BLOG_HOST", "").strip()
    if host:
        return host
    for u in urls:
        netloc = parse.urlparse(u).netloc
        if netloc:
            return netloc
    return None


def submit_indexnow(urls):
    if os.environ.get("SKIP_INDEXNOW"):
        log("IndexNow: skipped (SKIP_INDEXNOW set)")
        return
    key = os.environ.get("INDEXNOW_KEY", "").strip()
    if not key:
        log("IndexNow: skipped (no INDEXNOW_KEY configured)")
        return
    host = _resolve_host(urls)
    if not host:
        log("IndexNow: skipped (could not resolve host — set BLOG_HOST)")
        return
    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"https://{host}/{key}.txt",
        "urlList": urls,
    }
    req = request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=15) as r:
            log(f"IndexNow: HTTP {r.status} for {len(urls)} URL(s)")
    except error.HTTPError as e:
        # 200/202 are success; IndexNow also returns 422 for unverified hosts
        body = e.read()[:200].decode("utf-8", errors="replace")
        log(f"IndexNow: HTTP {e.code} — {body}")
    except Exception as e:
        log(f"IndexNow: {type(e).__name__}: {e}")


def _locate_sa_key():
    """Return (path, cleanup_fn). cleanup_fn removes any temp file we created."""
    explicit = os.environ.get("GOOGLE_INDEXING_SA_KEY")
    if explicit and os.path.exists(explicit):
        return explicit, (lambda: None)

    # Inline JSON env var (K8s pods). Validate it's parseable JSON before
    # writing so we don't create a dead temp file on bad input.
    inline = os.environ.get("GOOGLE_INDEXING_SA_JSON", "").strip()
    if inline:
        try:
            json.loads(inline)
        except json.JSONDecodeError:
            return None, (lambda: None)
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, prefix="gi-sa-"
        )
        tmp.write(inline)
        tmp.close()
        os.chmod(tmp.name, 0o600)
        return tmp.name, (lambda: os.unlink(tmp.name) if os.path.exists(tmp.name) else None)

    return None, (lambda: None)


def submit_google_indexing(urls):
    if os.environ.get("SKIP_GOOGLE_INDEXING"):
        log("Google Indexing API: skipped (SKIP_GOOGLE_INDEXING set)")
        return
    sa_path, cleanup = _locate_sa_key()
    if not sa_path:
        log("Google Indexing API: skipped (no SA key — set GOOGLE_INDEXING_SA_KEY file path or GOOGLE_INDEXING_SA_JSON inline)")
        return
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        log("Google Indexing API: skipped (pip install google-api-python-client google-auth)")
        cleanup()
        return
    try:
        creds = service_account.Credentials.from_service_account_file(
            sa_path, scopes=["https://www.googleapis.com/auth/indexing"]
        )
        svc = build("indexing", "v3", credentials=creds, cache_discovery=False)
        ok, fail = 0, 0
        for u in urls:
            try:
                svc.urlNotifications().publish(
                    body={"url": u, "type": "URL_UPDATED"}
                ).execute()
                ok += 1
            except Exception as e:
                fail += 1
                log(f"Google Indexing: {u} — {type(e).__name__}: {str(e)[:120]}")
            time.sleep(0.25)  # conservative; 200/day quota per SA
        log(f"Google Indexing API: {ok} submitted, {fail} failed (SA={os.path.basename(sa_path)})")
    except Exception as e:
        log(f"Google Indexing API: {type(e).__name__}: {str(e)[:160]}")
    finally:
        cleanup()


def main():
    urls = [u for u in sys.argv[1:] if u.startswith("http")]
    if not urls:
        print("No URLs provided; nothing to submit.")
        return
    print(f"Submitting {len(urls)} URL(s) for indexing:")
    for u in urls:
        print(f"   • {u}")
    submit_indexnow(urls)
    submit_google_indexing(urls)


if __name__ == "__main__":
    main()
