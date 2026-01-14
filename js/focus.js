/**
 * WellUp - Focus Mode JavaScript
 * Pomodoro Timer Implementation
 */

// ==========================================
// State Management
// ==========================================

const state = {
    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        mode: 'work',
        interval: null
    },
    stats: {
        sessionsToday: 0,
        totalMinutesToday: 0,
        lastSessionDate: null
    }
};

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    updateTimerDisplay();
    updateStats();
    checkNewDay();
});

function setupEventListeners() {
    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', pauseTimer);
    document.getElementById('timer-reset').addEventListener('click', resetTimer);
    
    document.querySelectorAll('.mode-btn-large').forEach(btn => {
        btn.addEventListener('click', handleModeChange);
    });
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// ==========================================
// Timer Functions
// ==========================================

function startTimer() {
    if (state.timer.isRunning) return;
    
    state.timer.isRunning = true;
    document.getElementById('timer-start').disabled = true;
    document.getElementById('timer-pause').disabled = false;
    
    state.timer.interval = setInterval(() => {
        if (state.timer.seconds === 0) {
            if (state.timer.minutes === 0) {
                timerComplete();
                return;
            }
            state.timer.minutes--;
            state.timer.seconds = 59;
        } else {
            state.timer.seconds--;
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.interval);
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-pause').disabled = true;
}

function resetTimer() {
    pauseTimer();
    setTimerMode(state.timer.mode);
}

function timerComplete() {
    pauseTimer();
    
    if (state.timer.mode === 'work') {
        // Record completed work session
        state.stats.sessionsToday++;
        state.stats.totalMinutesToday += 25;
        state.stats.lastSessionDate = new Date().toDateString();
        saveToLocalStorage();
        updateStats();
        
        showNotification('🎉 Work session complete! Time for a break!', 5000);
        
        // Play notification sound if browser supports it
        playNotificationSound();
        
        // Auto-switch to short break
        setTimerMode('short');
    } else {
        showNotification('✨ Break over! Ready to focus again?', 5000);
        playNotificationSound();
        
        // Auto-switch to work mode
        setTimerMode('work');
    }
}

function handleModeChange(e) {
    const mode = e.target.closest('.mode-btn-large').dataset.mode;
    pauseTimer();
    setTimerMode(mode);
    
    document.querySelectorAll('.mode-btn-large').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

function setTimerMode(mode) {
    state.timer.mode = mode;
    
    const modeConfig = {
        work: { minutes: 25, label: 'Work Session', description: 'Time to focus on your tasks' },
        short: { minutes: 5, label: 'Short Break', description: 'Relax and recharge for a bit' },
        long: { minutes: 15, label: 'Long Break', description: 'Take a well-deserved rest' }
    };
    
    const config = modeConfig[mode];
    state.timer.minutes = config.minutes;
    state.timer.seconds = 0;
    
    document.getElementById('timer-mode-label').textContent = config.label;
    document.getElementById('timer-description').textContent = config.description;
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = String(state.timer.minutes).padStart(2, '0');
    const seconds = String(state.timer.seconds).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
    
    // Update document title
    if (state.timer.isRunning) {
        document.title = `${minutes}:${seconds} - Focus Mode`;
    } else {
        document.title = 'Focus Mode - WellUp';
    }
}

function playNotificationSound() {
    // Create a simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio notification not available');
    }
}

// ==========================================
// Statistics
// ==========================================

function updateStats() {
    document.getElementById('sessions-today').textContent = state.stats.sessionsToday;
    
    const hours = Math.floor(state.stats.totalMinutesToday / 60);
    const minutes = state.stats.totalMinutesToday % 60;
    document.getElementById('total-time').textContent = `${hours}h ${minutes}m`;
}

function checkNewDay() {
    const today = new Date().toDateString();
    const lastDate = state.stats.lastSessionDate;
    
    if (lastDate && lastDate !== today) {
        // Reset daily stats
        state.stats.sessionsToday = 0;
        state.stats.totalMinutesToday = 0;
        saveToLocalStorage();
        updateStats();
    }
}

// ==========================================
// Theme Toggle
// ==========================================

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// ==========================================
// Utility Functions
// ==========================================

function showNotification(message, duration = 2000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// ==========================================
// Local Storage
// ==========================================

function saveToLocalStorage() {
    try {
        const data = {
            stats: state.stats
        };
        localStorage.setItem('wellup-focus', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('wellup-focus');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(state.stats, data.stats);
        }
        
        const theme = localStorage.getItem('theme');
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// ==========================================
// Keyboard Shortcuts
// ==========================================

document.addEventListener('keydown', (e) => {
    // Space to start/pause timer
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (state.timer.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }
    
    // R to reset
    if (e.key === 'r' || e.key === 'R') {
        if (e.target.tagName !== 'INPUT') {
            resetTimer();
        }
    }
    
    // Theme toggle
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});

// ==========================================
// Page Visibility API
// ==========================================

// Pause timer when user leaves the page
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.timer.isRunning) {
        // Optionally pause the timer when tab is not visible
        // pauseTimer();
    }
});
