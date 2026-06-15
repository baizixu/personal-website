// ===== Particle Network Background =====
const particleCanvas = document.getElementById('particle-canvas');

if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    const maxParticles = 90;
    const connectionDist = 130;
    const mouseRadius = 160;
    let mouseX = null;
    let mouseY = null;
    let animFrameId = null;
    let isRunning = true;

    function getCanvasParentSize() {
        const hero = document.getElementById('page-home');
        if (!hero) return { w: window.innerWidth, h: window.innerHeight };
        return { w: hero.offsetWidth, h: hero.offsetHeight };
    }

    function resize() {
        const { w, h } = getCanvasParentSize();
        if (particleCanvas.width !== w || particleCanvas.height !== h) {
            particleCanvas.width = w;
            particleCanvas.height = h;
        }
    }

    // Public resize for router
    window.resizeCanvas = resize;

    // Mouse tracking
    const heroSection = document.getElementById('page-home');
    if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
            const rect = particleCanvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        heroSection.addEventListener('mouseleave', () => {
            mouseX = null;
            mouseY = null;
        });
    }

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial) {
            const { w, h } = getCanvasParentSize();
            this.x = Math.random() * (w || window.innerWidth);
            this.y = initial ? Math.random() * (h || window.innerHeight) : -10;
            this.vx = (Math.random() - 0.5) * 0.7;
            this.vy = (Math.random() - 0.5) * 0.7;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            const { w, h } = getCanvasParentSize();
            this.x += this.vx;
            this.y += this.vy;

            // Mouse repulsion
            if (mouseX !== null && mouseY !== null) {
                const dx = this.x - mouseX;
                const dy = this.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseRadius && dist > 0) {
                    const force = (mouseRadius - dist) / mouseRadius;
                    this.x += (dx / dist) * force * 2;
                    this.y += (dy / dist) * force * 2;
                }
            }

            // Wrap
            if (w) {
                if (this.x < -20) this.x = w + 20;
                if (this.x > w + 20) this.x = -20;
            }
            if (h) {
                if (this.y < -20) this.y = h + 20;
                if (this.y > h + 20) this.y = -20;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(167, 139, 250, ${this.opacity})`;
            ctx.fill();
        }
    }

    // Init
    resize();
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectionDist) {
                    const opacity = (1 - dist / connectionDist) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(167, 139, 250, ${opacity})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        if (!isRunning) return;

        const { w, h } = getCanvasParentSize();
        if (w === 0 || h === 0) {
            animFrameId = requestAnimationFrame(animate);
            return;
        }

        ctx.clearRect(0, 0, w, h);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        connectParticles();
        animFrameId = requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Handle page visibility (pause when hidden to save CPU)
    window.addEventListener('resize', resize);

    // Observe home page visibility
    if (typeof MutationObserver !== 'undefined') {
        const homePage = document.getElementById('page-home');
        if (homePage) {
            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.attributeName === 'class') {
                        const isActive = homePage.classList.contains('active');
                        if (isActive) {
                            resize();
                            isRunning = true;
                            if (!animFrameId) animate();
                        } else {
                            isRunning = false;
                        }
                    }
                }
            });
            observer.observe(homePage, { attributes: true, attributeFilter: ['class'] });
        }
    }
}
