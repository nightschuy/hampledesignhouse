// Blog generator for hampledesignhouse.com.
//
// The site itself has no build step, so posts are written as markdown in
// _blog/posts/ and this script writes plain static HTML into /blog/ (plus
// /blog/rss.xml and /sitemap.xml). The underscore folder matters: GitHub
// Pages runs Jekyll, which skips _dirs, so the raw markdown never gets served.
//
//   node build.mjs          publish posts dated today or earlier (America/New_York)
//   node build.mjs --all    include future-dated posts too (local preview only)
//   node build.mjs --og     force-regenerate the share images
//
// Post filenames are NN-slug.md; NN is the publishing order.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(import.meta.dirname, 'posts');
const OUT = path.join(ROOT, 'blog');
const SITE = 'https://hampledesignhouse.com';
const EMAIL = 'schuyler@hampledesignhouse.com';
const GA_ID = 'G-WMPZ5W3LMJ';
const WPM = 225;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const args = new Set(process.argv.slice(2));
const TODAY = process.env.BLOG_TODAY || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// Category pills, in the order the index shows them.
const CATEGORIES = ['AI & Web Design', 'Pricing', 'SEO & AI Search', 'Trends', 'Process'];

const AUTHOR = {
    '@type': 'Person',
    name: 'Schuyler Hample',
    jobTitle: 'Founder & Creative Director',
    url: `${SITE}/`,
    sameAs: ['https://www.behance.net/schuy', 'https://schuy.xyz'],
};
const PUBLISHER = {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'Hample Design House',
    url: `${SITE}/`,
    sameAs: ['https://www.instagram.com/hamplehouse/', 'https://www.behance.net/schuy', 'https://schuy.xyz'],
    logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png`, width: 180, height: 180 },
};

const CONCEPTS = [
    { slug: 'ember-and-oak', name: 'Ember &amp; Oak', kind: 'Restaurant' },
    { slug: 'driftline', name: 'Driftline', kind: 'SaaS product' },
    { slug: 'form-and-field', name: 'Form &amp; Field', kind: 'Architecture studio' },
];

// ─── helpers ──────────────────────────────────────────────

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = s => s.replace(/<[^>]+>/g, '');
const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const slugify = s => decode(stripTags(s)).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
const catSlug = c => slugify(c.replace('&', 'and'));
const plainMd = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
// Keep "</script>" and friends from ever closing the JSON-LD block early.
const jsonld = obj => `<script type="application/ld+json">${JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')}</script>`;
const iso = d => `${d}T09:00:00-04:00`;
const longDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shortDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const rfc822 = d => new Date(iso(d)).toUTCString();
const write = (file, body) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };

function parseFrontmatter(src, file) {
    const m = src.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error(`${file}: missing frontmatter`);
    const data = {};
    for (const line of m[1].split('\n')) {
        const i = line.indexOf(':');
        if (i < 0) continue;
        let v = line.slice(i + 1).trim();
        if (v.startsWith('"') || v.startsWith('[')) v = JSON.parse(v);
        data[line.slice(0, i).trim()] = v;
    }
    for (const k of ['title', 'slug', 'description', 'category', 'date', 'excerpt']) {
        if (!data[k]) throw new Error(`${file}: frontmatter is missing "${k}"`);
    }
    if (!CATEGORIES.includes(data.category)) throw new Error(`${file}: unknown category "${data.category}"`);
    return { data, body: m[2] };
}

// ─── load posts ───────────────────────────────────────────

const marked = new Marked({ gfm: true });

function loadPost(file) {
    const order = parseInt(file, 10);
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'), file);

    // Files are: # Title / body / --- / ## FAQ / --- / sign-off line.
    const sections = body.replace(/^\s*# .+\n/, '').split(/^---\s*$/m).map(s => s.trim());
    const faqIndex = sections.findIndex(s => /^## FAQ\b/.test(s));
    if (faqIndex < 1) throw new Error(`${file}: expected a "## FAQ" section after a --- rule`);
    const mainMd = sections.slice(0, faqIndex).join('\n\n');
    const faqMd = sections[faqIndex].replace(/^## FAQ\s*/, '');
    const signoffMd = sections.slice(faqIndex + 1).join('\n\n');

    const faqs = [...faqMd.matchAll(/\*\*(.+?)\*\*\n([\s\S]+?)(?=\n\s*\n|$)/g)].map(m => ({ q: m[1].trim(), a: m[2].trim() }));
    if (!faqs.length) throw new Error(`${file}: FAQ section has no **Question** / answer pairs`);

    // Heading ids + table of contents, then the extraction-friendly tweaks.
    const toc = [];
    const seen = new Set();
    let html = marked.parse(mainMd).replace(/<h([23])>(.*?)<\/h\1>/g, (_, depth, inner) => {
        let id = slugify(inner);
        while (seen.has(id)) id += '-2';
        seen.add(id);
        if (depth === '2') toc.push({ id, label: stripTags(inner) });
        return `<h${depth} id="${id}">${inner}</h${depth}>`;
    });
    html = html
        // The label sits on its own line in the answer card, so the sentence after it needs a capital.
        .replace(/^<p><strong>Short answer:<\/strong>\s*(\S)/, (_, c) => `<p class="answer"><strong>Short answer:</strong> ${c.toUpperCase()}`)
        .replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table>')
        .replace(/<\/table>/g, '</table></div>');
    toc.push({ id: 'faq', label: 'FAQ' });

    const words = plainMd(`${mainMd} ${faqMd}`).split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
    const links = [...new Set([...body.matchAll(/\]\((\/blog\/[a-z0-9-]+\/)\)/g)].map(m => m[1].split('/')[2]))]
        .filter(s => s !== data.slug);

    return {
        ...data,
        order,
        updated: data.updated || data.date,
        keywords: data.keywords || [],
        html,
        faqs,
        signoff: marked.parse(signoffMd),
        toc,
        words,
        minutes: Math.max(1, Math.ceil(words / WPM)),
        links,
        showsConcepts: /\/#work|\/concepts\//.test(body),
        url: `${SITE}/blog/${data.slug}/`,
        og: `${SITE}/blog/og/${data.slug}.png`,
    };
}

const all = fs.readdirSync(POSTS_DIR).filter(f => /^\d+-.+\.md$/.test(f)).sort().map(loadPost);
const slugs = new Set();
for (const p of all) {
    if (slugs.has(p.slug)) throw new Error(`duplicate slug ${p.slug}`);
    slugs.add(p.slug);
}
const includeFuture = args.has('--all');
const live = all.filter(p => includeFuture || p.date <= TODAY);
// Reading order is publishing order; the index shows newest first.
const chrono = [...live].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
// Same-day posts keep their numbered order on the index, so the lead post stays on top.
const newest = [...live].sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
const bySlug = Object.fromEntries(live.map(p => [p.slug, p]));

// ─── shared chrome ────────────────────────────────────────

function head({ title, description, canonical, image, type = 'website', keywords = [], extra = '' }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
${keywords.length ? `    <meta name="keywords" content="${esc(keywords.join(', '))}">\n` : ''}    <meta name="author" content="Schuyler Hample, Hample Design House">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="theme-color" content="#F2F0EA">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" type="application/rss+xml" title="Hample Design House: Notes" href="${SITE}/blog/rss.xml">

    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="Hample Design House">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="en_US">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">
${extra}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/blog/blog.css">
    <script>document.documentElement.classList.add('js');</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
    </script>`;
}

const nav = () => `
    <a class="skip" href="#main">Skip to content</a>
    <nav id="nav">
        <div class="nav-inner">
            <a href="/" class="nav-logo">HAMPLE<span class="dot">.</span></a>
            <div class="nav-links">
                <a href="/#services">Services</a>
                <a href="/#approach">Approach</a>
                <a href="/#work">Work</a>
                <a href="/blog/" class="active">Blog</a>
                <a href="/#faq">FAQ</a>
                <a href="/#contact">Contact</a>
            </div>
            <a href="/#contact" class="nav-cta">Start a Project</a>
        </div>
    </nav>`;

const footer = () => `
    <footer>
        <div class="wrap footer-inner">
            <a href="/" class="footer-logo">HAMPLE DESIGN HOUSE<span class="dot">.</span></a>
            <div class="footer-meta">© 2026 Hample Design House · Fort Lauderdale, FL</div>
            <div class="footer-links">
                <a href="/blog/">Blog</a>
                <a href="/blog/rss.xml">RSS</a>
                <a href="mailto:${EMAIL}">Email</a>
                <a href="https://www.instagram.com/hamplehouse/" target="_blank" rel="noopener">Instagram</a>
                <a href="https://www.behance.net/schuy" target="_blank" rel="noopener">Behance</a>
                <a href="https://schuy.xyz" target="_blank" rel="noopener">Schuy.xyz</a>
            </div>
        </div>
    </footer>
    <script src="/blog/blog.js" defer></script>
</body>
</html>
`;

function card(p, { featured = false, headingTag = 'h2' } = {}) {
    return `<li class="card-item${featured ? ' is-featured' : ''}" data-cat="${catSlug(p.category)}">
                    <a class="post-card" href="/blog/${p.slug}/">
                        <div class="card-top">
                            <span class="pill">${esc(p.category)}</span>
                            ${featured ? '<span class="card-flag">Latest</span>' : ''}
                        </div>
                        <${headingTag} class="card-title">${esc(p.title)}</${headingTag}>
                        <p class="card-excerpt">${esc(featured ? p.description : p.excerpt)}</p>
                        <div class="card-foot">
                            <span><time datetime="${p.date}">${shortDate(p.date)}</time> · ${p.minutes} min read</span>
                            <span class="card-go" aria-hidden="true">↗</span>
                        </div>
                    </a>
                </li>`;
}

// ─── article page ─────────────────────────────────────────

function articlePage(p) {
    const i = chrono.indexOf(p);
    const prev = chrono[i - 1];
    const next = chrono[i + 1];
    const related = p.links.map(s => bySlug[s]).filter(Boolean);

    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BlogPosting',
                '@id': `${p.url}#article`,
                headline: p.title,
                description: p.description,
                datePublished: iso(p.date),
                dateModified: iso(p.updated),
                author: AUTHOR,
                publisher: PUBLISHER,
                image: { '@type': 'ImageObject', url: p.og, width: 1200, height: 630 },
                mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
                url: p.url,
                articleSection: p.category,
                keywords: p.keywords.join(', '),
                wordCount: p.words,
                inLanguage: 'en-US',
                isPartOf: { '@type': 'Blog', '@id': `${SITE}/blog/#blog` },
            },
            {
                '@type': 'FAQPage',
                '@id': `${p.url}#faq`,
                mainEntity: p.faqs.map(f => ({
                    '@type': 'Question',
                    name: plainMd(f.q),
                    acceptedAnswer: { '@type': 'Answer', text: plainMd(f.a) },
                })),
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
                    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
                    { '@type': 'ListItem', position: 3, name: p.title, item: p.url },
                ],
            },
        ],
    };

    const extra = [
        `    <meta property="article:published_time" content="${iso(p.date)}">`,
        `    <meta property="article:modified_time" content="${iso(p.updated)}">`,
        `    <meta property="article:author" content="Schuyler Hample">`,
        `    <meta property="article:section" content="${esc(p.category)}">`,
        `    ${jsonld(schema)}`,
    ].join('\n');

    const concepts = p.showsConcepts ? `
        <section class="concepts wrap-post" aria-labelledby="concepts-h">
            <div class="section-label"><h2 id="concepts-h" class="eyebrow">The builds mentioned above</h2></div>
            <ul class="concept-row">
                ${CONCEPTS.map(c => `<li><a class="concept" href="/concepts/${c.slug}/">
                    <picture>
                        <source type="image/avif" srcset="/concepts/previews/${c.slug}-800.avif">
                        <img src="/concepts/previews/${c.slug}-800.jpg" alt="" width="800" height="556" loading="lazy" decoding="async">
                    </picture>
                    <span class="concept-name">${c.name}</span>
                    <span class="concept-kind">${c.kind}</span>
                </a></li>`).join('\n                ')}
            </ul>
        </section>` : '';

    const relatedBlock = related.length ? `
        <section class="related wrap-post" aria-labelledby="related-h">
            <div class="section-label"><h2 id="related-h" class="eyebrow">Related reading</h2></div>
            <ul class="post-grid is-compact">
                ${related.map(r => card(r, { headingTag: 'h3' })).join('\n                ')}
            </ul>
        </section>` : '';

    const pager = (prev || next) ? `
        <nav class="pager wrap-post" aria-label="More posts">
            ${prev ? `<a class="pager-link" href="/blog/${prev.slug}/" rel="prev"><span class="pager-dir">← Previous</span><span class="pager-title">${esc(prev.title)}</span></a>` : '<span></span>'}
            ${next ? `<a class="pager-link is-next" href="/blog/${next.slug}/" rel="next"><span class="pager-dir">Next →</span><span class="pager-title">${esc(next.title)}</span></a>` : '<span></span>'}
        </nav>` : '';

    return `${head({
        title: `${p.title} | Hample Design House`,
        description: p.description,
        canonical: p.url,
        image: p.og,
        type: 'article',
        keywords: p.keywords,
        extra,
    })}
</head>
<body class="is-article">
    <div class="progress" aria-hidden="true"><span id="progress"></span></div>${nav()}

    <main id="main">
        <article class="post">
            <header class="post-head wrap-post">
                <nav class="crumbs" aria-label="Breadcrumb">
                    <a href="/blog/">Blog</a><span aria-hidden="true">/</span><a href="/blog/?c=${catSlug(p.category)}">${esc(p.category)}</a>
                </nav>
                <h1 class="post-title display">${esc(p.title)}</h1>
                <p class="post-dek">${esc(p.excerpt)}</p>
                <div class="post-meta">
                    <a class="byline" href="#author">
                        <span class="avatar" aria-hidden="true">SH</span>
                        <span><span class="byline-name">Schuyler Hample</span><span class="byline-role">Founder, Hample Design House</span></span>
                    </a>
                    <dl class="meta-list">
                        <div><dt>Published</dt><dd><time datetime="${p.date}">${longDate(p.date)}</time></dd></div>
                        <div><dt>Last updated</dt><dd><time datetime="${p.updated}">${longDate(p.updated)}</time></dd></div>
                        <div><dt>Reading time</dt><dd>${p.minutes} min</dd></div>
                    </dl>
                </div>
            </header>

            <div class="post-layout wrap-post">
                <aside class="toc" aria-label="On this page">
                    <p class="toc-label">On this page</p>
                    <ol>
                        ${p.toc.map(t => `<li><a href="#${t.id}">${t.label}</a></li>`).join('\n                        ')}
                    </ol>
                </aside>

                <div class="prose">
${p.html}
                    <section class="post-faq" aria-labelledby="faq">
                        <h2 id="faq">FAQ</h2>
                        ${p.faqs.map(f => `<div class="faq-entry">
                            <h3>${marked.parseInline(f.q)}</h3>
                            <p>${marked.parseInline(f.a)}</p>
                        </div>`).join('\n                        ')}
                    </section>

                    <div class="signoff">${p.signoff}</div>

                    <aside id="author" class="author-card" aria-label="About the author">
                        <span class="avatar is-lg" aria-hidden="true">SH</span>
                        <div>
                            <p class="author-name">Written by Schuyler Hample</p>
                            <p class="author-bio">Founder and creative director of Hample Design House, an AI-accelerated web and brand studio in Fort Lauderdale. Designs by day, renders in Blender by night. <a href="/#contact">Work with me →</a></p>
                        </div>
                    </aside>
                </div>
            </div>
        </article>

        <section class="cta-card wrap-post" aria-labelledby="cta-h">
            <div class="cta-inner reveal">
                <div>
                    <div class="eyebrow">Let's build something</div>
                    <h2 id="cta-h" class="cta-title display">Make it look<br><span class="accent">expensive.</span></h2>
                </div>
                <div class="cta-side">
                    <p>Tell me what you're building. You'll get scope, a fixed timeline, and a flat price, usually within a day.</p>
                    <div class="cta-actions">
                        <a href="/#contact" class="btn btn-fill">Start a Project <span class="arr">↗</span></a>
                        <a href="/#services" class="btn btn-line">See Services</a>
                    </div>
                    <a class="cta-mail" href="mailto:${EMAIL}">${EMAIL}</a>
                </div>
            </div>
        </section>
${concepts}${relatedBlock}${pager}
    </main>
${footer()}`;
}

