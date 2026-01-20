class SetlistController {
    constructor(midiManager, storageManager) {
        this.midi = midiManager;
        this.storage = storageManager;
        this.currentSetlist = null;
        this.currentSongIndex = 0;
        this.listeners = [];
    }

    // ===== SETLIST MANAGEMENT =====

    async createSetlist(name) {
        const setlist = {
            id: this.storage.generateId(),
            name: name || 'New Setlist',
            songs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.storage.saveSetlist(setlist);
        this.notifyListeners('setlistCreated', setlist);
        return setlist;
    }

    async loadSetlist(id) {
        const setlist = await this.storage.getSetlist(id);
        if (!setlist) {
            throw new Error('Setlist not found');
        }

        this.currentSetlist = setlist;
        this.currentSongIndex = 0;
        this.notifyListeners('setlistLoaded', setlist);
        return setlist;
    }

    async getAllSetlists() {
        return await this.storage.getAllSetlists();
    }

    async updateSetlist(updates) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        Object.assign(this.currentSetlist, updates);
        this.currentSetlist.updatedAt = new Date().toISOString();
        
        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('setlistUpdated', this.currentSetlist);
        return this.currentSetlist;
    }

    async deleteSetlist(id) {
        await this.storage.deleteSetlist(id);
        
        if (this.currentSetlist && this.currentSetlist.id === id) {
            this.currentSetlist = null;
            this.currentSongIndex = 0;
            this.notifyListeners('setlistClosed', null);
        }

        this.notifyListeners('setlistDeleted', id);
        return true;
    }

    async renameSetlist(newName) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        return await this.updateSetlist({ name: newName });
    }

    // ===== SONG MANAGEMENT =====

    async addSong(songData) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const song = {
            id: this.storage.generateId(),
            title: songData.title || 'New Song',
            tempo: songData.tempo || 120,
            key: songData.key || 'C',
            notes: songData.notes || '',
            snapshots: [],
            createdAt: new Date().toISOString()
        };

        this.currentSetlist.songs.push(song);
        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('songAdded', song);
        return song;
    }

    async updateSong(songId, updates) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const songIndex = this.currentSetlist.songs.findIndex(s => s.id === songId);
        if (songIndex === -1) {
            throw new Error('Song not found');
        }

        Object.assign(this.currentSetlist.songs[songIndex], updates);
        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('songUpdated', this.currentSetlist.songs[songIndex]);
        return this.currentSetlist.songs[songIndex];
    }

    async deleteSong(songId) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const initialLength = this.currentSetlist.songs.length;
        this.currentSetlist.songs = this.currentSetlist.songs.filter(s => s.id !== songId);

        if (this.currentSetlist.songs.length === initialLength) {
            throw new Error('Song not found');
        }

        // Adjust current index if necessary
        if (this.currentSongIndex >= this.currentSetlist.songs.length) {
            this.currentSongIndex = Math.max(0, this.currentSetlist.songs.length - 1);
        }

        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('songDeleted', songId);
        return true;
    }

    async moveSong(songId, newIndex) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const songIndex = this.currentSetlist.songs.findIndex(s => s.id === songId);
        if (songIndex === -1) {
            throw new Error('Song not found');
        }

        const [song] = this.currentSetlist.songs.splice(songIndex, 1);
        this.currentSetlist.songs.splice(newIndex, 0, song);

        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('songMoved', { songId, newIndex });
        return true;
    }

    // ===== SNAPSHOT MANAGEMENT =====

    async recordSnapshot(songId, name) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const song = this.currentSetlist.songs.find(s => s.id === songId);
        if (!song) {
            throw new Error('Song not found');
        }

        // Capture current MIDI state
        const ccState = this.midi.captureCurrentState();

        const snapshot = {
            id: this.storage.generateId(),
            name: name || `Snapshot ${song.snapshots.length + 1}`,
            cc_state: {
                cc_values: ccState,
                program_change: null // Can be set manually
            },
            timestamp: new Date().toISOString()
        };

        song.snapshots.push(snapshot);
        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('snapshotRecorded', { songId, snapshot });
        return snapshot;
    }

    async triggerSnapshot(songId, snapshotId) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const song = this.currentSetlist.songs.find(s => s.id === songId);
        if (!song) {
            throw new Error('Song not found');
        }

        const snapshot = song.snapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            throw new Error('Snapshot not found');
        }

        const success = this.midi.sendSnapshot(snapshot);
        if (success) {
            this.notifyListeners('snapshotTriggered', { songId, snapshotId });
        }
        return success;
    }

    async deleteSnapshot(songId, snapshotId) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const song = this.currentSetlist.songs.find(s => s.id === songId);
        if (!song) {
            throw new Error('Song not found');
        }

        const initialLength = song.snapshots.length;
        song.snapshots = song.snapshots.filter(s => s.id !== snapshotId);

        if (song.snapshots.length === initialLength) {
            throw new Error('Snapshot not found');
        }

        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('snapshotDeleted', { songId, snapshotId });
        return true;
    }

    async updateSnapshot(songId, snapshotId, updates) {
        if (!this.currentSetlist) {
            throw new Error('No setlist loaded');
        }

        const song = this.currentSetlist.songs.find(s => s.id === songId);
        if (!song) {
            throw new Error('Song not found');
        }

        const snapshot = song.snapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            throw new Error('Snapshot not found');
        }

        Object.assign(snapshot, updates);
        await this.storage.saveSetlist(this.currentSetlist);
        this.notifyListeners('snapshotUpdated', { songId, snapshot });
        return snapshot;
    }

    // ===== NAVIGATION =====

    getCurrentSong() {
        if (!this.currentSetlist || this.currentSetlist.songs.length === 0) {
            return null;
        }
        return this.currentSetlist.songs[this.currentSongIndex];
    }

    async nextSong() {
        if (!this.currentSetlist) return false;

        if (this.currentSongIndex < this.currentSetlist.songs.length - 1) {
            this.currentSongIndex++;
            this.notifyListeners('songChanged', {
                song: this.getCurrentSong(),
                index: this.currentSongIndex
            });
            return true;
        }
        return false;
    }

    async previousSong() {
        if (!this.currentSetlist) return false;

        if (this.currentSongIndex > 0) {
            this.currentSongIndex--;
            this.notifyListeners('songChanged', {
                song: this.getCurrentSong(),
                index: this.currentSongIndex
            });
            return true;
        }
        return false;
    }

    async goToSong(index) {
        if (!this.currentSetlist) return false;

        if (index >= 0 && index < this.currentSetlist.songs.length) {
            this.currentSongIndex = index;
            this.notifyListeners('songChanged', {
                song: this.getCurrentSong(),
                index: this.currentSongIndex
            });
            return true;
        }
        return false;
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

    // ===== GETTERS =====

    isSetlistLoaded() {
        return this.currentSetlist !== null;
    }

    getSetlistInfo() {
        if (!this.currentSetlist) return null;

        return {
            id: this.currentSetlist.id,
            name: this.currentSetlist.name,
            songCount: this.currentSetlist.songs.length,
            currentSongIndex: this.currentSongIndex,
            currentSong: this.getCurrentSong()
        };
    }
}
