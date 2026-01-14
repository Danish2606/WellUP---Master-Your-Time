/**
 * WellUp - Master Your Time
 * Main Application JavaScript
 * Features: Task Management, Gamification, Pomodoro Timer, Local Storage
 */

// ==========================================
// State Management
// ==========================================

const state = {
    tasks: [],
    currentFilter: 'all',
    level: 1,
    xp: 0,
    xpNeeded: 100,
    tasksCompleted: 0,
    streak: 0,
    lastCompletionDate: null,
    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        mode: 'work', // work, short, long
        interval: null
    }
};

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeApp();
    setupEventListeners();
    renderTasks();
    updateStats();
    updateProgressBar();
    checkStreak();
});

function initializeApp() {
    // Set minimum date to today for deadline input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-deadline').setAttribute('min', today);
    
    // Performance optimization: Use passive event listeners for scroll
    document.addEventListener('scroll', handleScroll, { passive: true });
}

// ==========================================
// Event Listeners
// ==========================================

function setupEventListeners() {
    // Task Form
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    
    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Timer Controls
    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', pauseTimer);
    document.getElementById('timer-reset').addEventListener('click', resetTimer);
    
    // Timer Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', handleModeChange);
    });
}

// ==========================================
// Task Management
// ==========================================

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskInput = document.getElementById('task-input');
    const deadlineInput = document.getElementById('task-deadline');
    const priorityInput = document.getElementById('task-priority');
    
    const task = {
        id: Date.now(),
        title: taskInput.value.trim(),
        deadline: deadlineInput.value,
        priority: priorityInput.value,
        completed: false,
        createdAt: new Date().toISOString(),
        xpValue: calculateXP(priorityInput.value, deadlineInput.value)
    };
    
    state.tasks.unshift(task);
    saveToLocalStorage();
    renderTasks();
    
    // Reset form
    taskInput.value = '';
    deadlineInput.value = '';
    priorityInput.value = 'medium';
    
    // Show notification
    showNotification('Task added successfully! 🎯');
    
    // Focus back to input for quick entry
    taskInput.focus();
}

function calculateXP(priority, deadline) {
    let xp = 10; // Base XP
    
    // Priority multiplier
    const priorityMultipliers = { high: 3, medium: 2, low: 1 };
    xp *= priorityMultipliers[priority];
    
    // Deadline urgency bonus
    if (deadline) {
        const daysUntil = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 1) xp += 20;
        else if (daysUntil <= 3) xp += 10;
        else if (daysUntil <= 7) xp += 5;
    }
    
    return xp;
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    
    task.completed = !task.completed;
    
    if (task.completed) {
        // Add XP and update stats
        state.xp += task.xpValue;
        state.tasksCompleted++;
        checkLevelUp();
        updateStreak();
        showNotification(`+${task.xpValue} XP! Great work! 🎉`);
        
        // Celebration animation
        celebrateTaskCompletion();
    } else {
        // Remove XP if unchecked
        state.xp = Math.max(0, state.xp - task.xpValue);
        state.tasksCompleted = Math.max(0, state.tasksCompleted - 1);
    }
    
    saveToLocalStorage();
    renderTasks();
    updateStats();
    updateProgressBar();
}

function deleteTask(id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = state.tasks[taskIndex];
    
    // Remove XP if task was completed
    if (task.completed) {
        state.xp = Math.max(0, state.xp - task.xpValue);
        state.tasksCompleted = Math.max(0, state.tasksCompleted - 1);
    }
    
    state.tasks.splice(taskIndex, 1);
    saveToLocalStorage();
    renderTasks();
    updateStats();
    updateProgressBar();
    showNotification('Task deleted');
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--light-gray);">
                <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">📋</p>
                <p>No tasks yet. Add your first task above!</p>
            </div>
        `;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        fragment.appendChild(taskElement);
    });
    
    taskList.innerHTML = '';
    taskList.appendChild(fragment);
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.setAttribute('role', 'listitem');
    
    const deadlineText = task.deadline ? formatDeadline(task.deadline) : 'No deadline';
    const isUrgent = task.deadline && isDeadlineUrgent(task.deadline);
    
    div.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
        >
        <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
                <span class="task-deadline-display ${isUrgent ? 'urgent' : ''}">${deadlineText}</span>
                <span class="task-priority-badge ${task.priority}">${task.priority}</span>
                <span class="task-xp">+${task.xpValue} XP</span>
            </div>
        </div>
        <button class="delete-btn" aria-label="Delete task">Delete</button>
    `;
    
    // Event listeners
    div.querySelector('.task-checkbox').addEventListener('change', () => toggleTask(task.id));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
    
    return div;
}

function getFilteredTasks() {
    switch (state.currentFilter) {
        case 'active':
            return state.tasks.filter(t => !t.completed);
        case 'completed':
            return state.tasks.filter(t => t.completed);
        case 'high':
            return state.tasks.filter(t => t.priority === 'high' && !t.completed);
        default:
            return state.tasks;
    }
}

