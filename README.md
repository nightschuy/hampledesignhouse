# Hample Design House

Marketing site for **Hample Design House** — an AI-accelerated creative studio in
Fort Lauderdale serving Miami & South Florida. Web design, development, and brand identity.

Live: [hampledesignhouse.com](https://hampledesignhouse.com)

## Stack
- Single static `index.html` (no build step) — deployed via GitHub Pages
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
- [Three.js](https://threejs.org/) + a custom GLSL shader for the realtime WebGL hero visual
- Inter (Google Fonts) + Helvetica for display/wordmark

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
