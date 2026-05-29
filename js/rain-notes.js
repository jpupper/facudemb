/**
 * Rain Notes Background
 * Falling music notes with particles on click, pure black bg
 */
(function() {
    'use strict';

    const canvas = document.getElementById('rain-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H;

    const MUSIC_SYMBOLS = ['♩', '♪', '♫', '♬', '𝄞', '♭', '♯'];

    // Mouse interaction
    let mouseX = -9999;
    let mouseY = -9999;
    let mouseDown = false;

    // Rain drops (notes)
    const drops = [];
    const DROP_COUNT = 45;

    // Sparkle particles (only on mouse press)
    const sparkles = [];

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);

    // Mouse tracking
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mousedown', function() {
        mouseDown = true;
    });

    document.addEventListener('mouseup', function() {
        mouseDown = false;
    });

    // Touch support
    document.addEventListener('touchstart', function(e) {
        const t = e.touches[0];
        if (t) {
            mouseX = t.clientX;
            mouseY = t.clientY;
            mouseDown = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        const t = e.touches[0];
        if (t) {
            mouseX = t.clientX;
            mouseY = t.clientY;
        }
    }, { passive: true });

    document.addEventListener('touchend', function() {
        mouseDown = false;
        mouseX = -9999;
        mouseY = -9999;
    });

    class NoteDrop {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * W;
            this.y = -30 - Math.random() * 100;
            this.size = 14 + Math.random() * 18;
            this.speed = 0.8 + Math.random() * 1.5;
            this.symbol = MUSIC_SYMBOLS[Math.floor(Math.random() * MUSIC_SYMBOLS.length)];
            this.opacity = 0.2 + Math.random() * 0.35;
            this.rotation = (Math.random() - 0.5) * 0.3;
            this.rotateSpeed = (Math.random() - 0.5) * 0.005;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleAmp = 0.3 + Math.random() * 0.8;
            this.wobbleSpeed = 0.005 + Math.random() * 0.01;
        }

        update() {
            this.y += this.speed;
            this.wobble += this.wobbleSpeed;
            this.x += Math.sin(this.wobble) * this.wobbleAmp;
            this.rotation += this.rotateSpeed;

            // Mouse repulsion
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                const force = (120 - dist) / 120;
                this.x += (dx / dist || 0) * force * 2;
                this.y += (dy / dist || 0) * force * 1.5;
            }

            // Reset when off screen
            if (this.y > H + 40 || this.x < -50 || this.x > W + 50) {
                this.reset();
                if (this.y > H + 40) this.y = H + 45;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.font = `${this.size}px "Times New Roman", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            ctx.fillText(this.symbol, 0, 0);
            ctx.restore();
        }
    }

    // Sparkle particles - only emitted while mouse is held
    function updateSparkles() {
        // Emit burst while mouse is pressed
        if (mouseDown && mouseX > 0 && mouseY > 0) {
            for (let i = 0; i < 4; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 5 + Math.random() * 25;
                sparkles.push({
                    x: mouseX + Math.cos(angle) * dist,
                    y: mouseY + Math.sin(angle) * dist,
                    vx: Math.cos(angle) * (1 + Math.random() * 2),
                    vy: Math.sin(angle) * (1 + Math.random() * 2) - 1,
                    life: 1,
                    decay: 0.012 + Math.random() * 0.018,
                    size: 24 + Math.random() * 28,
                    symbol: MUSIC_SYMBOLS[Math.floor(Math.random() * MUSIC_SYMBOLS.length)]
                });
            }
        }

        for (let i = sparkles.length - 1; i >= 0; i--) {
            const s = sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.04; // gravity
            s.life -= s.decay;

            if (s.life <= 0) {
                sparkles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = s.life * 0.8;
            ctx.font = `${s.size * (0.6 + s.life * 0.4)}px "Times New Roman", serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(255, 215, 0, ${s.life})`;
            ctx.fillText(s.symbol, s.x, s.y);
            ctx.restore();
        }
    }

    // Initialize drops
    function init() {
        resize();
        for (let i = 0; i < DROP_COUNT; i++) {
            const drop = new NoteDrop();
            drop.y = Math.random() * H;
            drop.x = Math.random() * W;
            drops.push(drop);
        }
    }

    // Animation loop
    function animate() {
        // Solid black background - no trails
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        // Update and draw falling notes
        for (const drop of drops) {
            drop.update();
            drop.draw();
        }

        // Draw sparkle particles
        updateSparkles();

        requestAnimationFrame(animate);
    }

    init();
    animate();
})();
