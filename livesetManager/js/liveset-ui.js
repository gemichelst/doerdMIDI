// ===== UI MANAGER =====

class LiveSetUI {
    constructor(controller) {
        this.controller = controller;
        this.currentEditingChannel = null;
    }

    // ===== INITIALIZATION =====

    initialize() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Controller events
        this.controller.addEventListener('livesetCreated', () => this.loadLiveSetsList());
        this.controller.addEventListener('livesetLoaded', (liveset) => this.renderLiveSet(liveset));
        this.controller.addEventListener('livesetUpdated', (liveset) => this.updateLiveSetDisplay(liveset));
        this.controller.addEventListener('livesetDeleted', () => this.loadLiveSetsList());
        this.controller.addEventListener('trackAdded', () => this.renderTracks());
        this.controller.addEventListener('trackDeleted', () => this.renderTracks());
        this.controller.addEventListener('trackUpdated', () => this.renderTracks());
        this.controller.addEventListener('trackSelected', (track) => this.showTrackDetails(track));
        this.controller.addEventListener('channelAdded', () => this.renderChannelsList());
        this.controller.addEventListener('channelDeleted', () => this.renderChannelsList());
        this.controller.addEventListener('sectionAdded', () => this.renderSectionsList());
        this.controller.addEventListener('sectionDeleted', () => this.renderSectionsList());

        // UI events
        document.getElementById('new-set-btn').addEventListener('click', () => this.createNewSet());
        document.getElementById('add-track-btn').addEventListener('click', () => this.addNewTrack());
        document.getElementById('performance-mode-btn').addEventListener('click', () => this.enterPerformanceMode());
        
        // Set name input
        document.getElementById('set-name-input').addEventListener('input', (e) => {
            this.updateSetName(e.target.value);
        });

        // Master BPM input
        document.getElementById('master-bpm').addEventListener('input', (e) => {
            this.updateMasterBPM(parseInt(e.target.value));
        });

        // Track details form
        document.getElementById('save-track-details').addEventListener('click', () => this.saveTrackDetails());
        
