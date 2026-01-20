// ===== LIVESET CONTROLLER =====

class LiveSetController {
    constructor(storage) {
        this.storage = storage;
        this.currentLiveSet = null;
        this.selectedTrackId = null;
        this.listeners = [];
    }

    // ===== LIVESET MANAGEMENT =====

    async createLiveSet(name) {
        const liveset = new LiveSet(name || 'New Live Set');
        await this.storage.saveLiveSet(liveset);
        this.notifyListeners('livesetCreated', liveset);
        return liveset;
    }

    async loadLiveSet(id) {
        const liveset = await this.storage.getLiveSet(id);
        if (!liveset) {
            throw new Error('LiveSet not found');
        }

        this.currentLiveSet = liveset;
        this.selectedTrackId = null;
        this.notifyListeners('livesetLoaded', liveset);
        return liveset;
    }

    async getAllLiveSets() {
        return await this.storage.getAllLiveSets();
    }

    async updateLiveSet(updates) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        Object.assign(this.currentLiveSet, updates);
        this.currentLiveSet.updatedAt = new Date().toISOString();
        
        await this.storage.saveLiveSet(this.currentLiveSet);
        this.notifyListeners('livesetUpdated', this.currentLiveSet);
        return this.currentLiveSet;
    }

    async deleteLiveSet(id) {
        await this.storage.deleteLiveSet(id);
        
        if (this.currentLiveSet && this.currentLiveSet.id === id) {
            this.currentLiveSet = null;
            this.selectedTrackId = null;
            this.notifyListeners('livesetClosed', null);
        }

        this.notifyListeners('livesetDeleted', id);
        return true;
    }

    async saveLiveSet() {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        this.currentLiveSet.updateMetadata();
        await this.storage.saveLiveSet(this.currentLiveSet);
        this.notifyListeners('livesetSaved', this.currentLiveSet);
        return this.currentLiveSet;
    }

    // ===== TRACK MANAGEMENT =====

    async addTrack(trackData) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = new Track(trackData.name || 'New Track');
        
        if (trackData.bpm) track.bpm = trackData.bpm;
        if (trackData.key) track.key = trackData.key;
        if (trackData.mode) track.mode = trackData.mode;
        if (trackData.duration) track.setDuration(trackData.duration);
        if (trackData.energy) track.energy = trackData.energy;
        if (trackData.genres) track.genres = trackData.genres;
        if (trackData.color) track.color = trackData.color;

        this.currentLiveSet.addTrack(track);
        await this.saveLiveSet();
        
        this.notifyListeners('trackAdded', track);
        return track;
    }

    async updateTrack(trackId, updates) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        Object.assign(track, updates);
        
        if (updates.duration) {
            track.setDuration(updates.duration);
        }

        await this.saveLiveSet();
        this.notifyListeners('trackUpdated', track);
        return track;
    }

    async deleteTrack(trackId) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        this.currentLiveSet.removeTrack(trackId);
        
        if (this.selectedTrackId === trackId) {
            this.selectedTrackId = null;
        }

        await this.saveLiveSet();
        this.notifyListeners('trackDeleted', trackId);
        return true;
    }

    async moveTrack(trackId, newIndex) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const success = this.currentLiveSet.moveTrack(trackId, newIndex);
        if (success) {
            await this.saveLiveSet();
            this.notifyListeners('trackMoved', { trackId, newIndex });
        }
        return success;
    }

    selectTrack(trackId) {
        this.selectedTrackId = trackId;
        const track = this.currentLiveSet.getTrackById(trackId);
        this.notifyListeners('trackSelected', track);
        return track;
    }

    getSelectedTrack() {
        if (!this.selectedTrackId) return null;
        return this.currentLiveSet.getTrackById(this.selectedTrackId);
    }

    // ===== CHANNEL MANAGEMENT =====

    async addChannel(trackId, channelData) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        const channel = new Channel(channelData.type, channelData.name);
        
        if (channelData.midiChannel) channel.midiChannel = channelData.midiChannel;
        if (channelData.notes) channel.notes = channelData.notes;
        if (channelData.typeSpecific) {
            Object.assign(channel.typeSpecific, channelData.typeSpecific);
        }

        track.addChannel(channel);
        await this.saveLiveSet();
        
        this.notifyListeners('channelAdded', { trackId, channel });
        return channel;
    }

    async updateChannel(trackId, channelId, updates) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        const channel = track.channels.find(c => c.id === channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        Object.assign(channel, updates);
        
        if (updates.typeSpecific) {
            Object.assign(channel.typeSpecific, updates.typeSpecific);
        }

        await this.saveLiveSet();
        this.notifyListeners('channelUpdated', { trackId, channel });
        return channel;
    }

    async deleteChannel(trackId, channelId) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        track.removeChannel(channelId);
        await this.saveLiveSet();
        
        this.notifyListeners('channelDeleted', { trackId, channelId });
        return true;
    }

    // ===== ARRANGEMENT SECTIONS =====

    async addSection(trackId, sectionData) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        const section = new ArrangementSection(
            sectionData.name,
            sectionData.startTime,
            sectionData.duration
        );

        track.addSection(section);
        await this.saveLiveSet();
        
        this.notifyListeners('sectionAdded', { trackId, section });
        return section;
    }

    async deleteSection(trackId, sectionId) {
        if (!this.currentLiveSet) {
            throw new Error('No liveset loaded');
        }

        const track = this.currentLiveSet.getTrackById(trackId);
        if (!track) {
            throw new Error('Track not found');
        }

        track.removeSection(sectionId);
        await this.saveLiveSet();
        
        this.notifyListeners('sectionDeleted', { trackId, sectionId });
        return true;
    }

    // ===== UTILITIES =====

    isLiveSetLoaded() {
        return this.currentLiveSet !== null;
    }

    getLiveSetInfo() {
        if (!this.currentLiveSet) return null;

        return {
            id: this.currentLiveSet.id,
            name: this.currentLiveSet.name,
            trackCount: this.currentLiveSet.tracks.length,
            totalDuration: this.currentLiveSet.totalDuration,
            averageEnergy: this.currentLiveSet.averageEnergy,
            masterBPM: this.currentLiveSet.masterBPM
        };
    }

    // ===== EVENT SYSTEM =====

    addEventListener(event, callback) {
        this.listeners.push({ event, callback });
    }

    notifyListeners(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }
}

