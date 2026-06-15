// ===== Page Router & Transition System =====
const router = {
    currentPage: 'home',
    pages: ['home', 'about', 'projects', 'contact'],
    isTransitioning: false,
    transitionDuration: 550,

    // Transition definitions: [exitAnim, enterAnim, useFlash, useStagger]
    // exit = old page leaving, enter = new page arriving
    transitions: {
        // Forward navigation (deeper)
        'home->about':       ['slide-left',  'slide-left',  false, false],
        'about->projects':   ['slide-left',  'slide-left',  false, false],
        'projects->contact': ['slide-left',  'slide-left',  false, false],
        // Backward navigation (shallower)
        'about->home':       ['slide-right', 'slide-right', false, false],
        'projects->about':   ['slide-right', 'slide-right', false, false],
        'contact->projects': ['slide-right', 'slide-right', false, false],
        // Jump forward (skip pages) → dramatic zoom
        'home->projects':    ['fade',  'zoom',  false, true],
        'home->contact':     ['fade',  'fade',  false, true],
        'about->contact':    ['slide-up', 'slide-up', false, true],
        // Jump backward
        'projects->home':    ['blur',  'blur',  false, true],
        'contact->home':     ['fade',  'slide-down', false, false],
        'contact->about':    ['slide-down', 'slide-down', false, true],
    },

    getTransition(from, to) {
        const key = `${from}->${to}`;
        return this.transitions[key] || this.defaultTransition(from, to);
    },

    defaultTransition(from, to) {
        const fromIdx = this.pages.indexOf(from);
        const toIdx = this.pages.indexOf(to);
        if (toIdx > fromIdx) return ['slide-left', 'slide-left', false, false];
        return ['slide-right', 'slide-right', false, false];
    },

    async navigateTo(targetPage) {
        if (this.isTransitioning || targetPage === this.currentPage) return;
        this.isTransitioning = true;

        const oldPage = this.currentPage;
        const [exitAnim, enterAnim, , useStagger] = this.getTransition(oldPage, targetPage);
        const oldEl = document.getElementById(`page-${oldPage}`);
        const newEl = document.getElementById(`page-${targetPage}`);

        if (!oldEl || !newEl) { this.isTransitioning = false; return; }

        // ---- Both pages animate simultaneously ----
        // Make both pages absolute so they overlap
        oldEl.classList.add('transitioning');
        newEl.classList.add('transitioning');

        // Old page exit
        oldEl.classList.add(`exit-${exitAnim}`);

        // New page entrance
        newEl.classList.add('active');
        if (useStagger) newEl.classList.add('enter-stagger');
        newEl.classList.add(`enter-${enterAnim}`);

        // Scroll top
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Wait for animation
        await sleep(this.transitionDuration);

        // ---- Phase 3: Cleanup ----
        oldEl.classList.remove('active', 'transitioning', `exit-${exitAnim}`);
        newEl.classList.remove('transitioning', `enter-${enterAnim}`, 'enter-stagger');

        // Re-trigger staggered children opacity (they got set to 1 by animation)
        if (useStagger) {
            const children = newEl.querySelectorAll('.page-content > *');
            children.forEach(c => { c.style.opacity = ''; c.style.animation = ''; });
        }

        this.currentPage = targetPage;
        this.updateNav(targetPage);
        this.updateHash(targetPage);
        this.isTransitioning = false;

        this.onPageEnter(targetPage);
    },

    updateNav(activePage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === activePage);
        });
    },

    updateHash(page) {
        if (window.location.hash !== `#${page}`) {
            history.pushState(null, '', `#${page}`);
        }
    },

    onPageEnter(page) {
        if (page === 'about') {
            setTimeout(() => {
                document.querySelectorAll('#page-about .skill-progress').forEach(bar => {
                    bar.style.width = bar.getAttribute('data-width');
                });
            }, 350);
        }
        if (page === 'home' && typeof resizeCanvas === 'function') {
            setTimeout(resizeCanvas, 150);
        }
    }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== Navigation Click Handlers =====
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigateTo(link.getAttribute('data-page'));
    });
});

document.addEventListener('click', (e) => {
    const navLink = e.target.closest('[data-nav]');
    if (navLink) {
        e.preventDefault();
        const href = navLink.getAttribute('href');
        if (href && href.startsWith('#')) {
            router.navigateTo(href.slice(1));
        }
    }
});

// ===== Browser back/forward =====
window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && router.pages.includes(hash)) {
        router.navigateTo(hash);
    }
});

// ===== Init =====
(function init() {
    const hash = window.location.hash.replace('#', '');
    const startPage = (hash && router.pages.includes(hash)) ? hash : 'home';
    const startEl = document.getElementById(`page-${startPage}`);
    if (startEl) {
        startEl.classList.add('active');
    }
    router.currentPage = startPage;
    router.updateNav(startPage);
    if (!hash) {
        history.replaceState(null, '', '#home');
    }
    // Load dynamic content from API
    loadDynamicContent();
})();

