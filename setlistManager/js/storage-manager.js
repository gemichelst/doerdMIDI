class StorageManager {
    constructor() {
        this.dbName = 'doerdMIDI_SetlistManager';
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
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create Setlists Object Store
                if (!db.objectStoreNames.contains('setlists')) {
                    const setlistStore = db.createObjectStore('setlists', { keyPath: 'id' });
                    setlistStore.createIndex('name', 'name', { unique: false });
                    setlistStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('📦 Created "setlists" object store');
                }

                // Create Settings Object Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('📦 Created "settings" object store');
                }
            };
        });
    }

    // ===== SETLIST OPERATIONS =====

    async saveSetlist(setlist) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['setlists'], 'readwrite');
            const store = transaction.objectStore('setlists');
            
            // Ensure timestamps
            if (!setlist.createdAt) {
                setlist.createdAt = new Date().toISOString();
            }
            setlist.updatedAt = new Date().toISOString();

            const request = store.put(setlist);

            request.onsuccess = () => {
                console.log('✅ Setlist saved:', setlist.name);
                resolve(setlist);
            };

            request.onerror = () => {
                console.error('❌ Error saving setlist:', request.error);
                reject(request.error);
            };
        });
    }

    async getSetlist(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['setlists'], 'readonly');
            const store = transaction.objectStore('setlists');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAllSetlists() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['setlists'], 'readonly');
            const store = transaction.objectStore('setlists');
            const request = store.getAll();

            request.onsuccess = () => {
                // Sort by updatedAt descending
                const setlists = request.result.sort((a, b) => 
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                resolve(setlists);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteSetlist(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['setlists'], 'readwrite');
            const store = transaction.objectStore('setlists');
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('🗑️ Setlist deleted:', id);
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
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

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // ===== IMPORT/EXPORT =====

    async exportSetlist(id) {
        const setlist = await this.getSetlist(id);
        if (!setlist) {
            throw new Error('Setlist not found');
        }

        const json = JSON.stringify(setlist, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${setlist.name.replace(/s+/g, '_')}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📤 Exported setlist:', setlist.name);
        return true;
    }

    async importSetlist(jsonString) {
        try {
            const setlist = JSON.parse(jsonString);
            
            // Validate structure
            if (!setlist.name || !setlist.songs || !Array.isArray(setlist.songs)) {
                throw new Error('Invalid setlist format');
            }

            // Generate new ID to avoid conflicts
            setlist.id = this.generateId();
            setlist.importedAt = new Date().toISOString();

            await this.saveSetlist(setlist);
            console.log('📥 Imported setlist:', setlist.name);
            return setlist;
        } catch (error) {
            console.error('❌ Import error:', error);
            throw error;
        }
    }

    async exportAllData() {
        const setlists = await this.getAllSetlists();
        const settings = await this.getAllSettings();

        const data = {
            version: this.dbVersion,
            exportedAt: new Date().toISOString(),
            setlists,
            settings
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `doerdMIDI_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📤 Exported all data');
        return true;
    }

    async importAllData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.setlists || !Array.isArray(data.setlists)) {
                throw new Error('Invalid backup format');
            }

            // Import setlists
            for (const setlist of data.setlists) {
                await this.saveSetlist(setlist);
            }

            // Import settings
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.saveSetting(key, value);
                }
            }

            console.log('📥 Imported all data');
            return true;
        } catch (error) {
            console.error('❌ Import error:', error);
            throw error;
        }
    }

    // ===== UTILITIES =====

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async clearAllData() {
        const confirmation = confirm('⚠️ This will delete ALL setlists and settings. Are you sure?');
        if (!confirmation) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['setlists', 'settings'], 'readwrite');
            
            const setlistStore = transaction.objectStore('setlists');
            const settingsStore = transaction.objectStore('settings');

            setlistStore.clear();
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