// ─── index page ───────────────────────────────────────────

function indexPage() {
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, live.filter(p => p.category === c).length]));
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Blog',
                '@id': `${SITE}/blog/#blog`,
                name: 'Hample Design House: Notes',
                description: 'Notes on design, AI, and shipping fast, from an AI-accelerated web and brand studio in Fort Lauderdale.',
                url: `${SITE}/blog/`,
                inLanguage: 'en-US',
                publisher: PUBLISHER,
                blogPost: newest.map(p => ({
                    '@type': 'BlogPosting',
                    '@id': `${p.url}#article`,
                    headline: p.title,
                    url: p.url,
                    datePublished: iso(p.date),
                    dateModified: iso(p.updated),
                    author: { '@type': 'Person', name: AUTHOR.name },
                })),
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
                    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
                ],
            },
        ],
    };

    const list = newest.length
        ? newest.map((p, n) => card(p, { featured: n === 0 })).join('\n                ')
        : '';

    return `${head({
        title: 'Blog: Notes on Design, AI & Shipping Fast | Hample Design House',
        description: 'Straight answers on web design, pricing, AI search, and process from Hample Design House, an AI-accelerated studio in Fort Lauderdale & Miami.',
        canonical: `${SITE}/blog/`,
        image: `${SITE}/blog/og/index.png`,
        extra: `    ${jsonld(schema)}`,
    })}
</head>
<body class="is-index">${nav()}

    <main id="main">
        <header class="blog-head wrap">
            <div class="eyebrow">The Blog</div>
            <div class="blog-head-grid">
                <h1 class="blog-title display">Notes on design, AI, and <span class="accent">shipping fast.</span></h1>
                <p class="blog-intro">Straight answers to the questions clients actually ask: what a site should cost in South Florida, when AI is enough, and how to get found now that people ask ChatGPT first.</p>
            </div>
            <div class="filters" role="group" aria-label="Filter by category" hidden>
                <button type="button" class="filter is-on" data-filter="all" aria-pressed="true">All <span>${live.length}</span></button>
                ${CATEGORIES.filter(c => counts[c]).map(c => `<button type="button" class="filter" data-filter="${catSlug(c)}" aria-pressed="false">${esc(c)} <span>${counts[c]}</span></button>`).join('\n                ')}
            </div>
        </header>

        <section class="wrap" aria-label="Posts">
            ${list ? `<ul class="post-grid" id="post-grid">
                ${list}
            </ul>` : `<div class="empty"><p class="eyebrow">First post lands soon</p><p>Notes on design, AI, and shipping fast are on the way. <a href="/blog/rss.xml">Subscribe via RSS</a> or <a href="/#contact">start a project</a> in the meantime.</p></div>`}
            <p class="blog-foot">New notes roughly weekly. <a href="/blog/rss.xml">Subscribe via RSS</a></p>
        </section>
    </main>
${footer()}`;
}

