// ===== APPLICATION INITIALIZATION =====

let midiManager, storageManager, controller;
let currentSetlistId = null;

async function initializeApp() {
    console.log('🚀 Initializing doerdMIDI Setlist Manager...');

    try {
        // Initialize Storage
        storageManager = new StorageManager();
        await storageManager.initialize();

        // Initialize MIDI
        midiManager = new MIDIManager();
        try {
            await midiManager.initialize();
            updateMIDIStatus(true);
        } catch (error) {
            console.warn('⚠️ MIDI not available:', error.message);
            updateMIDIStatus(false);
        }

        // Initialize Controller
        controller = new SetlistController(midiManager, storageManager);
        setupEventListeners();

        // Load UI
        await loadSetlistsList();
        
        // Load last opened setlist
        const lastSetlistId = await storageManager.getSetting('lastOpenedSetlist');
        if (lastSetlistId) {
            try {
                await openSetlist(lastSetlistId);
            } catch (error) {
                console.log('Could not load last setlist');
                showEmptyState();
            }
        } else {
            showEmptyState();
        }

        console.log('✅ Application initialized');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize application: ' + error.message);
    }
}

// ===== EVENT LISTENERS SETUP =====

function setupEventListeners() {
    // Controller events
    controller.addEventListener('setlistLoaded', handleSetlistLoaded);
    controller.addEventListener('songChanged', handleSongChanged);
    controller.addEventListener('songAdded', () => renderSongsList());
    controller.addEventListener('songDeleted', () => renderSongsList());
    controller.addEventListener('snapshotRecorded', () => renderSnapshots());
    controller.addEventListener('snapshotDeleted', () => renderSnapshots());

    // UI events
    document.getElementById('new-setlist-btn').addEventListener('click', createNewSetlist);
    document.getElementById('add-song-btn').addEventListener('click', addNewSong);
    document.getElementById('prev-song-btn').addEventListener('click', () => controller.previousSong());
    document.getElementById('next-song-btn').addEventListener('click', () => controller.nextSong());
    document.getElementById('settings-btn').addEventListener('click', openSettings);

    // Modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    // Song notes auto-save
    let notesTimeout;
    document.getElementById('song-notes').addEventListener('input', (e) => {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => {
            const song = controller.getCurrentSong();
            if (song) {
                controller.updateSong(song.id, { notes: e.target.value });
            }
        }, 500);
    });
}

// ===== SETLIST FUNCTIONS =====

async function loadSetlistsList() {
    const setlists = await controller.getAllSetlists();
    const listContainer = document.getElementById('setlist-list');
    
    listContainer.innerHTML = '';

    if (setlists.length === 0) {
        listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 1rem;">No setlists yet</p>';
        return;
    }

    setlists.forEach(setlist => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (currentSetlistId === setlist.id) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">${escapeHtml(setlist.name)}</div>
                    <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5);">
                        ${setlist.songs.length} songs
                    </div>
                </div>
                <button class="icon-btn" onclick="deleteSetlistConfirm('${setlist.id}')" style="width: 30px; height: 30px; font-size: 1rem;">🗑️</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-btn')) {
                openSetlist(setlist.id);
            }
        });

        listContainer.appendChild(item);
    });
}

async function createNewSetlist() {
    const name = prompt('Enter setlist name:');
    if (!name) return;

    try {
        const setlist = await controller.createSetlist(name);
        await loadSetlistsList();
        await openSetlist(setlist.id);
    } catch (error) {
        alert('Error creating setlist: ' + error.message);
    }
}

async function openSetlist(id) {
    try {
        await controller.loadSetlist(id);
        currentSetlistId = id;
        await storageManager.saveSetting('lastOpenedSetlist', id);
    } catch (error) {
        alert('Error loading setlist: ' + error.message);
    }
}

async function deleteSetlistConfirm(id) {
    const setlist = await storageManager.getSetlist(id);
    if (!setlist) return;

    if (confirm(`Delete setlist "${setlist.name}"?`)) {
        await controller.deleteSetlist(id);
        await loadSetlistsList();
        
        if (currentSetlistId === id) {
            showEmptyState();
            currentSetlistId = null;
        }
    }
}