function handleFilterClick(e) {
    const filter = e.target.dataset.filter;
    state.currentFilter = filter;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasks();
}

// ==========================================
// Gamification System
// ==========================================

function checkLevelUp() {
    while (state.xp >= state.xpNeeded) {
        state.xp -= state.xpNeeded;
        state.level++;
        state.xpNeeded = Math.floor(state.xpNeeded * 1.5); // Progressive difficulty
        showLevelUpNotification();
    }
}

function showLevelUpNotification() {
    showNotification(`🎊 Level Up! You're now Level ${state.level}!`, 3000);
    // Could add confetti animation here
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastDate = state.lastCompletionDate;
    
    if (!lastDate) {
        state.streak = 1;
    } else {
        const lastCompletionDate = new Date(lastDate).toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastCompletionDate === today) {
            // Already completed today, don't increment
            return;
        } else if (lastCompletionDate === yesterday) {
            state.streak++;
        } else {
            state.streak = 1;
        }
    }
    
    state.lastCompletionDate = new Date().toISOString();
}

function checkStreak() {
    if (!state.lastCompletionDate) return;
    
    const today = new Date().toDateString();
    const lastDate = new Date(state.lastCompletionDate).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastDate !== today && lastDate !== yesterday) {
        state.streak = 0;
        saveToLocalStorage();
        updateStats();
    }
}

function updateStats() {
    document.getElementById('tasks-completed').textContent = state.tasksCompleted;
    document.getElementById('current-streak').textContent = state.streak;
    document.getElementById('level-display').textContent = state.level;
    document.getElementById('level').textContent = state.level;
    document.getElementById('xp').textContent = state.xp;
    document.getElementById('xp-needed').textContent = state.xpNeeded;
}

function updateProgressBar() {
    const percentage = (state.xp / state.xpNeeded) * 100;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

function celebrateTaskCompletion() {
    // Add a subtle celebration animation
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.transition = 'none';
    progressFill.style.transform = 'scale(1.05)';
    setTimeout(() => {
        progressFill.style.transition = 'all var(--transition-slow)';
        progressFill.style.transform = 'scale(1)';
    }, 200);
}

// ==========================================
// Pomodoro Timer
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
    
    // Play notification sound (if implemented)
    if (state.timer.mode === 'work') {
        showNotification('🎉 Work session complete! Time for a break!', 5000);
        // Award XP for completing a focus session
        state.xp += 15;
        checkLevelUp();
        updateStats();
        updateProgressBar();
        saveToLocalStorage();
    } else {
        showNotification('✨ Break over! Ready to focus again?', 5000);
    }
    
    // Auto-switch to break or work
    if (state.timer.mode === 'work') {
        setTimerMode('short');
    } else {
        setTimerMode('work');
    }
}

function handleModeChange(e) {
    const mode = e.target.dataset.mode;
    pauseTimer();
    setTimerMode(mode);
    
    // Update active state
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

function setTimerMode(mode) {
    state.timer.mode = mode;
    
    switch (mode) {
        case 'work':
            state.timer.minutes = 25;
            break;
        case 'short':
            state.timer.minutes = 5;
            break;
        case 'long':
            state.timer.minutes = 15;
            break;
    }
    
    state.timer.seconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = String(state.timer.minutes).padStart(2, '0');
    const seconds = String(state.timer.seconds).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
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

function formatDeadline(deadline) {
    const date = new Date(deadline);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '⚠️ Overdue';
    if (diffDays === 0) return '🔥 Due today';
    if (diffDays === 1) return '⏰ Due tomorrow';
    if (diffDays <= 7) return `📅 ${diffDays} days left`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isDeadlineUrgent(deadline) {
    const diffDays = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, duration = 2000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

function handleScroll() {
    // Could add scroll-based animations here
    // Using requestAnimationFrame for better performance
    requestAnimationFrame(() => {
        // Scroll effects if needed
    });
}

// ==========================================
// Local Storage
// ==========================================

function saveToLocalStorage() {
    try {
        const data = {
            tasks: state.tasks,
            level: state.level,
            xp: state.xp,
            xpNeeded: state.xpNeeded,
            tasksCompleted: state.tasksCompleted,
            streak: state.streak,
            lastCompletionDate: state.lastCompletionDate
        };
        localStorage.setItem('wellup-data', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('wellup-data');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(state, data);
        }
        
        // Load theme preference
        const theme = localStorage.getItem('theme');
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// ==========================================
// Performance Optimizations
// ==========================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
// Service Worker Registration (PWA Ready)
// ==========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker can be registered here for offline support
        // navigator.serviceWorker.register('/sw.js');
    });
}

// ==========================================
// Keyboard Shortcuts
// ==========================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus task input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-input').focus();
    }
    
    // Ctrl/Cmd + / to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});

// ==========================================
// Export for testing (if needed)
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { state, calculateXP, formatDeadline };
}
