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

    // Preset sound engines
    const engines = {
        piano: function(ac, freq, duration) {
            const now = ac.currentTime;
            const gain = ac.createGain();
            gain.connect(ac.destination);

            // Fundamental + harmonics for piano-like sound
            const osc1 = ac.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(freq, now);

            const osc2 = ac.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, now);
            osc2.frequency.linearRampToValueAtTime(freq * 2, now + 0.05);

            const gain1 = ac.createGain();
            const gain2 = ac.createGain();

            osc1.connect(gain1);
            osc2.connect(gain2);
            gain1.connect(gain);
            gain2.connect(gain);

            gain1.gain.setValueAtTime(0.5, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

            gain2.gain.setValueAtTime(0.3, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);

            // ADSR envelope
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        },

        organ: function(ac, freq, duration) {
            const now = ac.currentTime;
            const gain = ac.createGain();
            gain.connect(ac.destination);

            for (let i = 1; i <= 5; i++) {
                const osc = ac.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq * i, now);
                const g = ac.createGain();
                osc.connect(g);
                g.connect(gain);
                g.gain.setValueAtTime(0.2 / i, now);
                g.gain.setValueAtTime(0.2 / i, now + duration - 0.02);
                osc.start(now);
                osc.stop(now + duration);
            }

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
            gain.gain.setValueAtTime(0.4, now + duration - 0.05);
            gain.gain.linearRampToValueAtTime(0, now + duration);
        },

        strings: function(ac, freq, duration) {
            const now = ac.currentTime;
            const gain = ac.createGain();
            gain.connect(ac.destination);

            const osc1 = ac.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, now);
            const osc2 = ac.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.01, now);

            const g1 = ac.createGain();
            const g2 = ac.createGain();
            osc1.connect(g1);
            osc2.connect(g2);
            g1.connect(gain);
            g2.connect(gain);

            g1.gain.setValueAtTime(0.4, now);
            g2.gain.setValueAtTime(0.4, now);

            // Slow attack
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
            gain.gain.setValueAtTime(0.5, now + duration - 0.3);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
        },

        synth: function(ac, freq, duration) {
            const now = ac.currentTime;
            const gain = ac.createGain();
            gain.connect(ac.destination);

            const osc = ac.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.05);

            const filter = ac.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + duration);

            osc.connect(filter);
            filter.connect(gain);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
            gain.gain.setValueAtTime(0.5, now + duration - 0.1);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        },

        pad: function(ac, freq, duration) {
            const now = ac.currentTime;
            const gain = ac.createGain();
            gain.connect(ac.destination);

            // Detuned sine waves for lush pad
            const osc1 = ac.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, now);
            const osc2 = ac.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.005, now);
            const osc3 = ac.createOscillator();
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(freq * 0.5, now);

            const g1 = ac.createGain();
            const g2 = ac.createGain();
            const g3 = ac.createGain();
            osc1.connect(g1);
            osc2.connect(g2);
            osc3.connect(g3);
            g1.connect(gain);
            g2.connect(gain);
            g3.connect(gain);

            g1.gain.setValueAtTime(0.3, now);
            g2.gain.setValueAtTime(0.3, now);
            g3.gain.setValueAtTime(0.15, now);

            // Very slow attack, long release
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
            gain.gain.setValueAtTime(0.4, now + duration - 0.5);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
            osc3.stop(now + duration);
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
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const key = getKeyFromTouch(touch);
            if (key && !activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = key.dataset.note;
                key.classList.add('pressed');
                playNote(key.dataset.note);
            }
        }
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