function handleSetlistLoaded(setlist) {
    document.getElementById('no-setlist').style.display = 'none';
    document.getElementById('active-setlist').style.display = 'flex';
    
    renderSongsList();
    renderCurrentSong();
}

// ===== SONG FUNCTIONS =====

async function addNewSong() {
    if (!controller.isSetlistLoaded()) {
        alert('Please create or open a setlist first');
        return;
    }

    showModal('Add Song', `
        <form id="add-song-form">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Title</label>
                <input type="text" name="title" required style="width: 100%; padding: 0.8rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem;">Tempo (BPM)</label>
                    <input type="number" name="tempo" value="120" min="40" max="240" style="width: 100%; padding: 0.8rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem;">Key</label>
                    <input type="text" name="key" value="C" maxlength="3" style="width: 100%; padding: 0.8rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem;">
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem;">Add Song</button>
        </form>
    `);

    document.getElementById('add-song-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        await controller.addSong({
            title: formData.get('title'),
            tempo: parseInt(formData.get('tempo')),
            key: formData.get('key')
        });

        closeModal();
    });
}

function renderSongsList() {
    const setlist = controller.currentSetlist;
    if (!setlist) return;

    const listContainer = document.getElementById('songs-list');
    listContainer.innerHTML = '';

    if (setlist.songs.length === 0) {
        listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 1rem;">No songs yet</p>';
        return;
    }

    setlist.songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (index === controller.currentSongIndex) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${escapeHtml(song.title)}</div>
                    <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5);">
                        ${song.tempo} BPM • ${song.key} • ${song.snapshots.length} snapshots
                    </div>
                </div>
                <button class="icon-btn" onclick="deleteSongConfirm('${song.id}')" style="width: 30px; height: 30px; font-size: 0.9rem;">🗑️</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-btn')) {
                controller.goToSong(index);
            }
        });

        listContainer.appendChild(item);
    });
}

async function deleteSongConfirm(songId) {
    const song = controller.currentSetlist.songs.find(s => s.id === songId);
    if (!song) return;

    if (confirm(`Delete song "${song.title}"?`)) {
        await controller.deleteSong(songId);
    }
}

function handleSongChanged({ song, index }) {
    renderCurrentSong();
    renderSongsList();
}

function renderCurrentSong() {
    const song = controller.getCurrentSong();
    if (!song) {
        showEmptyState();
        return;
    }

    document.getElementById('current-song-title').textContent = song.title;
    document.getElementById('song-tempo').textContent = `${song.tempo} BPM`;
    document.getElementById('song-key').textContent = song.key;
    document.getElementById('song-notes').value = song.notes || '';
    document.getElementById('current-index').textContent = controller.currentSongIndex + 1;
    document.getElementById('total-songs').textContent = controller.currentSetlist.songs.length;

    // Update navigation buttons
    document.getElementById('prev-song-btn').disabled = controller.currentSongIndex === 0;
    document.getElementById('next-song-btn').disabled = 
        controller.currentSongIndex === controller.currentSetlist.songs.length - 1;

    renderSnapshots();
}

// ===== SNAPSHOT FUNCTIONS =====

function renderSnapshots() {
    const song = controller.getCurrentSong();
    if (!song) return;

    const grid = document.getElementById('snapshots-grid');
    grid.innerHTML = '';

    // Render existing snapshots
    song.snapshots.forEach(snapshot => {
        const btn = document.createElement('button');
        btn.className = 'snapshot-btn';
        btn.textContent = snapshot.name;
        
        btn.addEventListener('click', () => {
            controller.triggerSnapshot(song.id, snapshot.id);
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = '', 100);
        });

        // Long press to delete
        let longPressTimer;
        btn.addEventListener('mousedown', () => {
            longPressTimer = setTimeout(() => {
                if (confirm(`Delete snapshot "${snapshot.name}"?`)) {
                    controller.deleteSnapshot(song.id, snapshot.id);
                }
            }, 1000);
        });
        btn.addEventListener('mouseup', () => clearTimeout(longPressTimer));
        btn.addEventListener('mouseleave', () => clearTimeout(longPressTimer));

        grid.appendChild(btn);
    });

    // Add "Record New" button
    const newBtn = document.createElement('button');
    newBtn.className = 'snapshot-btn new-snapshot-btn';
    newBtn.innerHTML = '+ Record<br>Snapshot';
    newBtn.addEventListener('click', recordNewSnapshot);
    grid.appendChild(newBtn);
}