// ===== Dynamic Content Loader =====
async function loadDynamicContent() {
    try {
        const res = await fetch('/api/content');
        const data = await res.json();

        // Hero
        if (data.hero) {
            const h = data.hero;
            if (h.name) {
                const el = document.getElementById('hero-name-text');
                if (el) el.textContent = h.name;
            }
            if (h.subtitle) {
                const el = document.querySelector('.hero-subtitle');
                if (el) el.textContent = h.subtitle;
            }
            if (h.phrases && h.phrases.length > 0) {
                // Update typing phrases
                window._typingPhrases = h.phrases;
                const el = document.getElementById('typing-text');
                if (el) el.textContent = h.phrases[0];
            }
        }

        // About
        if (data.about) {
            const a = data.about;
            const paras = document.querySelectorAll('#page-about .about-text-block p');
            if (a.p1 && paras[0]) paras[0].textContent = a.p1;
            if (a.p2 && paras[1]) paras[1].textContent = a.p2;
            if (a.p3 && paras[2]) paras[2].textContent = a.p3;
        }

        // Contact
        if (data.contact) {
            const c = data.contact;
            const fields = ['email', 'phone', 'location', 'qq', 'github'];
            const items = document.querySelectorAll('#page-contact .contact-item');
            items.forEach(item => {
                const label = item.querySelector('.contact-label');
                if (!label) return;
                const labelText = label.textContent.trim();
                const valueDiv = item.querySelector('.contact-label + div');
                if (!valueDiv) return;
                for (const f of fields) {
                    const map = { '邮箱': 'email', '电话': 'phone', '所在地': 'location', 'QQ': 'qq', 'GitHub': 'github' };
                    const key = map[labelText];
                    if (key && c[key]) valueDiv.textContent = c[key];
                }
            });
        }
    } catch (e) {
        // Silently use hardcoded defaults
    }
}

// ===== Navbar Scroll =====
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

// ===== Mobile Menu =====
const menuBtn = document.querySelector('.mobile-menu-btn');
const navLinksEl = document.querySelector('.nav-links');
if (menuBtn && navLinksEl) {
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinksEl.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            navLinksEl.classList.remove('active');
        });
    });
}

// ===== Typing Effect =====
(function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;

    const defaultPhrases = ['网络空间安全专业', 'Python / C++ 开发者', '日语 & 英语双语', '技术探索者', '网络安全爱好者'];

    function getPhrases() {
        return (window._typingPhrases && window._typingPhrases.length > 0)
            ? window._typingPhrases : defaultPhrases;
    }

    let pi = 0, ci = 0, del = false;

    function loop() {
        const phrases = getPhrases();
        const cur = phrases[pi];
        el.textContent = cur.substring(0, del ? ci - 1 : ci + 1);
        ci += del ? -1 : 1;
        let delay = del ? 50 : 120;
        if (!del && ci === cur.length) { delay = 2000; del = true; }
        else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; delay = 300; }
        setTimeout(loop, delay);
    }
    loop();
})();

// ===== Project Filter =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.getAttribute('data-filter');
        document.querySelectorAll('#page-projects .project-card').forEach(card => {
            card.classList.toggle('hidden', f !== 'all' && card.getAttribute('data-category') !== f);
        });
    });
});

// ===== Contact Form =====
(function initForm() {
    const form = document.getElementById('contact-form-el');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const txt = btn.querySelector('.btn-text');
        const ld = btn.querySelector('.btn-loading');
        txt.style.display = 'none';
        ld.style.display = 'inline';

        const name = document.getElementById('cf-name').value;
        const email = document.getElementById('cf-email').value;
        const message = document.getElementById('cf-message').value;

        try {
            const body = new URLSearchParams();
            body.append('name', name);
            body.append('email', email);
            body.append('message', message);

            const res = await fetch('/api/messages', { method: 'POST', body });
            if (res.ok) {
                alert('留言已发送，感谢！');
                form.reset();
            } else {
                alert('发送失败，请稍后再试');
            }
        } catch (err) {
            alert('网络错误，请稍后再试');
        }

        txt.style.display = 'inline';
        ld.style.display = 'none';
    });
})();

// ===== Game Tab Switching (Projects page) =====
(function initGameTabs() {
    const tabs = document.querySelectorAll('.game-tab-btn');
    const panes = document.querySelectorAll('.game-pane');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-gtab');
            panes.forEach(p => p.classList.remove('active'));
            const pane = document.getElementById('gpane-' + target);
            if (pane) pane.classList.add('active');
        });
    });
})();
