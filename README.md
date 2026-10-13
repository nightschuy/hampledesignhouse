# Hample Design House

Marketing site for **Hample Design House** — an AI-accelerated creative studio in
Fort Lauderdale serving Miami & South Florida. Web design, development, and brand identity.

Live: [hampledesignhouse.com](https://hampledesignhouse.com)

## Stack
- Single static `index.html` (no build step) — deployed via GitHub Pages; only `apps/driftline` has a build
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
- [Three.js](https://threejs.org/) + a custom GLSL shader for the realtime WebGL hero visual
- Inter (Google Fonts) + Helvetica for display/wordmark

## Concept builds (`#work`)
The Work section showcases three concept sites served from `concepts/`:
- `concepts/ember-and-oak/`, `concepts/form-and-field/`: plain static HTML, edit in place
- `concepts/driftline/`: **build output, don't hand-edit.** Source is the Vite + React + Tailwind
  project in `apps/driftline/` (`npm install && npm run build` there writes into `concepts/driftline/`)
- `concepts/previews/`: card screenshots (1440×1000 captures → AVIF 800/1440 + JPEG fallback).
  Recapture after a visual change to a concept:
  ```sh
  "$CHROME" --headless=new --hide-scrollbars --window-size=1440,1000 --virtual-time-budget=6000 \
    --screenshot=/tmp/driftline.png "http://localhost:4321/concepts/driftline/"
  sips -s format avif -s formatOptions 55 --resampleWidth 800 /tmp/driftline.png --out concepts/previews/driftline-800.avif
  sips -s format avif -s formatOptions 55 /tmp/driftline.png --out concepts/previews/driftline-1440.avif
  sips -s format jpeg -s formatOptions 72 --resampleWidth 800 /tmp/driftline.png --out concepts/previews/driftline-800.jpg
  ```
Each card's theme (palette + typeface it switches to on hover) lives in the `.build[data-theme=…]`
tokens in `index.html`.

## Blog (`/blog/`)
Posts are markdown in `_blog/posts/NN-slug.md` (frontmatter: title, slug, description, keywords,
category, date, excerpt, optional `updated`). The underscore folder keeps Jekyll from serving them.
```sh
cd _blog && npm install      # once
node build.mjs               # writes /blog/, /blog/rss.xml, /sitemap.xml, share images
node build.mjs --all         # local preview including future-dated posts
```
Posts dated after today (America/New_York) are skipped, so a scheduled post goes live on the first
build on or after its date. Bump `updated:` when you revise a post. `blog/blog.css` and `blog/blog.js`
are hand-written; everything else under `/blog/` is generated, so don't edit it directly.

### Weekly pipeline
- `_blog/EDITORIAL.md`: audience, positioning, voice, format and SEO/AI-search rules every post follows.
- `_blog/pipeline/backlog.md`: scored topic ideas plus a log of what was drafted and published. Star (`★`) an idea to force it next.
- A weekly scheduled Claude task researches the week's news, drafts one or two posts, and opens one PR per
  post (markdown + share image only). **Merging the PR is the approval.**
- `.github/workflows/publish-blog.yml` rebuilds `/blog/` on every merge to main and daily at ~6 a.m. Eastern
  (so future-dated posts go live on their date), triggers a Pages build, and pings IndexNow
  (key file: `40bbbee3817463dd1409a93ec3d1e783.txt` at the root).
- Share images on Linux: `CHROME=<headless chrome> OG_FONT="'TeX Gyre Heros',sans-serif" node build.mjs`.

## Assets
- `favicon.svg` — wordmark mark
- `og-image.png` — social share image (1200×630), generated from `og-image.html`
- `apple-touch-icon.png` — generated from `favicon.svg`
- `sitemap.xml`, `robots.txt` — SEO

### Regenerating the share image / icon
```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="og-image.png" "file://$PWD/og-image.html"
"$CHROME" --headless=new --force-device-scale-factor=1 --window-size=180,180 \
  --default-background-color=00000000 --screenshot="apple-touch-icon.png" "file://$PWD/favicon.svg"
```

## Local preview
```sh
python3 -m http.server 4321   # then open http://localhost:4321
```
