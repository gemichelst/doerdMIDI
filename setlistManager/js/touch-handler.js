class TouchHandler {
    constructor() {
        this.longPressTimer = null;
        this.longPressDuration = 800; // ms
        this.swipeThreshold = 50; // pixels
        this.touchStart = { x: 0, y: 0, time: 0 };
    }

    // Setup touch handlers for elements
    setupLongPress(element, callback) {
        let timer;

        const start = (e) => {
            element.classList.add('long-pressing');
            timer = setTimeout(() => {
                this.triggerHaptic();
                callback(e);
                element.classList.remove('long-pressing');
            }, this.longPressDuration);
        };

        const cancel = () => {
            clearTimeout(timer);
            element.classList.remove('long-pressing');
        };

        element.addEventListener('touchstart', start);
        element.addEventListener('touchend', cancel);
        element.addEventListener('touchmove', cancel);
        element.addEventListener('mousedown', start);
        element.addEventListener('mouseup', cancel);
        element.addEventListener('mouseleave', cancel);
    }

    // Swipe detection
    setupSwipe(element, callbacks) {
        element.addEventListener('touchstart', (e) => {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
            this.touchStart.time = Date.now();
        });

        element.addEventListener('touchend', (e) => {
            const touchEnd = e.changedTouches[0];
            const deltaX = touchEnd.clientX - this.touchStart.x;
            const deltaY = touchEnd.clientY - this.touchStart.y;
            const deltaTime = Date.now() - this.touchStart.time;

            // Detect swipe direction
            if (Math.abs(deltaX) > this.swipeThreshold && deltaTime < 300) {
                if (deltaX > 0 && callbacks.onSwipeRight) {
                    callbacks.onSwipeRight();
                } else if (deltaX < 0 && callbacks.onSwipeLeft) {
                    callbacks.onSwipeLeft();
                }
            }

            if (Math.abs(deltaY) > this.swipeThreshold && deltaTime < 300) {
                if (deltaY > 0 && callbacks.onSwipeDown) {
                    callbacks.onSwipeDown();
                } else if (deltaY < 0 && callbacks.onSwipeUp) {
                    callbacks.onSwipeUp();
                }
            }
        });
    }

    // Trigger haptic feedback if available
    triggerHaptic(intensity = 'medium') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30
            };
            navigator.vibrate(patterns[intensity]);
        }
    }

    // Add ripple effect on touch
    addRippleEffect(element) {
        element.classList.add('touchable');
    }

    // Pull to refresh (for lists)
    setupPullToRefresh(element, callback) {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        element.addEventListener('touchstart', (e) => {
            if (element.scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });

        element.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 100) {
                // Visual feedback
                element.style.transform = `translateY(${Math.min(pullDistance * 0.3, 60)}px)`;
            }
        });

        element.addEventListener('touchend', () => {
            if (!isPulling) return;

            const pullDistance = currentY - startY;
            element.style.transform = '';
            element.style.transition = 'transform 0.3s ease';

            if (pullDistance > 100) {
                this.triggerHaptic('medium');
                callback();
            }

            setTimeout(() => {
                element.style.transition = '';
            }, 300);

            isPulling = false;
        });
    }
}

// Initialize touch handler
const touchHandler = new TouchHandler();
