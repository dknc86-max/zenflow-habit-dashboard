/* ==========================================================================
   ZenFlow Ambient Focus Synthesizer (Web Audio API)
   ========================================================================== */

class ZenSynthesizer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeSound = null; // 'binaural' | 'rain' | 'ambient' | null
        this.isPlaying = false;
        
        // Synth Nodes Cache
        this.nodes = {};
        
        // Settings
        this.volumeVal = 0.5;
        this.modRateVal = 5; // Hz
    }

    initContext() {
        if (!this.ctx) {
            // Support prefix-less AudioContext and fallback to Webkit
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Master Gain Node
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volumeVal, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
        
        // Resume context if suspended (browser security auto-lock)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(value) {
        this.volumeVal = parseFloat(value);
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(this.volumeVal, this.ctx.currentTime + 0.1);
        }
    }

    setModulation(value) {
        this.modRateVal = parseFloat(value);
        if (this.isPlaying && this.activeSound) {
            this.updateModulationParameters();
        }
    }

    updateModulationParameters() {
        const t = this.ctx.currentTime;
        if (this.activeSound === 'binaural') {
            // In binaural, modulation changes the binaural beat frequency
            if (this.nodes.oscRight) {
                // Base 150Hz + modulation rate (1Hz - 20Hz)
                this.nodes.oscRight.frequency.exponentialRampToValueAtTime(150 + this.modRateVal, t + 0.2);
            }
        } else if (this.activeSound === 'rain') {
            // In rain, modulation changes the wind sweep speed (LFO rate)
            if (this.nodes.lfo) {
                // Map LFO speed: range 0.05Hz - 0.5Hz based on slider
                const lfoSpeed = (this.modRateVal / 20) * 0.45 + 0.05;
                this.nodes.lfo.frequency.linearRampToValueAtTime(lfoSpeed, t + 0.2);
            }
        } else if (this.activeSound === 'ambient') {
            // In ambient, modulation changes LFO rate of the filter sweeps
            if (this.nodes.lfo) {
                const lfoSpeed = (this.modRateVal / 20) * 2.5 + 0.1;
                this.nodes.lfo.frequency.linearRampToValueAtTime(lfoSpeed, t + 0.2);
            }
        }
    }

    play(soundType) {
        this.initContext();
        
        if (this.isPlaying) {
            this.stop();
        }

        this.activeSound = soundType;
        this.isPlaying = true;

        try {
            if (soundType === 'binaural') {
                this.startBinaural();
            } else if (soundType === 'rain') {
                this.startRain();
            } else if (soundType === 'ambient') {
                this.startAmbient();
            }
            this.updateModulationParameters();
        } catch (e) {
            console.error("Failed to play synthesized sound: ", e);
            this.isPlaying = false;
            this.activeSound = null;
        }
    }

    stop() {
        if (!this.isPlaying) return;

        // Stop and disconnect nodes
        Object.keys(this.nodes).forEach(key => {
            const node = this.nodes[key];
            if (node) {
                try {
                    node.stop ? node.stop() : null;
                    node.disconnect();
                } catch (e) {
                    // Ignore errors for already stopped nodes
                }
            }
        });

        this.nodes = {};
        this.isPlaying = false;
        this.activeSound = null;
    }

    /* --- Sound Synthesizers Implementation --- */

    // 1. Binaural Focus Drone
    startBinaural() {
        const ctx = this.ctx;
        
        // Left Channel Oscillator (150 Hz)
        const oscLeft = ctx.createOscillator();
        oscLeft.type = 'sine';
        oscLeft.frequency.value = 150;
        
        // Right Channel Oscillator (150 + Mod Rate Hz)
        const oscRight = ctx.createOscillator();
        oscRight.type = 'sine';
        oscRight.frequency.value = 150 + this.modRateVal;

        // Stereo Panner Nodes
        // Fallback for older Safari
        let pannerLeft, pannerRight;
        if (ctx.createStereoPanner) {
            pannerLeft = ctx.createStereoPanner();
            pannerLeft.pan.value = -1;
            pannerRight = ctx.createStereoPanner();
            pannerRight.pan.value = 1;
        } else {
            // Legacy ChannelMerger/Panner implementation
            pannerLeft = ctx.createPanner();
            pannerLeft.panningModel = 'equalpower';
            pannerLeft.setPosition(-1, 0, 0);
            pannerRight = ctx.createPanner();
            pannerRight.panningModel = 'equalpower';
            pannerRight.setPosition(1, 0, 0);
        }

        // Deep Filter to remove harsh harmonics
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180; // Only pass sub frequencies
        
        // Low Gain adjust (sine waves are loud at low frequencies)
        const localGain = ctx.createGain();
        localGain.gain.value = 0.6;

        // Connect left path
        oscLeft.connect(pannerLeft);
        pannerLeft.connect(filter);
        
        // Connect right path
        oscRight.connect(pannerRight);
        pannerRight.connect(filter);
        
        // Connect filter to main gain
        filter.connect(localGain);
        localGain.connect(this.masterGain);

        oscLeft.start();
        oscRight.start();

        // Save node references
        this.nodes = { oscLeft, oscRight, pannerLeft, pannerRight, filter, localGain };
    }

    // 2. Synthesized Rain (Filtered White/Pink Noise)
    startRain() {
        const ctx = this.ctx;
        
        // Create 2 seconds of white noise buffer
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Fill buffer with noise (Simple white noise filtered down mimics pink noise behavior)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Pink noise filtering approximation
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // Normalize gain
            b6 = white * 0.115926;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        // Bandpass Filter to filter higher rain sound frequencies
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = 650;
        filter.Q.value = 1.0;
        filter.gain.value = 4.0;

        // Highpass filter for removing rumble
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 250;

        // Ambient Wind LFO (Low Frequency Oscillator) to modulate volume to simulate outdoor gusts
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Default speed

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.15; // Modulate depth

        const modulationGain = ctx.createGain();
        modulationGain.gain.value = 0.25; // Base gain

        // Connect LFO modulation
        lfo.connect(lfoGain);
        lfoGain.connect(modulationGain.gain);

        // Connections
        noiseNode.connect(hpFilter);
        hpFilter.connect(filter);
        filter.connect(modulationGain);
        modulationGain.connect(this.masterGain);

        noiseNode.start();
        lfo.start();

        this.nodes = { noiseNode, filter, hpFilter, lfo, lfoGain, modulationGain };
    }

    // 3. Cosmic Synth Pads
    startAmbient() {
        const ctx = this.ctx;

        // Frequencies for a soft Minor 7th chord (C3, G3, A#3, D#4)
        const chordFreqs = [130.81, 196.00, 233.08, 311.13];
        const oscs = [];
        
        const padGain = ctx.createGain();
        padGain.gain.value = 0.15; // Pad drone is naturally thick, keep gain modest

        // Resonant Lowpass Filter for sweeping effect
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 7.0;

        // Detuned Oscillators
        chordFreqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;
            
            // Apply slight detuning per voice to create stereo width/chorus
            osc.detune.value = (idx - 1.5) * 8; 

            osc.connect(filter);
            osc.start();
            oscs.push(osc);
        });

        // Filter modulation sweep (LFO)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.8; // Default frequency

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 350; // Sweep depth (Hz)

        // Connect LFO to filter frequency
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        filter.connect(padGain);
        padGain.connect(this.masterGain);

        // Store active voices in nodes
        this.nodes = { 
            lfo, 
            lfoGain, 
            filter, 
            padGain,
            // Store dynamically named oscillators to stop them later
            ...oscs.reduce((acc, osc, i) => { acc[`osc${i}`] = osc; return acc; }, {})
        };
    }
}

// Instantiate Global Synthesizer Instance
const Synthesizer = new ZenSynthesizer();
window.ZenSynth = Synthesizer;
