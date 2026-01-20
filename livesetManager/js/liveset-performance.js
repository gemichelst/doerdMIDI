// ===== PERFORMANCE MODE MANAGER =====

class PerformanceMode {
    constructor() {
        this.liveset = null;
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.trackStartTime = 0;
        this.trackElapsedTime = 0;
        this.animationFrameId = null;
        this.warningThreshold = 10; // seconds
    }

    // ===== INITIALIZATION =====

    start(liveset) {
        this.liveset = liveset;
        this.currentTrackIndex = 0;
        this.elapsedTime = 0;
        this.trackElapsedTime = 0;
        this.isPlaying = false;

        this.showPerformanceMode();
        this.renderPerformanceUI();
        this.setupPerformanceControls();
    }

    showPerformanceMode() {
        document.getElementById('performance-mode').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hidePerformanceMode() {
        document.getElementById('performance-mode').style.display = 'none';
        document.body.style.overflow = '';
        this.stop();
    }

    // ===== UI RENDERING =====

    renderPerformanceUI() {
        // Set total duration
        const totalDuration = formatDuration(this.liveset.totalDuration);
        document.getElementById('perf-set-duration').textContent = totalDuration;
        document.getElementById('perf-bpm').textContent = this.liveset.masterBPM;

        // Render current track
        this.renderCurrentTrack();

        // Render upcoming tracks
        this.renderUpcomingTracks();

        // Reset timers
        document.getElementById('perf-total-time').textContent = '00:00';
    }

    renderCurrentTrack() {
        const track = this.getCurrentTrack();
        if (!track) return;

        // Track info
        document.getElementById('perf-track-number').textContent = this.currentTrackIndex + 1;
        document.getElementById('perf-track-name').textContent = track.name;
        document.getElementById('perf-track-key').textContent = `${track.key} ${track.mode}`;
        document.getElementById('perf-track-energy').textContent = `⚡ ${track.energy}`;
        
        const genres = track.genres.join(', ') || 'Electronic';
        document.getElementById('perf-track-genre').textContent = genres;

        // Track duration
        document.getElementById('perf-track-duration').textContent = track.duration;
        document.getElementById('perf-track-elapsed').textContent = '00:00';
        document.getElementById('perf-remaining').textContent = `-${track.duration}`;

        // Progress bar
        document.getElementById('perf-progress-fill').style.width = '0%';
        document.getElementById('perf-progress-warning').classList.remove('active');

        // Arrangement sections
        this.renderArrangementSections(track);

        // Active channels
        this.renderActiveChannels(track);

        // Performance notes
        this.renderPerformanceNotes(track);
    }

    renderArrangementSections(track) {
        const container = document.getElementById('perf-sections');
        container.innerHTML = '';

        if (track.sections.length === 0) {
            const defaultSections = ['Intro', 'Build', 'Drop', 'Break', 'Outro'];
            const sectionDuration = track.durationSeconds / defaultSections.length;

            defaultSections.forEach((name, index) => {
                const marker = document.createElement('div');
                marker.className = 'section-marker';
                marker.innerHTML = `
                    <div class="section-marker-name">${name}</div>
                    <div class="section-marker-time">${formatDuration(Math.floor(index * sectionDuration))}</div>
                `;
                container.appendChild(marker);
            });
        } else {
            track.sections.forEach(section => {
                const marker = document.createElement('div');
                marker.className = 'section-marker';
                marker.dataset.startTime = section.startTime;
                marker.dataset.endTime = section.endTime;
                marker.innerHTML = `
                    <div class="section-marker-name">${section.name}</div>
                    <div class="section-marker-time">${formatDuration(section.startTime)}</div>
                `;
                container.appendChild(marker);
            });
        }
    }

    renderActiveChannels(track) {
        const container = document.getElementById('perf-channels-grid');
        container.innerHTML = '';

        if (track.channels.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No channels configured</p>';
            return;
        }

        track.channels.forEach(channel => {
            const channelEl = document.createElement('div');
            channelEl.className = 'channel-status';
            channelEl.style.setProperty('--channel-color', channel.color);

            let details = '';
            switch(channel.type) {
                case 'drums':
                    details = channel.typeSpecific.pluginName || 'Drums';
                    break;
                case 'synth':
                    details = `${channel.typeSpecific.synthType || 'Synth'} - ${channel.typeSpecific.pluginName || ''}`;
                    break;
                case 'external':
                    details = channel.typeSpecific.deviceModel || 'External Device';
                    break;
                default:
                    details = channel.type;
            }

            channelEl.innerHTML = `
                <div class="channel-status-header">
                    <div class="channel-status-name">${this.escapeHtml(channel.name)}</div>
                    <div class="channel-status-type">${channel.type}</div>
                </div>
                <div class="channel-status-details">${this.escapeHtml(details)}</div>
            `;

            container.appendChild(channelEl);
        });
    }

    renderPerformanceNotes(track) {
        const notesContainer = document.getElementById('perf-current-notes');
        
        if (track.notes) {
            notesContainer.innerHTML = `
                <h4>Track Notes</h4>
                <p>${this.escapeHtml(track.notes)}</p>
            `;
        } else {
            notesContainer.innerHTML = '<p style="color: var(--text-muted);">No notes for this track</p>';
        }

        // Transition notes
        const nextTrack = this.liveset.tracks[this.currentTrackIndex + 1];
        const transitionContainer = document.getElementById('perf-transition-notes');

        if (nextTrack) {
            transitionContainer.innerHTML = `
                <h4>Transition to Next Track</h4>
                <p><strong>Type:</strong> ${track.transitionType} (${track.transitionBars} bars)</p>
                ${track.transitionNotes ? `<p>${this.escapeHtml(track.transitionNotes)}</p>` : ''}
                <p style="margin-top: 0.5rem;"><strong>Next:</strong> ${this.escapeHtml(nextTrack.name)} (${nextTrack.key} ${nextTrack.mode})</p>
            `;
        } else {
            transitionContainer.innerHTML = `
                <h4>Final Track</h4>
                <p>This is the last track in your set</p>
            `;
        }
    }

    renderUpcomingTracks() {
        const container = document.getElementById('perf-upcoming-list');
        container.innerHTML = '';

        const upcomingTracks = this.liveset.tracks.slice(this.currentTrackIndex + 1, this.currentTrackIndex + 4);

        if (upcomingTracks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No more tracks</p>';
            return;
        }

        upcomingTracks.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'upcoming-track';

            trackEl.innerHTML = `
                <div class="upcoming-track-number">Track #${this.currentTrackIndex + index + 2}</div>
                <div class="upcoming-track-name">${this.escapeHtml(track.name)}</div>
                <div class="upcoming-track-info">
                    <span class="badge key-badge">${track.key} ${track.mode}</span>
                    <span class="badge duration-badge">⏱ ${track.duration}</span>
                    <span class="badge energy-badge">⚡ ${track.energy}</span>
                </div>
            `;

            container.appendChild(trackEl);
        });
    }

    // ===== PLAYBACK CONTROL =====

    setupPerformanceControls() {
        document.getElementById('perf-play-pause').onclick = () => this.togglePlayPause();
        document.getElementById('perf-prev').onclick = () => this.previousTrack();
        document.getElementById('perf-next').onclick = () => this.nextTrack();
        document.getElementById('perf-reset').onclick = () => this.reset();
        document.getElementById('perf-exit').onclick = () => this.exit();

        this.updateControlButtons();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.startTime = Date.now() - (this.elapsedTime * 1000);
        this.trackStartTime = Date.now() - (this.trackElapsedTime * 1000);

        const playPauseBtn = document.getElementById('perf-play-pause');
        playPauseBtn.textContent = '⏸ Pause';
        playPauseBtn.classList.add('playing');

        this.startTimer();
    }

    pause() {
        this.isPlaying = false;

        const playPauseBtn = document.getElementById('perf-play-pause');
        playPauseBtn.textContent = '▶ Play';
        playPauseBtn.classList.remove('playing');

        this.stopTimer();
    }

    stop() {
        this.isPlaying = false;
        this.stopTimer();
    }

    reset() {
        this.stop();
        this.currentTrackIndex = 0;
        this.elapsedTime = 0;
        this.trackElapsedTime = 0;
        
        this.renderPerformanceUI();
        this.updateControlButtons();

        const playPauseBtn = document.getElementById('perf-play-pause');
        playPauseBtn.textContent = '▶ Play';
        playPauseBtn.classList.remove('playing');
    }

    exit() {
        if (this.isPlaying) {
            if (!confirm('Performance is running. Are you sure you want to exit?')) {
                return;
            }
        }
        this.hidePerformanceMode();
    }

    // ===== NAVIGATION =====

    previousTrack() {
        if (this.currentTrackIndex > 0) {
            this.currentTrackIndex--;
            this.trackElapsedTime = 0;
            this.trackStartTime = Date.now();
            
            this.renderCurrentTrack();
            this.renderUpcomingTracks();
            this.updateControlButtons();
            
            this.playTransitionSound();
        }
    }

    nextTrack() {
        if (this.currentTrackIndex < this.liveset.tracks.length - 1) {
            this.currentTrackIndex++;
            this.trackElapsedTime = 0;
            this.trackStartTime = Date.now();
            
            this.renderCurrentTrack();
            this.renderUpcomingTracks();
            this.updateControlButtons();
            
            this.playTransitionSound();
        } else {
            // End of set
            this.pause();
            this.showSetCompleteMessage();
        }
    }

    updateControlButtons() {
        document.getElementById('perf-prev').disabled = this.currentTrackIndex === 0;
        document.getElementById('perf-next').disabled = this.currentTrackIndex >= this.liveset.tracks.length - 1;
    }

    // ===== TIMER =====

    startTimer() {
        const updateTimer = () => {
            if (!this.isPlaying) return;

            const now = Date.now();
            
            // Total elapsed time
            this.elapsedTime = (now - this.startTime) / 1000;
            document.getElementById('perf-total-time').textContent = formatDuration(Math.floor(this.elapsedTime));

            // Track elapsed time
            this.trackElapsedTime = (now - this.trackStartTime) / 1000;
            const track = this.getCurrentTrack();
            
            if (track) {
                const trackElapsed = Math.min(this.trackElapsedTime, track.durationSeconds);
                const trackRemaining = track.durationSeconds - trackElapsed;
                
                document.getElementById('perf-track-elapsed').textContent = formatDuration(Math.floor(trackElapsed));
                document.getElementById('perf-remaining').textContent = `-${formatDuration(Math.floor(trackRemaining))}`;

                // Update progress bar
                const progress = (trackElapsed / track.durationSeconds) * 100;
                document.getElementById('perf-progress-fill').style.width = `${progress}%`;

                // Warning for last 10 seconds
                if (trackRemaining <= this.warningThreshold && trackRemaining > 0) {
                    document.getElementById('perf-progress-warning').classList.add('active');
                    document.getElementById('perf-remaining').classList.add('critical');
                    
                    // Blink current track display
                    if (Math.floor(trackRemaining) !== Math.floor(trackRemaining + 0.5)) {
                        document.querySelector('.current-track-display').style.borderColor = 'var(--danger)';
                    } else {
                        document.querySelector('.current-track-display').style.borderColor = 'var(--primary)';
                    }
                } else {
                    document.getElementById('perf-progress-warning').classList.remove('active');
                    document.getElementById('perf-remaining').classList.remove('critical');
                    document.querySelector('.current-track-display').style.borderColor = 'var(--primary)';
                }

                // Auto-advance to next track
                if (trackElapsed >= track.durationSeconds) {
                    this.nextTrack();
                }

                // Update active section
                this.updateActiveSection(trackElapsed);
            }

            this.animationFrameId = requestAnimationFrame(updateTimer);
        };

        this.animationFrameId = requestAnimationFrame(updateTimer);
    }

    stopTimer() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    updateActiveSection(elapsed) {
        const sections = document.querySelectorAll('.section-marker');
        sections.forEach(section => {
            const startTime = parseFloat(section.dataset.startTime) || 0;
            const endTime = parseFloat(section.dataset.endTime) || Infinity;

            if (elapsed >= startTime && elapsed < endTime) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    // ===== UTILITIES =====

    getCurrentTrack() {
        return this.liveset.tracks[this.currentTrackIndex] || null;
    }

    playTransitionSound() {
        // Visual feedback
        const display = document.querySelector('.current-track-display');
        display.style.animation = 'none';
        setTimeout(() => {
            display.style.animation = 'trackChangeIn 0.5s ease-out';
        }, 10);
    }

    showSetCompleteMessage() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '10000';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>🎉 Set Complete!</h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 1rem;">
                        Great performance! You've completed your live set.
                    </p>
                    <p style="color: var(--text-secondary);">
                        Total duration: ${formatDuration(this.liveset.totalDuration)}<br>
                        Tracks played: ${this.liveset.tracks.length}
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="performance.reset(); this.closest('.modal-overlay').remove();">
                        Play Again
                    </button>
                    <button class="btn btn-secondary" onclick="performance.exit(); this.closest('.modal-overlay').remove();">
                        Exit Performance
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
const performance = new PerformanceMode();

