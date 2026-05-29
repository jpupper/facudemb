/**
 * Piano Modal - Virtual Piano with 5 presets
 * Uses Web Audio API for sound synthesis
 */
(function() {
    'use strict';

    const fab = document.getElementById('piano-fab');
    const modal = document.getElementById('piano-modal');
    const closeBtn = document.querySelector('.piano-modal-close');
    const keys = document.querySelectorAll('.white-key, .black-key');
    const presetBtns = document.querySelectorAll('.preset-btn');

    if (!fab || !modal) return;

    // Web Audio API
    let audioCtx = null;
    let currentPreset = 'piano';

    // Note frequencies for C4-B4 (one octave)
    const NOTES = {
        'C4': 261.63,
        'C#4': 277.18,
        'D4': 293.66,
        'D#4': 311.13,
        'E4': 329.63,
        'F4': 349.23,
        'F#4': 369.99,
        'G4': 392.00,
        'G#4': 415.30,
        'A4': 440.00,
        'A#4': 466.16,
        'B4': 493.88,
        'C5': 523.25,
    };

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Preset sound engines — improved across the board
    const engines = {
        // Acoustic Piano — warmer, richer harmonics
        piano: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);
            master.gain.setValueAtTime(0.7, now);
            master.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Three partials for realistic piano tone
            const partials = [
                { type: 'triangle', mult: 1, gain: 0.5, decay: 1.0 },
                { type: 'sine', mult: 2, gain: 0.2, decay: 0.6 },
                { type: 'sine', mult: 3, gain: 0.08, decay: 0.3 },
            ];

            partials.forEach(function(p) {
                const osc = ac.createOscillator();
                osc.type = p.type;
                osc.frequency.setValueAtTime(freq * p.mult, now);
                const g = ac.createGain();
                osc.connect(g);
                g.connect(master);
                g.gain.setValueAtTime(p.gain, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + duration * p.decay);
                osc.start(now);
                osc.stop(now + duration);
            });

            // Velocity-like click for attack
            const click = ac.createOscillator();
            click.type = 'sine';
            click.frequency.setValueAtTime(freq * 8, now);
            click.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.01);
            const cg = ac.createGain();
            click.connect(cg);
            cg.connect(master);
            cg.gain.setValueAtTime(0.15, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            click.start(now);
            click.stop(now + 0.02);
        },

        // Electric Piano — Rhodes-like bell tone with chorus
        epiano: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);
            master.gain.setValueAtTime(0.65, now);
            master.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.2);

            // FM-like: carrier + modulator for bell tone
            const carrier = ac.createOscillator();
            carrier.type = 'sine';
            carrier.frequency.setValueAtTime(freq, now);

            const modulator = ac.createOscillator();
            modulator.type = 'sine';
            modulator.frequency.setValueAtTime(freq * 5, now);

            const modGain = ac.createGain();
            modGain.gain.setValueAtTime(freq * 0.5, now);
            modGain.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
            modulator.connect(modGain);
            modGain.connect(carrier.frequency);

            // Subtle chorus (detuned second oscillator)
            const chorus = ac.createOscillator();
            chorus.type = 'sine';
            chorus.frequency.setValueAtTime(freq * 1.003, now);

            const cg = ac.createGain();
            carrier.connect(master);
            chorus.connect(cg);
            cg.connect(master);

            cg.gain.setValueAtTime(0.2, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

            // Soft attack envelope on master
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(0.65, now + 0.005);
            master.gain.setValueAtTime(0.65, now + 0.02);
            master.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.2);

            carrier.start(now);
            chorus.start(now);
            modulator.start(now);
            carrier.stop(now + duration);
            chorus.stop(now + duration);
            modulator.stop(now + duration);
        },

        // Organ — Hammond-like with tonewheel simulation
        organ: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(0.5, now + 0.02);
            master.gain.setValueAtTime(0.5, now + duration - 0.05);
            master.gain.linearRampToValueAtTime(0, now + duration);

            // Tonewheel drawbar simulation
            const bars = [0.5, 0.3, 0.2, 0.15, 0.1, 0.06, 0.04];
            for (let i = 0; i < bars.length; i++) {
                const osc = ac.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq * (i + 1), now);
                const g = ac.createGain();
                osc.connect(g);
                g.connect(master);
                g.gain.setValueAtTime(bars[i], now);
                g.gain.setValueAtTime(bars[i], now + duration - 0.02);
                osc.start(now);
                osc.stop(now + duration);
            }

            // Leslie rotating speaker effect
            const lfo = ac.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(5.5, now);
            const lfoGain = ac.createGain();
            lfoGain.gain.setValueAtTime(15, now);
            lfo.connect(lfoGain);
            lfoGain.connect(master.gain);
            lfo.start(now);
            lfo.stop(now + duration);
        },

        // Strings — richer ensemble
        strings: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);

            // 4 detuned oscillators for lush ensemble
            const detunes = [0, 0.5, -0.6, 1.2];
            detunes.forEach(function(d, i) {
                const osc = ac.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq * (1 + d / 100), now);
                const g = ac.createGain();
                osc.connect(g);
                g.connect(master);
                g.gain.setValueAtTime(0.25, now);
                g.gain.setValueAtTime(0.25, now + duration - 0.3);
                osc.start(now);
                osc.stop(now + duration);
            });

            // Sub octave for richness
            const sub = ac.createOscillator();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(freq * 0.5, now);
            const sg = ac.createGain();
            sub.connect(sg);
            sg.connect(master);
            sg.gain.setValueAtTime(0.15, now);
            sub.start(now);
            sub.stop(now + duration);

            // Slow attack, slow release
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(0.55, now + 0.15);
            master.gain.setValueAtTime(0.55, now + duration - 0.25);
            master.gain.linearRampToValueAtTime(0, now + duration);
        },

        // Synth Lead — aggressive with filter sweep
        synth: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);

            const osc1 = ac.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(freq, now);
            osc1.frequency.linearRampToValueAtTime(freq * 1.005, now + 0.1);

            const osc2 = ac.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(freq * 2.01, now);

            const filter = ac.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + duration * 0.7);
            filter.Q.setValueAtTime(8, now);

            const g1 = ac.createGain();
            const g2 = ac.createGain();
            osc1.connect(g1);
            osc2.connect(g2);
            g1.connect(filter);
            g2.connect(filter);
            filter.connect(master);

            g1.gain.setValueAtTime(0.4, now);
            g2.gain.setValueAtTime(0.15, now);

            // ADSR
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(0.55, now + 0.01);
            master.gain.setValueAtTime(0.5, now + duration - 0.15);
            master.gain.linearRampToValueAtTime(0, now + duration);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
        },

        // Pad — cinematic, evolving
        pad: function(ac, freq, duration) {
            const now = ac.currentTime;
            const master = ac.createGain();
            master.connect(ac.destination);

            const layers = [
                { type: 'sine', mult: 1, detune: 0, gain: 0.25 },
                { type: 'sine', mult: 1, detune: 5, gain: 0.2 },
                { type: 'triangle', mult: 0.5, detune: 0, gain: 0.15 },
                { type: 'sine', mult: 2, detune: -2, gain: 0.08 },
            ];

            layers.forEach(function(l) {
                const osc = ac.createOscillator();
                osc.type = l.type;
                osc.frequency.setValueAtTime(freq * l.mult * (1 + l.detune / 100), now);
                const g = ac.createGain();
                osc.connect(g);
                g.connect(master);
                g.gain.setValueAtTime(l.gain, now);
                g.gain.setValueAtTime(l.gain, now + duration - 0.5);
                osc.start(now);
                osc.stop(now + duration);
            });

            // LFO for subtle movement
            const lfo = ac.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.3, now);
            const lfoGain = ac.createGain();
            lfoGain.gain.setValueAtTime(8, now);
            lfo.connect(lfoGain);
            lfoGain.connect(master.gain);
            lfo.start(now);
            lfo.stop(now + duration);

            // Very slow attack, long release
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(0.45, now + 0.5);
            master.gain.setValueAtTime(0.45, now + duration - 0.6);
            master.gain.linearRampToValueAtTime(0, now + duration);
        }
    };

    function playNote(note) {
        const freq = NOTES[note];
        if (!freq) return;

        const ac = getAudioContext();
        const duration = currentPreset === 'pad' ? 1.5 : 0.8;

        if (engines[currentPreset]) {
            engines[currentPreset](ac, freq, duration);
        }
    }

    // Keyboard interaction - mouse
    function keyDown(e) {
        const key = e.currentTarget;
        key.classList.add('pressed');
        const note = key.dataset.note;
        playNote(note);
    }

    function keyUp(e) {
        e.currentTarget.classList.remove('pressed');
    }

    keys.forEach(key => {
        key.addEventListener('mousedown', keyDown);
        key.addEventListener('mouseup', keyUp);
        key.addEventListener('mouseleave', keyUp);
    });

    // Touch support - multi-touch compatible
    const activeTouches = {};

    function getKeyFromTouch(touch) {
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && (el.classList.contains('white-key') || el.classList.contains('black-key'))) {
            return el;
        }
        // Also check if touch is on a child of a key (some elements inside)
        if (el) {
            const parent = el.closest('.white-key, .black-key');
            if (parent) return parent;
        }
        return null;
    }

    document.addEventListener('touchstart', function(e) {
        if (!modal.classList.contains('active')) return;
        let hitKey = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const key = getKeyFromTouch(touch);
            if (key && !activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = key.dataset.note;
                key.classList.add('pressed');
                playNote(key.dataset.note);
                hitKey = true;
            }
        }
        // Prevent synthetic mouse events from touch
        if (hitKey) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!modal.classList.contains('active')) return;
        e.preventDefault();
        const nowActive = {};
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const key = getKeyFromTouch(touch);
            if (key && !nowActive[key.dataset.note]) {
                nowActive[key.dataset.note] = touch.identifier;
                if (!activeTouches[touch.identifier]) {
                    // New touch on this key
                    activeTouches[touch.identifier] = key.dataset.note;
                    key.classList.add('pressed');
                    playNote(key.dataset.note);
                }
            } else if (activeTouches[touch.identifier]) {
                // Finger slid off the key
                const oldNote = activeTouches[touch.identifier];
                const oldKey = document.querySelector(`[data-note="${oldNote}"]`);
                if (oldKey) oldKey.classList.remove('pressed');
                delete activeTouches[touch.identifier];
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
        if (!modal.classList.contains('active')) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (activeTouches[touch.identifier]) {
                const note = activeTouches[touch.identifier];
                const key = document.querySelector(`[data-note="${note}"]`);
                if (key) key.classList.remove('pressed');
                delete activeTouches[touch.identifier];
            }
        }
    }, { passive: true });

    document.addEventListener('touchcancel', function(e) {
        if (!modal.classList.contains('active')) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (activeTouches[touch.identifier]) {
                const note = activeTouches[touch.identifier];
                const key = document.querySelector(`[data-note="${note}"]`);
                if (key) key.classList.remove('pressed');
                delete activeTouches[touch.identifier];
            }
        }
    }, { passive: true });

    // Modal controls
    fab.addEventListener('click', function() {
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Preset switching
    presetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            presetBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPreset = this.dataset.preset;
        });
    });

    // Keyboard shortcut
    document.addEventListener('keydown', function(e) {
        // Map QWERTYUIOP[] to piano keys (C4-B4)
        const keyMap = {
            'q': 'C4',
            'w': 'C#4',
            'e': 'D4',
            'r': 'D#4',
            't': 'E4',
            'y': 'F4',
            'u': 'F#4',
            'i': 'G4',
            'o': 'G#4',
            'p': 'A4',
            '[': 'A#4',
            ']': 'B4',
            '\\': 'C5',
        };

        // Close modal with Escape
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            return;
        }

        // Only play if modal is open
        if (!modal.classList.contains('active')) return;

        const note = keyMap[e.key.toLowerCase()];
        if (note) {
            e.preventDefault();
            playNote(note);

            // Visual feedback on corresponding key
            const keyEl = document.querySelector(`[data-note="${note}"]`);
            if (keyEl) {
                keyEl.classList.add('pressed');
                setTimeout(function() {
                    keyEl.classList.remove('pressed');
                }, 200);
            }
        }
    });

    console.log('🎹 Piano Virtual listo. Una octava completa: QWERTYUIOP[]\\ = C4-C5');
    console.log('   Q=Do  W=Do#  E=Re  R=Re#  T=Mi  Y=Fa  U=Fa#  I=Sol  O=Sol#  P=La  [=La#  ]=Si  \\=Do5');
})();
