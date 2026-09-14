// Blog interactions: nav state, reading progress, table-of-contents
// highlighting, category filters, and scroll reveals. Every page works
// without this file; it only adds polish.
(function () {
    const nav = document.getElementById('nav');
    const bar = document.getElementById('progress');
    const article = document.querySelector('.post');

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
            markToc();
            if (bar && article) {
                const r = article.getBoundingClientRect();
                const total = r.height - window.innerHeight;
                const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
                bar.style.transform = `scaleX(${p})`;
            }
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── table of contents: mark the section being read ──
    const tocLinks = [...document.querySelectorAll('.toc a')];
    const headings = tocLinks.map(a => document.getElementById(a.getAttribute('href').slice(1)));
    function markToc() {
        if (!tocLinks.length) return;
        // The current section is the last heading above the reading line.
        const line = window.innerHeight * 0.3;
        let current = 0;
        headings.forEach((h, i) => { if (h && h.getBoundingClientRect().top <= line) current = i; });
        tocLinks.forEach((a, i) => a.classList.toggle('is-current', i === current));
    }

    onScroll();

    // ── index: category filters (also driven by ?c= from article breadcrumbs) ──
    const filters = document.querySelector('.filters');
    const grid = document.getElementById('post-grid');
    if (filters && grid) {
        filters.hidden = false;
        const buttons = [...filters.querySelectorAll('.filter')];
        const items = [...grid.querySelectorAll('.card-item')];
        function apply(cat, push) {
            if (!buttons.some(b => b.dataset.filter === cat)) cat = 'all';
            buttons.forEach(b => {
                const on = b.dataset.filter === cat;
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-pressed', on);
            });
            items.forEach(li => { li.hidden = cat !== 'all' && li.dataset.cat !== cat; });
            grid.classList.toggle('is-filtered', cat !== 'all');
            if (push) {
                const url = new URL(location.href);
                if (cat === 'all') url.searchParams.delete('c'); else url.searchParams.set('c', cat);
                history.replaceState(null, '', url);
            }
        }
        buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter, true)));
        apply(new URLSearchParams(location.search).get('c') || 'all', false);
    }

    // ── reveals ──
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const revealObs = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
        }, { threshold: 0.12 });
        reveals.forEach(el => revealObs.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('in'));
    }

    // ── analytics: which posts send people to the contact form ──
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (!a || !window.gtag) return;
        const href = a.getAttribute('href');
        if (href === '/#contact' || href.startsWith('mailto:')) {
            gtag('event', 'blog_cta_click', { link_url: href, page_path: location.pathname });
        }
    });
})();
