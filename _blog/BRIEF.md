# Build Brief — /blog for hampledesignhouse.com

Paste this into Claude Code alongside the five article files in this folder.

## Goal
Add a `/blog` section to hampledesignhouse.com that matches the existing site's design language
(cream `#F2F0EA` base, dark ink text, big editorial type, subtle motion, no template energy) and
is built to be both *ranked* by Google and *lifted* by AI answer engines.

## URL structure
```
/blog/                                        index — card grid, newest first
/blog/ai-website-builder-vs-designer/
/blog/website-cost-fort-lauderdale-miami/
/blog/get-cited-by-chatgpt-local-business/
/blog/web-design-trends-2027/
/blog/website-in-days-not-months/
```
Trailing slashes, static HTML output, no client-side routing for article pages.

## Each article page needs
- `<title>` and `<meta name="description">` from the file's frontmatter (descriptions are written to
  sit under 155 chars).
- Canonical URL, OG + Twitter card tags, `og:type: article`.
- **JSON-LD**: `BlogPosting` (headline, description, datePublished, dateModified, author →
  `Person: Schuyler Hample`, publisher → `Organization: Hample Design House`, image, mainEntityOfPage)
  **plus** `FAQPage` built from the FAQ block at the bottom of each article.
- The homepage should also carry `LocalBusiness` + `Organization` schema with `sameAs` pointing at
  Behance, schuy.xyz, Instagram, and the Google Business Profile once it exists.
- Author byline with a one-line bio and a link to `/#contact`. Real authorship is an E-E-A-T signal.
- Visible `Published` and `Last updated` dates that match `datePublished` / `dateModified`.
- Reading time, estimated at 225 wpm.
- Prev/next links between posts, plus a "Related" block using the internal links listed in each file.
- A closing CTA card reusing the site's contact styling: headline, one line, email link.

## Index page
- H1: `Notes on design, AI, and shipping fast.`
- Card grid, 2-up on desktop / 1-up on mobile, hover lift consistent with the Work section.
- Category pills: `AI & Web Design`, `Pricing`, `SEO & AI Search`, `Trends`, `Process`.
- RSS feed at `/blog/rss.xml` and add `/blog/` URLs to `sitemap.xml`.

## Non-negotiables for AI-search visibility
1. Every article answers its title question in the **first 60–80 words**, in one quotable,
   self-contained paragraph. Do not bury it under a narrative intro.
2. Keep the H2 questions exactly as written — they are phrased the way people type them into
   ChatGPT and Google.
3. Name the business, the city, and the service inside the answer blocks, not only in the footer.
4. Submit the site to Bing Webmaster Tools. ChatGPT Search reads Bing's index; without it, there is
   nothing to cite.
5. Ship clean semantic HTML (`article`, `h1`→`h2`→`h3`, real `<table>`s, real lists). Extractors lift
   structure, not divs.

## Internal linking map
All five posts link to `/#services` and `/#contact`. Post 1 → Post 2 and Post 5. Post 2 → Post 1 and
Post 5. Post 3 → Post 2 and Post 4. Post 4 → Post 3 and the `/concepts/` builds. Post 5 → Post 1 and
Post 2. Link the concept builds (`ember-and-oak`, `driftline`, `form-and-field`) wherever an example
is referenced.

## Publishing cadence
One per week, in the order numbered here. Backdate nothing.