// ─── feeds ────────────────────────────────────────────────

function rss() {
    const built = newest[0] ? rfc822(newest[0].updated) : new Date(`${TODAY}T12:00:00Z`).toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Hample Design House: Notes</title>
        <link>${SITE}/blog/</link>
        <description>Notes on design, AI, and shipping fast, from an AI-accelerated web and brand studio in Fort Lauderdale.</description>
        <language>en-us</language>
        <lastBuildDate>${built}</lastBuildDate>
        <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${newest.map(p => `        <item>
            <title>${esc(p.title)}</title>
            <link>${p.url}</link>
            <guid isPermaLink="true">${p.url}</guid>
            <pubDate>${rfc822(p.date)}</pubDate>
            <category>${esc(p.category)}</category>
            <description>${esc(p.description)}</description>
        </item>`).join('\n')}
    </channel>
</rss>
`;
}

function sitemap() {
    const url = (loc, lastmod, changefreq, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    // Keep the non-blog lastmods from the existing file so a blog build doesn't touch them.
    const existing = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') : '';
    const kept = loc => (existing.match(new RegExp(`<loc>${loc.replace(/[.?]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)`)) || [])[1] || TODAY;
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
        url(`${SITE}/`, kept(`${SITE}/`), 'monthly', '1.0'),
        url(`${SITE}/blog/`, newest[0] ? newest[0].updated : kept(`${SITE}/blog/`), 'weekly', '0.8'),
        ...newest.map(p => url(p.url, p.updated, 'monthly', '0.7')),
        ...CONCEPTS.map(c => url(`${SITE}/concepts/${c.slug}/`, kept(`${SITE}/concepts/${c.slug}/`), 'yearly', '0.6')),
    ].join('\n')}
</urlset>
`;
}

// ─── share images ─────────────────────────────────────────

function ogHtml({ eyebrow, title }) {
    const size = title.length > 70 ? 66 : title.length > 50 ? 76 : 88;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F2F0EA;color:#111317;position:relative}
.glow{position:absolute;width:760px;height:760px;right:-260px;bottom:-380px;background:radial-gradient(circle,rgba(36,56,255,.16),transparent 62%);border-radius:50%}
.frame{position:absolute;inset:40px;border:1px solid rgba(17,19,23,.14);border-radius:26px}
.pad{position:absolute;inset:40px;padding:62px 76px;display:flex;flex-direction:column;justify-content:space-between}
.top,.bottom{display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:700;font-size:26px;letter-spacing:-.02em}.d{color:#2438FF}
.tag{font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#5C5F69;border:1px solid rgba(17,19,23,.16);border-radius:100px;padding:9px 18px}
h1{font-weight:700;font-size:${size}px;line-height:1;letter-spacing:-.035em;max-width:980px}
.by{font-weight:700;font-size:17px;letter-spacing:.06em;text-transform:uppercase;color:#5C5F69}
.url{font-weight:700;font-size:18px;letter-spacing:.03em}
</style></head><body><div class="glow"></div><div class="frame"></div><div class="pad">
<div class="top"><div class="logo">HAMPLE DESIGN HOUSE<span class="d">.</span></div><div class="tag">${esc(eyebrow)}</div></div>
<h1>${title}</h1>
<div class="bottom"><div class="by">Schuyler Hample · Fort Lauderdale × Miami</div><div class="url">hampledesignhouse.com/blog</div></div>
</div></body></html>`;
}

function renderOg(name, spec) {
    const target = path.join(OUT, 'og', `${name}.png`);
    if (fs.existsSync(target) && !args.has('--og')) return;
    if (!fs.existsSync(CHROME)) {
        console.warn(`! skipped share image ${name}.png (no Chrome at ${CHROME})`);
        return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = path.join(os.tmpdir(), `hdh-og-${name}.html`);
    fs.writeFileSync(tmp, ogHtml(spec));
    execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=1200,630', `--screenshot=${target}`, `file://${tmp}`], { stdio: 'ignore' });
    fs.rmSync(tmp);
}

// ─── write ────────────────────────────────────────────────

// Remove pages for posts that are no longer live (renamed slug, or unpublished).
for (const entry of fs.existsSync(OUT) ? fs.readdirSync(OUT, { withFileTypes: true }) : []) {
    if (entry.isDirectory() && entry.name !== 'og' && !bySlug[entry.name]) {
        fs.rmSync(path.join(OUT, entry.name), { recursive: true });
    }
}
for (const p of live) write(path.join(OUT, p.slug, 'index.html'), articlePage(p));
write(path.join(OUT, 'index.html'), indexPage());
write(path.join(OUT, 'rss.xml'), rss());
write(path.join(ROOT, 'sitemap.xml'), sitemap());

// Share images are made for every post, scheduled ones included, so a CI
// publish never needs a browser.
renderOg('index', { eyebrow: 'The Blog', title: 'Notes on design, AI, and <span class="d">shipping fast.</span>' });
for (const p of all) renderOg(p.slug, { eyebrow: p.category, title: esc(p.title) });

const scheduled = all.filter(p => !live.includes(p));
console.log(`built ${live.length} post${live.length === 1 ? '' : 's'} (today ${TODAY}${includeFuture ? ', --all' : ''})`);
for (const p of chrono) console.log(`  ✓ ${p.date}  ${p.slug}  ${p.minutes} min, ${p.faqs.length} FAQs`);
for (const p of scheduled) console.log(`  … ${p.date}  ${p.slug}  (scheduled)`);
