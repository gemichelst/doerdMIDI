class MIDIManager {
    constructor() {
        this.midiAccess = null;
        this.inputs = [];
        this.outputs = [];
        this.currentOutput = null;
        this.listeners = [];
        this.ccState = new Map(); // Track current CC values
    }

    async initialize() {
        if (!navigator.requestMIDIAccess) {
            throw new Error('WebMIDI API not supported in this browser');
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log('✅ WebMIDI initialized');

            this.updatePorts();
            
            // Listen for device changes
            this.midiAccess.addEventListener('statechange', (e) => {
                console.log('MIDI device state changed:', e.port.name, e.port.state);
                this.updatePorts();
                this.notifyListeners('devicechange', { ports: this.getPortsList() });
            });

            // Listen to inputs for CC tracking
            this.inputs.forEach(input => {
                input.onmidimessage = (message) => this.handleMIDIMessage(message);
            });

            return true;
        } catch (error) {
            console.error('❌ WebMIDI initialization failed:', error);
            throw error;
        }
    }

    updatePorts() {
        this.inputs = Array.from(this.midiAccess.inputs.values());
        this.outputs = Array.from(this.midiAccess.outputs.values());

        // Auto-select first output if available
        if (this.outputs.length > 0 && !this.currentOutput) {
            this.currentOutput = this.outputs[0];
            console.log('📤 Selected MIDI output:', this.currentOutput.name);
        }
    }

    handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const command = status & 0xF0;
        const channel = status & 0x0F;

        // Track CC messages
        if (command === 0xB0) { // Control Change
            this.ccState.set(`${channel}-${data1}`, data2);
            this.notifyListeners('cc', { channel, cc: data1, value: data2 });
        }

        // Notify all messages
        this.notifyListeners('message', { status, data1, data2, command, channel });
    }

    sendProgramChange(program, channel = 0) {
        if (!this.currentOutput) {
            console.warn('No MIDI output selected');
            return false;
        }

        const status = 0xC0 | (channel & 0x0F);
        const data = [status, program & 0x7F];
        
        this.currentOutput.send(data);
        console.log(`📤 Sent Program Change: ${program} on channel ${channel}`);
        return true;
    }

    sendControlChange(cc, value, channel = 0) {
        if (!this.currentOutput) {
            console.warn('No MIDI output selected');
            return false;
        }

        const status = 0xB0 | (channel & 0x0F);
        const data = [status, cc & 0x7F, value & 0x7F];
        
        this.currentOutput.send(data);
        this.ccState.set(`${channel}-${cc}`, value);
        return true;
    }

    sendNoteOn(note, velocity, channel = 0) {
        if (!this.currentOutput) return false;
        
        const status = 0x90 | (channel & 0x0F);
        const data = [status, note & 0x7F, velocity & 0x7F];
        
        this.currentOutput.send(data);
        return true;
    }

    sendNoteOff(note, channel = 0) {
        if (!this.currentOutput) return false;
        
        const status = 0x80 | (channel & 0x0F);
        const data = [status, note & 0x7F, 0];
        
        this.currentOutput.send(data);
        return true;
    }

    captureCurrentState() {
        // Return current CC values
        const state = {};
        this.ccState.forEach((value, key) => {
            state[key] = value;
        });
        return state;
    }

    sendSnapshot(snapshot, fadeDuration = 0) {
        if (!snapshot || !snapshot.cc_state) {
            console.warn('Invalid snapshot');
            return false;
        }

        // Send Program Change immediately
        if (snapshot.cc_state.program_change !== undefined) {
            this.sendProgramChange(snapshot.cc_state.program_change);
        }

        // Send CC values
        if (snapshot.cc_state.cc_values) {
            Object.entries(snapshot.cc_state.cc_values).forEach(([key, value]) => {
                const [channel, cc] = key.split('-').map(Number);
                this.sendControlChange(cc, value, channel);
            });
        }

        console.log('✅ Snapshot sent:', snapshot.name);
        return true;
    }

    addEventListener(event, callback) {
        this.listeners.push({ event, callback });
    }

    notifyListeners(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }

    getPortsList() {
        return {
            inputs: this.inputs.map(p => ({ id: p.id, name: p.name })),
            outputs: this.outputs.map(p => ({ id: p.id, name: p.name }))
        };
    }

    selectOutput(outputId) {
        const output = this.outputs.find(o => o.id === outputId);
        if (output) {
            this.currentOutput = output;
            console.log('📤 Selected output:', output.name);
            return true;
        }
        return false;
    }

    isConnected() {
        return this.outputs.length > 0;
    }
}
