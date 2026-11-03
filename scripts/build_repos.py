#!/usr/bin/env python3
"""Build docs/data/repos.json: public repos of 5ivesaw + icon/description scraped from each README."""
import json, os, re, urllib.request, datetime
USER = "5ivesaw"
TOKEN = os.environ.get("GITHUB_TOKEN")

def get(url, js=True):
    h = {"User-Agent": "5ivesaw-site", "Accept": "application/vnd.github+json"}
    if TOKEN and "api.github.com" in url: h["Authorization"] = f"Bearer {TOKEN}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=20) as r:
            b = r.read().decode("utf-8", "replace")
            return json.loads(b) if js else b
    except Exception:
        return None

NOISE = ("shields.io", "badge.fury", "travis-ci", "codecov", "/workflows/", "readme-typing-svg",
         "contrib.rocks", "star-history", "komarev", "github-readme-stats", "visitor")

def resolve(u, repo, br):
    u = u.strip().strip("'\"")
    if "github.com/" in u and "/blob/" in u:
        return u.replace("github.com/", "raw.githubusercontent.com/").replace("/blob/", "/")
    if u.startswith(("http://", "https://", "data:")): return u
    return f"https://raw.githubusercontent.com/{USER}/{repo}/{br}/{re.sub(r'^\.?/', '', u)}"

def parse(md, repo, br):
    cands = []
    for m in re.finditer(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)', md):
        cands.append((m.group(2), m.group(1), "", m.start()))
    for m in re.finditer(r'<img\b[^>]*?\bsrc=["\']([^"\']+)["\'][^>]*>', md, re.I):
        alt = re.search(r'\balt=["\']([^"\']*)', m.group(0), re.I)
        cands.append((m.group(1), alt.group(1) if alt else "", m.group(0), m.start()))
    cands = [c for c in cands if not any(n in (c[0] + c[1]).lower() for n in NOISE)]
    icon = None
    if len(cands) == 1:
        icon = cands[0][0]
    elif cands:
        best = -1e9
        for i, (u, alt, tag, pos) in enumerate(cands):
            hay = f"{u} {alt} {tag}".lower(); s = 0
            for kw in ("icon", "logo", "favicon", "avatar", "emblem", "brand", "mascot", repo.lower()):
                if kw in hay: s += 50
            w = re.search(r'\bwidth=["\']?(\d+)', tag)
            if w and 24 <= int(w.group(1)) <= 260: s += 35
            if pos < 500: s += 25
            if i == 0: s += 15
            if "skillicons" in hay or "simpleicons" in hay: s -= 40
            if s > best: best, icon = s, u
    desc = None
    text = re.sub(r"<!--.*?-->", "", md, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    for line in (l.strip() for l in text.splitlines()):
        if not line or line.startswith(("#", "!", "[!", "```", "|", "---", "<")): continue
        clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        clean = re.sub(r"[*_`~>]", "", clean).strip()
        if len(clean) >= 18: desc = clean[:160]; break
    return (resolve(icon, repo, br) if icon else None), desc

repos = get(f"https://api.github.com/users/{USER}/repos?per_page=100&sort=pushed") or []
out = []
for r in repos:
    if r.get("private"): continue
    br = r.get("default_branch") or "main"
    md = get(f"https://raw.githubusercontent.com/{USER}/{r['name']}/{br}/README.md", js=False) or ""
    icon, rdesc = parse(md, r["name"], br) if md else (None, None)
    out.append({
        "name": r["name"], "desc": r.get("description") or rdesc or "", "readme": rdesc or "",
        "lang": r.get("language") or "", "stars": r.get("stargazers_count", 0),
        "forks": r.get("forks_count", 0), "fork": r.get("fork", False),
        "home": r.get("homepage") or "", "topics": r.get("topics") or [],
        "pushed": r.get("pushed_at"), "created": r.get("created_at"), "branch": br, "icon": icon,
        "pages": r.get("has_pages", False), "archived": r.get("archived", False),
    })
json.dump({"user": USER, "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
           "repos": out}, open("docs/data/repos.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "repos;", sum(1 for x in out if x["icon"]), "icons")
