// ===== INDEXEDDB STORAGE MANAGER =====

class LiveSetStorage {
    constructor() {
        this.dbName = 'doerdMIDI_LiveSetPlanner';
        this.dbVersion = 1;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ LiveSet Storage initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create LiveSets Object Store
                if (!db.objectStoreNames.contains('livesets')) {
                    const livesetStore = db.createObjectStore('livesets', { keyPath: 'id' });
                    livesetStore.createIndex('name', 'name', { unique: false });
                    livesetStore.createIndex('createdAt', 'createdAt', { unique: false });
                    livesetStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('📦 Created "livesets" object store');
                }

                // Create Settings Object Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('📦 Created "settings" object store');
                }
            };
        });
    }

    // ===== LIVESET OPERATIONS =====

    async saveLiveSet(liveset) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['livesets'], 'readwrite');
            const store = transaction.objectStore('livesets');
            
            liveset.updatedAt = new Date().toISOString();
            
            // Convert to plain object for storage
            const plainObject = this.dehydrateLiveSet(liveset);
            const request = store.put(plainObject);

            request.onsuccess = () => {
                console.log('✅ LiveSet saved:', liveset.name);
                resolve(liveset);
            };

            request.onerror = () => {
                console.error('❌ Error saving liveset:', request.error);
                reject(request.error);
            };
        });
    }

    async getLiveSet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['livesets'], 'readonly');
            const store = transaction.objectStore('livesets');
            const request = store.get(id);

            request.onsuccess = () => {
                const data = request.result;
                if (data) {
                    // Hydrate: Convert plain object to LiveSet instance
                    const liveset = this.hydrateLiveSet(data);
                    resolve(liveset);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAllLiveSets() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['livesets'], 'readonly');
            const store = transaction.objectStore('livesets');
            const request = store.getAll();

            request.onsuccess = () => {
                const livesets = request.result.map(data => this.hydrateLiveSet(data));
                livesets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(livesets);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteLiveSet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['livesets'], 'readwrite');
            const store = transaction.objectStore('livesets');
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('🗑️ LiveSet deleted:', id);
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // ===== HYDRATION / DEHYDRATION =====

    dehydrateLiveSet(liveset) {
        // Convert LiveSet instance to plain object
        return JSON.parse(JSON.stringify(liveset));
    }

    hydrateLiveSet(data) {
        const liveset = new LiveSet(data.name);
        
        // Copy all properties
        Object.assign(liveset, data);
        
        // Hydrate tracks
        if (data.tracks && Array.isArray(data.tracks)) {
            liveset.tracks = data.tracks.map(trackData => this.hydrateTrack(trackData));
        }
        
        return liveset;
    }

    hydrateTrack(data) {
        const track = new Track(data.name);
        
        // Copy all properties
        Object.assign(track, data);
        
        // Hydrate channels
        if (data.channels && Array.isArray(data.channels)) {
            track.channels = data.channels.map(channelData => this.hydrateChannel(channelData));
        }
        
        // Hydrate sections
        if (data.sections && Array.isArray(data.sections)) {
            track.sections = data.sections.map(sectionData => this.hydrateSection(sectionData));
        }
        
        return track;
    }

    hydrateChannel(data) {
        const channel = new Channel(data.type, data.name);
        
        // Copy all properties
        Object.assign(channel, data);
        
        return channel;
    }

    hydrateSection(data) {
        const section = new ArrangementSection(data.name, data.startTime, data.duration);
        
        // Copy all properties
        Object.assign(section, data);
        
        return section;
    }

    // ===== SETTINGS OPERATIONS =====

    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // ===== IMPORT/EXPORT =====

    async exportLiveSet(id) {
        const liveset = await this.getLiveSet(id);
        if (!liveset) {
            throw new Error('LiveSet not found');
        }

        const json = JSON.stringify(liveset, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${liveset.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📤 Exported liveset:', liveset.name);
        return true;
    }

    async importLiveSet(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate structure
            if (!data.name || !data.tracks || !Array.isArray(data.tracks)) {
                throw new Error('Invalid liveset format');
            }

            // Hydrate and generate new ID
            const liveset = this.hydrateLiveSet(data);
            liveset.id = `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            liveset.importedAt = new Date().toISOString();

            await this.saveLiveSet(liveset);
            console.log('📥 Imported liveset:', liveset.name);
            return liveset;
        } catch (error) {
            console.error('❌ Import error:', error);
            throw error;
        }
    }

    async exportAllData() {
        const livesets = await this.getAllLiveSets();
        const settings = {};
        
        // Get all settings
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const allSettings = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        allSettings.forEach(item => {
            settings[item.key] = item.value;
        });

        const data = {
            version: this.dbVersion,
            exportedAt: new Date().toISOString(),
            livesets,
            settings
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `doerdMIDI_liveset_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📤 Exported all data');
        return true;
    }

    async clearAllData() {
        const confirmation = confirm('⚠️ This will delete ALL live sets and settings. Are you sure?');
        if (!confirmation) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['livesets', 'settings'], 'readwrite');
            
            const livesetStore = transaction.objectStore('livesets');
            const settingsStore = transaction.objectStore('settings');

            livesetStore.clear();
            settingsStore.clear();

            transaction.oncomplete = () => {
                console.log('🗑️ All data cleared');
                resolve(true);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }
}