async function recordNewSnapshot() {
    const song = controller.getCurrentSong();
    if (!song) return;

    const name = prompt('Snapshot name:', `Snapshot ${song.snapshots.length + 1}`);
    if (!name) return;

    try {
        await controller.recordSnapshot(song.id, name);
    } catch (error) {
        alert('Error recording snapshot: ' + error.message);
    }
}

// ===== UI HELPERS =====

function showEmptyState() {
    document.getElementById('no-setlist').style.display = 'flex';
    document.getElementById('active-setlist').style.display = 'none';
}

function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

function updateMIDIStatus(connected) {
    const statusEl = document.getElementById('midi-status');
    const textEl = statusEl.querySelector('.status-text');
    
    if (connected) {
        statusEl.classList.remove('disconnected');
        statusEl.classList.add('connected');
        textEl.textContent = `MIDI Connected (${midiManager.outputs.length} outputs)`;
    } else {
        statusEl.classList.add('disconnected');
        statusEl.classList.remove('connected');
        textEl.textContent = 'MIDI Disconnected';
    }
}

function openSettings() {
    showModal('Settings', `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <button class="btn btn-secondary" onclick="exportCurrentSetlist()">📤 Export Setlist</button>
            <button class="btn btn-secondary" onclick="importSetlist()">📥 Import Setlist</button>
            <button class="btn btn-secondary" onclick="exportAllData()">📦 Export All Data</button>
            <button class="btn btn-secondary" onclick="importAllData()">📦 Import All Data</button>
            <hr style="border: 1px solid var(--border);">
            <button class="btn" style="background: var(--danger);" onclick="clearAllDataConfirm()">🗑️ Clear All Data</button>
        </div>
    `);
}

async function exportCurrentSetlist() {
    if (!currentSetlistId) {
        alert('No setlist loaded');
        return;
    }
    await storageManager.exportSetlist(currentSetlistId);
}

function importSetlist() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        try {
            await storageManager.importSetlist(text);
            await loadSetlistsList();
            alert('Setlist imported successfully!');
            closeModal();
        } catch (error) {
            alert('Import failed: ' + error.message);
        }
    };
    input.click();
}

async function exportAllData() {
    await storageManager.exportAllData();
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        try {
            await storageManager.importAllData(text);
            await loadSetlistsList();
            alert('Data imported successfully!');
            closeModal();
            location.reload();
        } catch (error) {
            alert('Import failed: ' + error.message);
        }
    };
    input.click();
}

async function clearAllDataConfirm() {
    const confirmed = await storageManager.clearAllData();
    if (confirmed) {
        closeModal();
        location.reload();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== INITIALIZE ON LOAD =====

window.addEventListener('DOMContentLoaded', initializeApp);

// Setup touch handlers
touchHandler.setupSwipe(document.querySelector('.song-view'), {
    onSwipeLeft: () => controller.nextSong(),
    onSwipeRight: () => controller.previousSong()
});

// Setup animations for snapshot buttons
controller.addEventListener('snapshotTriggered', ({ snapshotId }) => {
    const btn = document.querySelector(`[data-snapshot-id="${snapshotId}"]`);
    if (btn) animationsController.animateSnapshotTrigger(btn);
});

// Show toast on events
controller.addEventListener('setlistCreated', (setlist) => {
    animationsController.showToast(`✅ Created "${setlist.name}"`, 'success');
});

controller.addEventListener('snapshotRecorded', () => {
    animationsController.showToast('📸 Snapshot recorded', 'success');
    touchHandler.triggerHaptic('medium');
});