        // Energy slider
        document.getElementById('detail-energy').addEventListener('input', (e) => {
            document.getElementById('energy-value-display').textContent = e.target.value;
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    }

    async loadInitialData() {
        await this.loadLiveSetsList();
        
        // Load last opened set
        const lastSetId = await this.controller.storage.getSetting('lastOpenedSet');
        if (lastSetId) {
            try {
                await this.controller.loadLiveSet(lastSetId);
            } catch (error) {
                console.log('Could not load last set');
                this.showEmptyState();
            }
        } else {
            this.showEmptyState();
        }
    }

    // ===== LIVESET LIST =====

    async loadLiveSetsList() {
        const livesets = await this.controller.getAllLiveSets();
        const container = document.getElementById('sets-list');
        
        container.innerHTML = '';

        if (livesets.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No live sets yet</p>';
            return;
        }

        livesets.forEach(liveset => {
            const item = this.createSetListItem(liveset);
            container.appendChild(item);
        });
    }

    createSetListItem(liveset) {
        const item = document.createElement('div');
        item.className = 'set-item';
        if (this.controller.currentLiveSet && this.controller.currentLiveSet.id === liveset.id) {
            item.classList.add('active');
        }

        const duration = formatDuration(liveset.totalDuration);
        
        item.innerHTML = `
            <div class="set-item-header">
                <div class="set-item-name">${this.escapeHtml(liveset.name)}</div>
                <div class="set-item-actions">
                    <button class="icon-btn" style="width: 30px; height: 30px; font-size: 0.9rem;" 
                        onclick="ui.exportSet('${liveset.id}')" title="Export">📤</button>
                    <button class="icon-btn" style="width: 30px; height: 30px; font-size: 0.9rem;" 
                        onclick="ui.deleteSetConfirm('${liveset.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="set-item-meta">
                <span>${liveset.tracks.length} tracks</span>
                <span>${duration}</span>
                <span>⚡ ${liveset.averageEnergy}</span>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-btn')) {
                this.openLiveSet(liveset.id);
            }
        });

        return item;
    }

    // ===== LIVESET MANAGEMENT =====

    async createNewSet() {
        const name = prompt('Enter live set name:');
        if (!name) return;

        try {
            const liveset = await this.controller.createLiveSet(name);
            await this.openLiveSet(liveset.id);
            this.showToast(`✅ Created "${liveset.name}"`, 'success');
        } catch (error) {
            this.showToast('❌ Error creating live set', 'error');
        }
    }

    async openLiveSet(id) {
        try {
            await this.controller.loadLiveSet(id);
            await this.controller.storage.saveSetting('lastOpenedSet', id);
            this.loadLiveSetsList();
        } catch (error) {
            this.showToast('❌ Error loading live set', 'error');
        }
    }

    async deleteSetConfirm(id) {
        const liveset = await this.controller.storage.getLiveSet(id);
        if (!liveset) return;

        if (confirm(`Delete live set "${liveset.name}"?`)) {
            await this.controller.deleteLiveSet(id);
            this.showToast('🗑️ Live set deleted', 'success');
        }
    }

    async exportSet(id) {
        try {
            await this.controller.storage.exportLiveSet(id);
            this.showToast('📤 Live set exported', 'success');
        } catch (error) {
            this.showToast('❌ Export failed', 'error');
        }
    }

    // ===== RENDER LIVESET =====

    renderLiveSet(liveset) {
        document.getElementById('no-set-loaded').style.display = 'none';
        document.getElementById('set-editor').style.display = 'block';

        document.getElementById('set-name-input').value = liveset.name;
        document.getElementById('master-bpm').value = liveset.masterBPM;
        document.getElementById('header-set-name').textContent = liveset.name;
        document.getElementById('header-track-count').textContent = `${liveset.tracks.length} tracks`;

        this.updateLiveSetDisplay(liveset);
        this.renderTracks();

        // Enable performance mode button
        document.getElementById('performance-mode-btn').disabled = liveset.tracks.length === 0;
    }

    updateLiveSetDisplay(liveset) {
        const duration = formatDuration(liveset.totalDuration);
        document.getElementById('total-duration-display').textContent = duration;
        document.getElementById('avg-energy-display').textContent = liveset.averageEnergy || '-';
    }

    async updateSetName(name) {
        if (!this.controller.currentLiveSet) return;
        await this.controller.updateLiveSet({ name });
        document.getElementById('header-set-name').textContent = name;
        this.loadLiveSetsList();
    }

    async updateMasterBPM(bpm) {
        if (!this.controller.currentLiveSet) return;
        await this.controller.updateLiveSet({ masterBPM: bpm });
    }

    showEmptyState() {
        document.getElementById('no-set-loaded').style.display = 'flex';
        document.getElementById('set-editor').style.display = 'none';
        document.getElementById('header-set-name').textContent = 'No Set Loaded';
        document.getElementById('header-track-count').textContent = '0 tracks';
        document.getElementById('performance-mode-btn').disabled = true;
    }

    // ===== TRACKS =====

    renderTracks() {
        if (!this.controller.currentLiveSet) return;

        const container = document.getElementById('tracks-container');
        container.innerHTML = '';

        if (this.controller.currentLiveSet.tracks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No tracks yet. Click "Add Track" to start.</p>';
            return;
        }

        this.controller.currentLiveSet.tracks.forEach((track, index) => {
            const card = this.createTrackCard(track, index);
            container.appendChild(card);
        });
    }

    createTrackCard(track, index) {
        const card = document.createElement('div');
        card.className = 'track-card';
        if (this.controller.selectedTrackId === track.id) {
            card.classList.add('selected');
        }
        card.style.setProperty('--track-color', track.color);

        const genres = track.genres.join(', ') || 'No genre';
        
        card.innerHTML = `
            <div class="track-card-header">
                <div class="track-number">#${index + 1}</div>
                <div class="track-info">
                    <div class="track-name">${this.escapeHtml(track.name)}</div>
                    <div class="track-meta">
                        <span class="badge key-badge">${track.key} ${track.mode}</span>
                        <span class="badge energy-badge">⚡ ${track.energy}</span>
                        <span class="badge genre-badge">${genres}</span>
                        <span class="badge duration-badge">⏱ ${track.duration}</span>
                    </div>
                </div>
                <div class="track-actions">
                    <button class="icon-btn" style="width: 35px; height: 35px;" 
                        onclick="ui.moveTrackUp('${track.id}')" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                    <button class="icon-btn" style="width: 35px; height: 35px;" 
                        onclick="ui.moveTrackDown('${track.id}')" ${index === this.controller.currentLiveSet.tracks.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                    <button class="icon-btn" style="width: 35px; height: 35px;" 
                        onclick="ui.deleteTrackConfirm('${track.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            ${track.channels.length > 0 ? `
                <div class="track-channels">
                    <div class="channels-summary">
                        ${track.channels.map(ch => `<span class="channel-chip">${this.escapeHtml(ch.name)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-btn')) {
                this.controller.selectTrack(track.id);
            }
        });

        return card;
    }

    async addNewTrack() {
        if (!this.controller.currentLiveSet) {
            this.showToast('⚠️ Create a live set first', 'warning');
            return;
        }

        const trackNumber = this.controller.currentLiveSet.tracks.length + 1;
        const track = await this.controller.addTrack({
            name: `Track ${trackNumber}`,
            bpm: this.controller.currentLiveSet.masterBPM,
            color: generateColor()
        });

        this.showToast(`✅ Track added`, 'success');
        this.controller.selectTrack(track.id);
    }

    async deleteTrackConfirm(trackId) {
        const track = this.controller.currentLiveSet.getTrackById(trackId);
        if (!track) return;

        if (confirm(`Delete track "${track.name}"?`)) {
            await this.controller.deleteTrack(trackId);
            this.closeTrackDetails();
            this.showToast('🗑️ Track deleted', 'success');
        }
    }

    async moveTrackUp(trackId) {
        const index = this.controller.currentLiveSet.tracks.findIndex(t => t.id === trackId);
        if (index > 0) {
            await this.controller.moveTrack(trackId, index - 1);
            this.renderTracks();
        }
    }

    async moveTrackDown(trackId) {
        const index = this.controller.currentLiveSet.tracks.findIndex(t => t.id === trackId);
        if (index < this.controller.currentLiveSet.tracks.length - 1) {
            await this.controller.moveTrack(trackId, index + 1);
            this.renderTracks();
        }
    }

    // ===== TRACK DETAILS =====

    showTrackDetails(track) {
        if (!track) {
            this.closeTrackDetails();
            return;
        }

        document.getElementById('no-track-selected').style.display = 'none';
        document.getElementById('track-details').style.display = 'flex';

        // Populate form
        document.getElementById('detail-track-name').value = track.name;
        document.getElementById('detail-bpm').value = track.bpm;
        document.getElementById('detail-key').value = track.key;
        document.getElementById('detail-mode').value = track.mode;
        document.getElementById('detail-duration').value = track.duration;
        document.getElementById('detail-energy').value = track.energy;
        document.getElementById('energy-value-display').textContent = track.energy;
        document.getElementById('detail-genres').value = track.genres.join(', ');
        document.getElementById('detail-color').value = track.color;
        document.getElementById('detail-notes').value = track.notes;
        document.getElementById('detail-transition-type').value = track.transitionType;
        document.getElementById('detail-transition-bars').value = track.transitionBars;
        document.getElementById('detail-transition-notes').value = track.transitionNotes;

        this.renderChannelsList();
        this.renderSectionsList();
    }

    closeTrackDetails() {
        document.getElementById('no-track-selected').style.display = 'flex';
        document.getElementById('track-details').style.display = 'none';
        this.controller.selectedTrackId = null;
        this.renderTracks();
    }

    async saveTrackDetails() {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const updates = {
            name: document.getElementById('detail-track-name').value,
            bpm: parseInt(document.getElementById('detail-bpm').value),
            key: document.getElementById('detail-key').value,
            mode: document.getElementById('detail-mode').value,
            duration: document.getElementById('detail-duration').value,
            energy: parseInt(document.getElementById('detail-energy').value),
            genres: document.getElementById('detail-genres').value.split(',').map(g => g.trim()).filter(g => g),
            color: document.getElementById('detail-color').value,
            notes: document.getElementById('detail-notes').value,
            transitionType: document.getElementById('detail-transition-type').value,
            transitionBars: parseInt(document.getElementById('detail-transition-bars').value),
            transitionNotes: document.getElementById('detail-transition-notes').value
        };

        await this.controller.updateTrack(track.id, updates);
        this.showToast('💾 Track saved', 'success');
    }

    // ===== CHANNELS =====

    renderChannelsList() {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const container = document.getElementById('channels-list');
        container.innerHTML = '';

        if (track.channels.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; padding: 1rem 0;">No channels yet</p>';
            return;
        }

        track.channels.forEach(channel => {
            const item = this.createChannelItem(channel);
            container.appendChild(item);
        });
    }

    createChannelItem(channel) {
        const item = document.createElement('div');
        item.className = 'channel-item';

        item.innerHTML = `
            <div class="channel-item-info">
                <div class="channel-item-name">${this.escapeHtml(channel.name)}</div>
                <div class="channel-item-type">${channel.type} • MIDI Ch ${channel.midiChannel}</div>
            </div>
            <div class="channel-item-actions">
                <button class="icon-btn" style="width: 30px; height: 30px; font-size: 0.9rem;" 
                    onclick="ui.editChannel('${channel.id}')">✏️</button>
                <button class="icon-btn" style="width: 30px; height: 30px; font-size: 0.9rem;" 
                    onclick="ui.deleteChannelConfirm('${channel.id}')">🗑️</button>
            </div>
        `;

        return item;
    }

    addChannel() {
        const track = this.controller.getSelectedTrack();
        if (!track) {
            this.showToast('⚠️ Select a track first', 'warning');
            return;
        }

        this.currentEditingChannel = null;
        this.openChannelModal();
    }

    editChannel(channelId) {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const channel = track.channels.find(c => c.id === channelId);
        if (!channel) return;

        this.currentEditingChannel = channel;
        this.openChannelModal(channel);
    }

    async deleteChannelConfirm(channelId) {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const channel = track.channels.find(c => c.id === channelId);
        if (!channel) return;

        if (confirm(`Delete channel "${channel.name}"?`)) {
            await this.controller.deleteChannel(track.id, channelId);
            this.showToast('🗑️ Channel deleted', 'success');
        }
    }

    // ===== CHANNEL MODAL =====

    openChannelModal(channel = null) {
        document.getElementById('channel-modal').style.display = 'flex';

        if (channel) {
            document.getElementById('channel-type').value = channel.type;
            document.getElementById('channel-name').value = channel.name;
            document.getElementById('channel-midi').value = channel.midiChannel;
            document.getElementById('channel-notes').value = channel.notes;
        } else {
            document.getElementById('channel-type').value = 'drums';
            document.getElementById('channel-name').value = '';
            document.getElementById('channel-midi').value = '1';
            document.getElementById('channel-notes').value = '';
        }

        this.updateChannelForm();
    }

    closeChannelModal() {
        document.getElementById('channel-modal').style.display = 'none';
        this.currentEditingChannel = null;
    }

    updateChannelForm() {
        const type = document.getElementById('channel-type').value;
        const container = document.getElementById('channel-type-fields');
        
        container.innerHTML = this.getChannelTypeFields(type);
    }

    getChannelTypeFields(type) {
        const fields = {
            drums: `
                <div class="form-group">
                    <label>Plugin/Device Name</label>
                    <input type="text" id="ch-plugin" class="form-control" placeholder="e.g., Battery 4, Addictive Drums">
                </div>
                <div class="form-group">
                    <label>Preset/Kit Name</label>
                    <input type="text" id="ch-preset" class="form-control" placeholder="e.g., Techno Kit 01">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Pattern Number</label>
                        <input type="text" id="ch-pattern" class="form-control" placeholder="e.g., A1">
                    </div>
                    <div class="form-group">
                        <label>Swing Amount</label>
                        <input type="number" id="ch-swing" class="form-control" min="0" max="100" placeholder="0-100">
                    </div>
                </div>
                <div class="form-group">
                    <label>Velocity Curve</label>
                    <select id="ch-velocity" class="form-control">
                        <option>Linear</option>
                        <option>Logarithmic</option>
                        <option>Exponential</option>
                        <option>S-Curve</option>
                    </select>
                </div>
            `,
            
            synth: `
                <div class="form-group">
                    <label>Synth Type</label>
                    <select id="ch-synth-type" class="form-control">
                        <option>Lead</option>
                        <option>Bass</option>
                        <option>Pad</option>
                        <option>Arp</option>
                        <option>Pluck</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Plugin Name</label>
                    <input type="text" id="ch-plugin" class="form-control" placeholder="e.g., Serum, Massive, Diva">
                </div>
                <div class="form-group">
                    <label>Preset Name</label>
                    <input type="text" id="ch-preset" class="form-control" placeholder="Preset name">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Layer Number</label>
                        <input type="number" id="ch-layer" class="form-control" min="1" value="1">
                    </div>
                    <div class="form-group">
                        <label>Filter Type</label>
                        <select id="ch-filter" class="form-control">
                            <option>Lowpass</option>
                            <option>Highpass</option>
                            <option>Bandpass</option>
                            <option>Notch</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>LFO Settings</label>
                    <input type="text" id="ch-lfo" class="form-control" placeholder="e.g., LFO1 -> Filter, 1/4">
                </div>
            `,
            
            external: `
                <div class="form-group">
                    <label>Device Type</label>
                    <select id="ch-device-type" class="form-control">
                        <option>Drum Machine</option>
                        <option>Sampler</option>
                        <option>Synth</option>
                        <option>Groovebox</option>
                        <option>Instrument</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Device Model</label>
                    <input type="text" id="ch-model" class="form-control" placeholder="e.g., TR-808, Digitakt, Prophet-6">
                </div>
                <div class="form-group">
                    <label>Patch/Program Number</label>
                    <input type="text" id="ch-patch" class="form-control" placeholder="e.g., A01, Bank 2-05">
                </div>
                <div class="form-group">
                    <label>CV/Gate Routing</label>
                    <input type="text" id="ch-cv" class="form-control" placeholder="e.g., CV1 -> VCO Pitch, Gate -> Env">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Audio Routing</label>
                        <select id="ch-audio-routing" class="form-control">
                            <option>Stereo</option>
                            <option>Mono</option>
                            <option>Left Only</option>
                            <option>Right Only</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Audio Channel</label>
                        <input type="text" id="ch-audio-ch" class="form-control" placeholder="e.g., 3-4">
                    </div>
                </div>
            `,
            
            percussion: `
                <div class="form-group">
                    <label>Source</label>
                    <input type="text" id="ch-source" class="form-control" placeholder="e.g., Sample Pack, Plugin, Hardware">
                </div>
                <div class="form-group">
                    <label>Pattern Type</label>
                    <input type="text" id="ch-pattern-type" class="form-control" placeholder="e.g., Shaker Loop, Conga Pattern">
                </div>
                <div class="form-group">
                    <label>Groove Template</label>
                    <input type="text" id="ch-groove" class="form-control" placeholder="e.g., MPC 60, Live Drummer">
                </div>
            `,
            
            vocal: `
                <div class="form-group">
                    <label>Sample Name/Path</label>
                    <input type="text" id="ch-sample" class="form-control" placeholder="Sample filename or path">
                </div>
                <div class="form-group">
                    <label>Processing Chain</label>
                    <input type="text" id="ch-processing" class="form-control" placeholder="e.g., EQ -> Comp -> Reverb">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Key/Pitch</label>
                        <input type="text" id="ch-key" class="form-control" placeholder="e.g., C, Eb">
                    </div>
                    <div class="form-group">
                        <label>Time Stretch</label>
                        <input type="text" id="ch-timestretch" class="form-control" placeholder="e.g., Complex Pro, -3 st">
                    </div>
                </div>
            `,
            
            fx: `
                <div class="form-group">
                    <label>FX Type</label>
                    <select id="ch-fx-type" class="form-control">
                        <option>Reverb</option>
                        <option>Delay</option>
                        <option>Chorus</option>
                        <option>Flanger</option>
                        <option>Phaser</option>
                        <option>Distortion</option>
                        <option>Filter</option>
                        <option>Compression</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Plugin Name</label>
                    <input type="text" id="ch-plugin" class="form-control" placeholder="e.g., Valhalla VintageVerb">
                </div>
                <div class="form-group">
                    <label>Preset Name</label>
                    <input type="text" id="ch-preset" class="form-control">
                </div>
                <div class="form-group">
                    <label>Send Amount (%)</label>
                    <input type="range" id="ch-send" class="form-control" min="0" max="100" value="50">
                    <span id="send-value">50%</span>
                </div>
                <div class="form-group">
                    <label>Automation</label>
                    <textarea id="ch-automation" class="form-control textarea" rows="2" placeholder="Automation notes"></textarea>
                </div>
            `,
            
            automation: `
                <div class="form-group">
                    <label>Parameter Name</label>
                    <input type="text" id="ch-param" class="form-control" placeholder="e.g., Filter Cutoff, Reverb Send">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Start Value</label>
                        <input type="number" id="ch-start" class="form-control" min="0" max="127" value="0">
                    </div>
                    <div class="form-group">
                        <label>End Value</label>
                        <input type="number" id="ch-end" class="form-control" min="0" max="127" value="127">
                    </div>
                </div>
                <div class="form-group">
                    <label>Curve Type</label>
                    <select id="ch-curve" class="form-control">
                        <option>Linear</option>
                        <option>Exponential</option>
                        <option>Logarithmic</option>
                        <option>S-Curve</option>
                    </select>
                </div>
            `,
            
            master: `
                <div class="form-group">
                    <label>Bus Name</label>
                    <input type="text" id="ch-bus" class="form-control" placeholder="e.g., Drums Bus, Master">
                </div>
                <div class="form-group">
                    <label>Routing</label>
                    <input type="text" id="ch-routing" class="form-control" placeholder="e.g., Kick + Snare -> Drums Bus">
                </div>
                <div class="form-group">
                    <label>FX Chain</label>
                    <textarea id="ch-fxchain" class="form-control textarea" rows="2" placeholder="e.g., EQ -> Glue Comp -> Limiter"></textarea>
                </div>
                <div class="form-group">
                    <label>Level (dB)</label>
                    <input type="number" id="ch-level" class="form-control" step="0.1" value="0">
                </div>
            `
        };

        return fields[type] || '';
    }

    async saveChannel() {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const type = document.getElementById('channel-type').value;
        const name = document.getElementById('channel-name').value;
        const midiChannel = parseInt(document.getElementById('channel-midi').value);
        const notes = document.getElementById('channel-notes').value;

        if (!name) {
            this.showToast('⚠️ Channel name required', 'warning');
            return;
        }

        const typeSpecific = this.getChannelTypeSpecificData(type);

        const channelData = {
            type,
            name,
            midiChannel,
            notes,
            typeSpecific
        };

        if (this.currentEditingChannel) {
            await this.controller.updateChannel(track.id, this.currentEditingChannel.id, channelData);
            this.showToast('💾 Channel updated', 'success');
        } else {
            await this.controller.addChannel(track.id, channelData);
            this.showToast('✅ Channel added', 'success');
        }

        this.closeChannelModal();
    }

    getChannelTypeSpecificData(type) {
        const data = {};

        switch(type) {
            case 'drums':
                data.pluginName = this.getValueSafe('ch-plugin');
                data.presetName = this.getValueSafe('ch-preset');
                data.patternNumber = this.getValueSafe('ch-pattern');
                data.swingAmount = parseInt(this.getValueSafe('ch-swing') || 0);
                data.velocityCurve = this.getValueSafe('ch-velocity');
                break;

            case 'synth':
                data.synthType = this.getValueSafe('ch-synth-type');
                data.pluginName = this.getValueSafe('ch-plugin');
                data.presetName = this.getValueSafe('ch-preset');
                data.layerNumber = parseInt(this.getValueSafe('ch-layer') || 1);
                data.filterType = this.getValueSafe('ch-filter');
                data.lfoSettings = this.getValueSafe('ch-lfo');
                break;

            case 'external':
                data.deviceType = this.getValueSafe('ch-device-type');
                data.deviceModel = this.getValueSafe('ch-model');
                data.patchNumber = this.getValueSafe('ch-patch');
                data.cvGateRouting = this.getValueSafe('ch-cv');
                data.audioRouting = this.getValueSafe('ch-audio-routing');
                data.audioChannel = this.getValueSafe('ch-audio-ch');
                break;

            case 'percussion':
                data.source = this.getValueSafe('ch-source');
                data.patternType = this.getValueSafe('ch-pattern-type');
                data.grooveTemplate = this.getValueSafe('ch-groove');
                break;

            case 'vocal':
                data.sampleName = this.getValueSafe('ch-sample');
                data.processingChain = this.getValueSafe('ch-processing');
                data.keyPitch = this.getValueSafe('ch-key');
                data.timeStretchSettings = this.getValueSafe('ch-timestretch');
                break;

            case 'fx':
                data.fxType = this.getValueSafe('ch-fx-type');
                data.pluginName = this.getValueSafe('ch-plugin');
                data.presetName = this.getValueSafe('ch-preset');
                data.sendAmount = parseInt(this.getValueSafe('ch-send') || 50);
                data.automation = this.getValueSafe('ch-automation');
                break;

            case 'automation':
                data.parameterName = this.getValueSafe('ch-param');
                data.startValue = parseInt(this.getValueSafe('ch-start') || 0);
                data.endValue = parseInt(this.getValueSafe('ch-end') || 127);
                data.curveType = this.getValueSafe('ch-curve');
                break;

            case 'master':
                data.busName = this.getValueSafe('ch-bus');
                data.routing = this.getValueSafe('ch-routing');
                data.fxChain = this.getValueSafe('ch-fxchain');
                data.level = parseFloat(this.getValueSafe('ch-level') || 0);
                break;
        }

        return data;
    }

    getValueSafe(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    // ===== SECTIONS =====

    renderSectionsList() {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const container = document.getElementById('sections-list');
        container.innerHTML = '';

        if (track.sections.length === 0) {
            return;
        }

        track.sections.forEach(section => {
            const item = this.createSectionItem(section);
            container.appendChild(item);
        });
    }

    createSectionItem(section) {
        const item = document.createElement('div');
        item.className = 'section-item';

        const startTime = formatDuration(section.startTime);
        const endTime = formatDuration(section.endTime);

        item.innerHTML = `
            <div class="section-item-info">
                <div class="section-name">${this.escapeHtml(section.name)}</div>
                <div class="section-timing">${startTime} - ${endTime}</div>
            </div>
            <button class="icon-btn" style="width: 30px; height: 30px; font-size: 0.9rem;" 
                onclick="ui.deleteSectionConfirm('${section.id}')">🗑️</button>
        `;

        return item;
    }

    addArrangementSection() {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const name = prompt('Section name:', 'Intro');
        if (!name) return;

        const startTime = prompt('Start time (seconds):', '0');
        if (!startTime) return;

        const duration = prompt('Duration (seconds):', '30');
        if (!duration) return;

        this.controller.addSection(track.id, {
            name,
            startTime: parseInt(startTime),
            duration: parseInt(duration)
        });
    }

    async deleteSectionConfirm(sectionId) {
        const track = this.controller.getSelectedTrack();
        if (!track) return;

        const section = track.sections.find(s => s.id === sectionId);
        if (!section) return;

        if (confirm(`Delete section "${section.name}"?`)) {
            await this.controller.deleteSection(track.id, sectionId);
            this.showToast('🗑️ Section deleted', 'success');
        }
    }

    // ===== SETTINGS =====

    openSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Settings</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <button class="btn btn-secondary" onclick="ui.exportAllData()">📤 Export All Data</button>
                        <button class="btn btn-secondary" onclick="ui.importData()">📥 Import Data</button>
                        <hr style="border: 1px solid var(--border);">
                        <button class="btn" style="background: var(--danger);" onclick="ui.clearAllData()">🗑️ Clear All Data</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async exportAllData() {
        await this.controller.storage.exportAllData();
        this.showToast('📤 Data exported', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text);
                
                if (data.livesets && Array.isArray(data.livesets)) {
                    for (const liveset of data.livesets) {
                        await this.controller.storage.saveLiveSet(liveset);
                    }
                    this.loadLiveSetsList();
                    this.showToast('📥 Data imported successfully', 'success');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                this.showToast('❌ Import failed: ' + error.message, 'error');
            }
        };
        input.click();
    }

    async clearAllData() {
        await this.controller.storage.clearAllData();
        window.location.reload();
    }

    // ===== UTILITIES =====

    enterPerformanceMode() {
        if (!this.controller.currentLiveSet || this.controller.currentLiveSet.tracks.length === 0) {
            this.showToast('⚠️ Add tracks first', 'warning');
            return;
        }

        performance.start(this.controller.currentLiveSet);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make functions globally available
window.ui = null;
