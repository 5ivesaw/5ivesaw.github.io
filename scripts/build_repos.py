#!/usr/bin/env python3
"""Build the small, static repository catalog from public GitHub metadata.

No README scraping or guessed icons/sites: those made the catalog noisy and stale.
Run from anywhere; both Pages layouts are written together.
"""

import datetime
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

USER = "5ivesaw"
ROOT = Path(__file__).resolve().parents[1]
TOKEN = os.environ.get("GITHUB_TOKEN")
FEATURED = (
    "Sawbyte", "FiveCut", "Ascii-Media-Player", "my-room",
    "ink-game", "fivesawUtils", "Mimic-5", "5ivesaw.github.io",
)
DESCRIPTIONS = {
    "Sawbyte": "Rust Minecraft 26.3 client, desktop launcher, and bot engine.",
    "FiveCut": "Local-first video editor with a programmable editing API.",
    "Ascii-Media-Player": "Local audio player with live ASCII visualization.",
    "ink-game": "Playable 3D word and territory strategy game.",
    "fivesawUtils": "Pathfinding utilities for NeoScripts.",
    "5ivesaw.github.io": "Personal portal, browser tools, and interactive demos.",
}


def github_page(page):
    url = f"https://api.github.com/users/{USER}/repos?per_page=100&sort=pushed&page={page}"
    headers = {"User-Agent": "5ivesaw-site", "Accept": "application/vnd.github+json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=25) as response:
        return json.load(response)


def public_site(value):
    if not value:
        return ""
    value = value.strip()
    parsed = urllib.parse.urlparse(value)
    return value if parsed.scheme in ("http", "https") and parsed.netloc else ""


def pages_site(repo):
    """Only add a Pages URL when it actually serves a page."""
    if not repo.get("has_pages"):
        return ""
    name = repo["name"]
    url = f"https://{USER}.github.io/" if name == f"{USER}.github.io" else f"https://{USER}.github.io/{name}/"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "5ivesaw-site"}, method="HEAD")
        with urllib.request.urlopen(request, timeout=8) as response:
            if response.status == 200 and "text/html" in response.headers.get("Content-Type", ""):
                return url
    except Exception:
        pass
    return ""


def main():
    repositories = []
    page = 1
    while True:
        batch = github_page(page)
        if not isinstance(batch, list):
            raise RuntimeError("GitHub did not return a repository list")
        repositories.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    rows = []
    for repo in repositories:
        if repo.get("private"):
            continue
        name = repo["name"]
        description = DESCRIPTIONS.get(name, (repo.get("description") or "").strip())
        if name not in DESCRIPTIONS and len(description) < 20:
            description = ""
        if len(description) > 140:
            description = description[:140].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"
        rows.append({
            "name": name,
            "desc": description,
            "lang": "Rust + Java" if name == "Sawbyte" else (repo.get("language") or ""),
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "fork": repo.get("fork", False),
            "home": public_site(repo.get("homepage")) or pages_site(repo),
            "topics": repo.get("topics") or [],
            "pushed": repo.get("pushed_at"),
            "branch": repo.get("default_branch") or "main",
            "archived": repo.get("archived", False),
            "featured": name in FEATURED and not repo.get("archived", False),
        })

    catalog = {
        "user": USER,
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "repos": rows,
    }
    content = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    for target in (ROOT / "data/repos.json", ROOT / "docs/data/repos.json"):
        target.write_text(content, encoding="utf-8")
    print(f"{len(rows)} public repositories; {sum(row['featured'] for row in rows)} featured")


if __name__ == "__main__":
    main()
