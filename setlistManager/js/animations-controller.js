class AnimationsController {
    constructor() {
        this.toastContainer = null;
        this.createToastContainer();
    }

    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        `;
        document.body.appendChild(this.toastContainer);
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // Trigger snapshot animation
    animateSnapshotTrigger(element) {
        element.classList.add('triggered');
        setTimeout(() => element.classList.remove('triggered'), 400);
    }

    // Song change transition
    animateSongChange(callback) {
        const songView = document.querySelector('.current-song');
        songView.classList.add('song-changing');

        setTimeout(() => {
            callback();
            songView.classList.remove('song-changing');
            songView.classList.add('song-changed');
            
            setTimeout(() => {
                songView.classList.remove('song-changed');
            }, 300);
        }, 300);
    }

    // Show loading state
    showLoading(container) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        `;
        container.style.position = 'relative';
        container.appendChild(spinner);
        return spinner;
    }

    hideLoading(spinner) {
        spinner.remove();
    }

    // Skeleton loading for lists
    showSkeletonList(container, count = 5) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            skeleton.style.cssText = `
                height: 80px;
                margin-bottom: 0.5rem;
            `;
            container.appendChild(skeleton);
        }
    }

    // Confetti effect for celebrations
    triggerConfetti() {
        // Simple confetti using CSS
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                opacity: 1;
                transform: rotate(${Math.random() * 360}deg);
                animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
                pointer-events: none;
                z-index: 99999;
            `;
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }
    }

    // Add ripple effect to element
    addRipple(event, element) {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }
}

// Add CSS for confetti animation
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        to {
            top: 100vh;
            opacity: 0;
            transform: translateX(${Math.random() * 200 - 100}px) rotate(${360 * 3}deg);
        }
    }

    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize animations controller
const animationsController = new AnimationsController();
