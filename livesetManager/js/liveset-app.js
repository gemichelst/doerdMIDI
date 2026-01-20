// ===== APPLICATION INITIALIZATION =====

let storage, controller, ui;

async function initializeApp() {
    console.log('🚀 Initializing Electronic Live Set Planner...');

    try {
        // Initialize Storage
        storage = new LiveSetStorage();
        await storage.initialize();

        // Initialize Controller
        controller = new LiveSetController(storage);

        // Initialize UI
        ui = new LiveSetUI(controller);
        ui.initialize();

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize application: ' + error.message);
    }
}

// Auto-save functionality
let autoSaveInterval;
function startAutoSave() {
    autoSaveInterval = setInterval(async () => {
        if (controller.currentLiveSet) {
            try {
                await controller.saveLiveSet();
                console.log('💾 Auto-saved');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    }, 30000); // Auto-save every 30 seconds
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (controller.currentLiveSet) {
            controller.saveLiveSet();
            ui.showToast('💾 Saved', 'success');
        }
    }

    // In performance mode
    const perfMode = document.getElementById('performance-mode');
    if (perfMode.style.display === 'flex') {
        // Space: Play/Pause
        if (e.code === 'Space') {
            e.preventDefault();
            performance.togglePlayPause();
        }

        // Arrow Left: Previous track
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            performance.previousTrack();
        }

        // Arrow Right: Next track
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            performance.nextTrack();
        }

        // Escape: Exit performance mode
        if (e.code === 'Escape') {
            e.preventDefault();
            performance.exit();
        }
    }
});

// Prevent accidental page close
window.addEventListener('beforeunload', (e) => {
    if (controller.currentLiveSet && controller.currentLiveSet.tracks.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    startAutoSave();
});

// Global utility functions
window.createNewSet = async () => {
    await ui.createNewSet();
};

window.autoArrange = () => {
    if (!controller.currentLiveSet) return;

    const tracks = controller.currentLiveSet.tracks;
    if (tracks.length < 2) {
        ui.showToast('⚠️ Need at least 2 tracks to auto-arrange', 'warning');
        return;
    }

    // Sort by energy level (build energy throughout set)
    const sorted = [...tracks].sort((a, b) => a.energy - b.energy);
    
    controller.currentLiveSet.tracks = sorted;
    controller.saveLiveSet();
    ui.renderTracks();
    ui.showToast('✨ Tracks auto-arranged by energy', 'success');
};

window.closeTrackDetails = () => {
    ui.closeTrackDetails();
};

window.addChannel = () => {
    ui.addChannel();
};

window.closeChannelModal = () => {
    ui.closeChannelModal();
};

window.updateChannelForm = () => {
    ui.updateChannelForm();
};

window.saveChannel = async () => {
    await ui.saveChannel();
};

window.addArrangementSection = () => {
    ui.addArrangementSection();
};

// Service Worker for PWA (optional) - auskommentiert
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
                console.log('ServiceWorker registered:', registration.scope);
            },
            (err) => {
                console.log('ServiceWorker registration failed:', err);
            }
        );
    });
}
*/

