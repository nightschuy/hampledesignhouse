# Editorial Playbook: hampledesignhouse.com/blog

The standing brief for every post, human- or agent-written. The weekly pipeline reads this file
first. Edit it to steer the blog; changes apply from the next run.

## Why the blog exists
An organic demand-gen test: see which topics Hample Design House can rank for in Google and get
cited for in AI answers (ChatGPT, Perplexity, Google AI Overviews / AI Mode), and turn that
traffic into project inquiries at `/#contact` and `/ship/`.

## Who we write for
1. **Primary:** owners and operators of small, fast-growing businesses in South Florida
   (Miami-Dade, Broward, Palm Beach) who are tech-forward and data-driven, and either have no real
   web presence yet or have outgrown a template site.
2. **Secondary:** the same profile anywhere on the U.S. East or West Coast.
3. They want to save money and move faster by using AI, but they want someone accountable for the
   result. They are not developers or marketers.

## Positioning (never contradict the site)
- Hample Design House is an **AI-accelerated creative studio in Fort Lauderdale** serving Miami and
  South Florida, plus remote clients. Founder: **Schuyler Hample**, who does the work directly.
- Two core crafts: **web design and development**, and **brand identity**. Sites ship in about a
  week for a focused scope, at a flat price, SEO- and AI-search-ready, with tracking wired in.
- We write about AI, websites, lead generation, AI search, and AI marketing because that is where the
  buyer's decisions are being made. The CTA always ties back to a site/brand engagement or a
  conversation, never to a product we don't sell.

## Content pillars (rotate; don't run the same pillar three weeks in a row)
| Pillar | Category in build.mjs | Example angles |
|---|---|---|
| AI-powered websites | `AI & Web Design` | builders vs. studio, AI features worth adding, launching fast |
| Lead generation | `Lead Generation` | speed to lead, forms, landing pages, paid-traffic pages, tracking |
| AI for small business | `AI for Business` | what to automate, costs, tools news, what to keep human |
| AI search / SEO | `SEO & AI Search` | AI Overviews, ChatGPT search, Bing, schema, Google Business Profile |
| Pricing and process | `Pricing`, `Process` | real costs, timelines, how a build works |
| Trends | `Trends` | design and web trends, platform changes |
| Local South Florida | any of the above | industry-by-city angles: restaurants in Fort Lauderdale, clinics in Boca, startups in Miami |

## How to pick a topic each week
Score each candidate 1 to 5 on these and pick the top one or two:
1. **Timely:** news or a data point from the last 7 to 14 days (platform update, new study, local
   business news), or a seasonal hook (season opening, tax deadlines, holidays, hurricane season).
2. **Searchable:** phrased the way a buyer types it into Google or ChatGPT. Prefer long-tail,
   question-shaped queries with local or commercial intent over broad head terms.
3. **Winnable:** a small studio site can realistically rank. Avoid head terms dominated by
   Wix/Squarespace/HubSpot.
4. **On-pitch:** the honest answer naturally leads back to a better website, a brand, or a
   conversation with Schuyler.
5. **Not cannibalizing:** doesn't target the same primary keyword as an existing post. If it
   overlaps, link to that post and pick a different angle.

## Non-negotiable post format (the build enforces some of this)
- File: `_blog/posts/NN-slug.md`, NN = next number. Frontmatter: `title`, `slug`, `description`
  (under 155 chars), `keywords` (5 to 6, primary first), `category` (must exist in `CATEGORIES` in
  `build.mjs`), `date` (YYYY-MM-DD, the publish date), `author: "Schuyler Hample"`, `excerpt`.
- Title: 50 to 70 characters, contains the primary keyword or its natural phrasing. Slug: short,
  keyword-led, no dates.
- First paragraph after the H1 starts with `**Short answer:**` and answers the title question in
  60 to 90 words, self-contained, naming **Hample Design House**, a South Florida city, and the
  relevant service.
- H2s are questions phrased the way people search ("What does X cost?", "How long does X take?").
- At least one real `<table>`-able comparison or a numbered checklist. Real lists, not run-on text.
- Specifics over adjectives: numbers, ranges, dates, named places. Every statistic links to its
  primary source inline (outbound links open in a new tab automatically).
- Internal links: at least two to existing posts (`/blog/<slug>/`) plus `/#contact` in the
  sign-off. Link `/ship/` when the post is about getting a site live fast. Link the concept builds
  (`/concepts/ember-and-oak/`, `/concepts/driftline/`, `/concepts/form-and-field/`) when an example
  fits.
- Structure: `# Title` / short answer / body / `---` / `## FAQ` with 4 to 5 `**Question?**` + answer
  pairs (each answer 1 to 3 sentences, standalone) / `---` / one italic sign-off line with a CTA.
- Length: 1,200 to 1,800 words. Reading time shows automatically.

## Voice
- First person singular ("I build..."), Schuyler's voice: direct, confident, a little dry, zero
  agency fluff. Short sentences. Opinions with reasons.
- **No em dashes.** Use a period, comma, colon, or parentheses. (En dashes are fine in number
  ranges like 60–80.)
- No "in today's fast-paced digital landscape", no "unlock", "elevate", "game-changer", "delve",
  "leverage" (as a verb), "seamless", "robust". No emoji.
- Never invent clients, case studies, quotes, testimonials, or results. Use hypotheticals
  clearly framed as such ("a restaurant in Las Olas that...") or real, cited public examples.
- Don't trash competitors by name. Be fair to DIY builders; say when one is the better fit.
- Anything legal, tax, or compliance-related gets a one-line "not legal advice" note.

## SEO and AI-search checklist (run before opening the PR)
- [ ] Primary keyword in title, slug, description, short answer, and at least one H2.
- [ ] Short answer is liftable on its own and names business + city + service.
- [ ] Every number has an inline source link, and the source was actually opened and read.
- [ ] Two or more internal links to existing posts; no broken links.
- [ ] FAQ answers are standalone and don't repeat the H2 text verbatim.
- [ ] `node build.mjs --all` passes; share image renders cleanly (no cropping).
- [ ] Mobile render checked at 390px wide: no horizontal overflow.
- [ ] `grep -c "—"` on the post returns 0.

## Publishing mechanics
- Drafts arrive as one pull request per post on a `blog/<slug>` branch, containing only the
  markdown file and its share image (`blog/og/<slug>.png`). Generated HTML is not committed in PRs.
- **Approve = merge the PR.** On merge, the `Publish blog` GitHub Action rebuilds `/blog/`, RSS,
  and the sitemap, commits the output, triggers a Pages build, and pings IndexNow (Bing, which
  feeds ChatGPT search). Posts with a future `date` wait; the Action also runs daily at 6 a.m.
  Eastern and publishes anything whose date has arrived.
- **Request changes:** leave a PR review or comment. The next weekly run applies owner comments
  before drafting anything new, or ask Claude directly any time.
- **Reject:** close the PR. The topic goes back to the backlog marked `rejected`.
