// ===== DATA STRUCTURE DEFINITIONS =====

class LiveSet {
    constructor(name = 'New Live Set') {
        this.id = this.generateId();
        this.name = name;
        this.masterBPM = 128;
        this.tracks = [];
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.totalDuration = 0;
        this.averageEnergy = 0;
    }

    generateId() {
        return `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    addTrack(track) {
        this.tracks.push(track);
        this.updateMetadata();
        return track;
    }

    removeTrack(trackId) {
        this.tracks = this.tracks.filter(t => t.id !== trackId);
        this.updateMetadata();
    }

    moveTrack(trackId, newIndex) {
        const oldIndex = this.tracks.findIndex(t => t.id === trackId);
        if (oldIndex === -1) return false;

        const [track] = this.tracks.splice(oldIndex, 1);
        this.tracks.splice(newIndex, 0, track);
        return true;
    }

    updateMetadata() {
        // Calculate total duration
        this.totalDuration = this.tracks.reduce((total, track) => {
            return total + track.durationSeconds;
        }, 0);

        // Calculate average energy
        if (this.tracks.length > 0) {
            const totalEnergy = this.tracks.reduce((sum, track) => sum + track.energy, 0);
            this.averageEnergy = Math.round(totalEnergy / this.tracks.length);
        } else {
            this.averageEnergy = 0;
        }

        this.updatedAt = new Date().toISOString();
    }

    getTrackByIndex(index) {
        return this.tracks[index] || null;
    }

    getTrackById(trackId) {
        return this.tracks.find(t => t.id === trackId) || null;
    }
}

class Track {
    constructor(name = 'New Track') {
        this.id = this.generateId();
        this.name = name;
        this.bpm = 128;
        this.key = 'C';
        this.mode = 'Minor';
        this.duration = '05:00'; // mm:ss format
        this.durationSeconds = 300;
        this.energy = 5; // 1-10
        this.genres = [];
        this.color = '#667eea';
        this.channels = [];
        this.sections = [];
        this.notes = '';
        this.transitionType = 'Fade';
        this.transitionBars = 8;
        this.transitionNotes = '';
        this.createdAt = new Date().toISOString();
    }

    generateId() {
        return `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    setDuration(mmss) {
        this.duration = mmss;
        const [minutes, seconds] = mmss.split(':').map(Number);
        this.durationSeconds = (minutes * 60) + seconds;
    }

    addChannel(channel) {
        this.channels.push(channel);
        return channel;
    }

    removeChannel(channelId) {
        this.channels = this.channels.filter(c => c.id !== channelId);
    }

    addSection(section) {
        this.sections.push(section);
        this.sections.sort((a, b) => a.startTime - b.startTime);
        return section;
    }

    removeSection(sectionId) {
        this.sections = this.sections.filter(s => s.id !== sectionId);
    }
}

class Channel {
    constructor(type, name) {
        this.id = this.generateId();
        this.type = type; // drums, synth, external, percussion, vocal, fx, automation, master
        this.name = name;
        this.midiChannel = 1;
        this.notes = '';
        this.color = this.getColorForType(type);
        
        // Type-specific properties
        this.typeSpecific = this.getDefaultPropertiesForType(type);
    }

    generateId() {
        return `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getColorForType(type) {
        const colors = {
            drums: '#ff006e',
            synth: '#00f0ff',
            external: '#8338ec',
            percussion: '#ffbe0b',
            vocal: '#06ffa5',
            fx: '#fb5607',
            automation: '#3a86ff',
            master: '#ffffff'
        };
        return colors[type] || '#667eea';
    }

    getDefaultPropertiesForType(type) {
        switch(type) {
            case 'drums':
                return {
                    pluginName: '',
                    presetName: '',
                    patternNumber: '',
                    swingAmount: 0,
                    velocityCurve: 'Linear'
                };
            
            case 'synth':
                return {
                    pluginName: '',
                    presetName: '',
                    layerNumber: 1,
                    filterType: 'Lowpass',
                    lfoSettings: '',
                    synthType: 'Lead' // Lead, Bass, Pad
                };
            
            case 'external':
                return {
                    deviceType: 'Synth', // Drum Machine, Sampler, Synth, Groovebox, Instrument
                    deviceModel: '',
                    patchNumber: '',
                    cvGateRouting: '',
                    audioRouting: 'Stereo',
                    audioChannel: ''
                };
            
            case 'percussion':
                return {
                    source: '', // Sample Pack, Plugin, Hardware
                    patternType: '',
                    grooveTemplate: ''
                };
            
            case 'vocal':
                return {
                    sampleName: '',
                    processingChain: '',
                    keyPitch: 'C',
                    timeStretchSettings: ''
                };
            
            case 'fx':
                return {
                    fxType: 'Reverb', // Reverb, Delay, Distortion, etc.
                    pluginName: '',
                    presetName: '',
                    sendAmount: 50,
                    automation: ''
                };
            
            case 'automation':
                return {
                    parameterName: '',
                    startValue: 0,
                    endValue: 127,
                    curveType: 'Linear' // Linear, Exponential, Logarithmic
                };
            
            case 'master':
                return {
                    busName: '',
                    routing: '',
                    fxChain: '',
                    level: 0
                };
            
            default:
                return {};
        }
    }
}

class ArrangementSection {
    constructor(name, startTime, duration) {
        this.id = this.generateId();
        this.name = name; // Intro, Build, Drop, Break, Outro
        this.startTime = startTime; // in seconds
        this.duration = duration; // in seconds
    }

    generateId() {
        return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    get endTime() {
        return this.startTime + this.duration;
    }
}

// ===== UTILITY FUNCTIONS =====

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseDuration(mmss) {
    const [minutes, seconds] = mmss.split(':').map(Number);
    return (minutes * 60) + (seconds || 0);
}

function generateColor() {
    const colors = [
        '#667eea', '#00f0ff', '#ff006e', '#8338ec', '#06ffa5',
        '#ffbe0b', '#fb5607', '#3a86ff', '#f72585', '#4cc9f0'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
