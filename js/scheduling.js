/**
 * WellUp - Scheduling Page JavaScript
 * Task and Important Date Management
 */

// ==========================================
// State Management
// ==========================================

const state = {
    tasks: [],
    importantDates: [],
    currentFilter: 'all',
    level: 1,
    xp: 0,
    xpNeeded: 100,
    tasksCompleted: 0,
    streak: 0,
    lastCompletionDate: null
};

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    renderTasks();
    renderDates();
    updateStats();
    updateProgressBar();
    checkStreak();
    setMinDate();
});

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-deadline').setAttribute('min', today);
    document.getElementById('date-value').setAttribute('min', today);
}

// ==========================================
// Event Listeners
// ==========================================

function setupEventListeners() {
    // Task Form
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    
    // Important Date Form
    document.getElementById('date-form').addEventListener('submit', handleDateSubmit);
    
    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
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
    updateStats();
    
    // Reset form
    taskInput.value = '';
    deadlineInput.value = '';
    priorityInput.value = 'medium';
    
    showNotification('Task added successfully! 🎯');
    taskInput.focus();
}

function calculateXP(priority, deadline) {
    let xp = 10;
    
    const priorityMultipliers = { high: 3, medium: 2, low: 1 };
    xp *= priorityMultipliers[priority];
    
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
        state.xp += task.xpValue;
        state.tasksCompleted++;
        checkLevelUp();
        updateStreak();
        showNotification(`+${task.xpValue} XP! Great work! 🎉`);
        celebrateTaskCompletion();
    } else {
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
            <div style="text-align: center; padding: 2rem; color: var(--light-gray);">
                <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">📋</p>
                <p>No tasks yet. Add your first task above!</p>
            </div>
        `;
        return;
    }
    
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
    
    const deadlineText = formatDeadline(task.deadline);
    const isUrgent = isDeadlineUrgent(task.deadline);
    
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
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasks();
}

// ==========================================
// Important Dates Management
// ==========================================

function handleDateSubmit(e) {
    e.preventDefault();
    
    const dateInput = document.getElementById('date-input');
    const dateValue = document.getElementById('date-value');
    
    const importantDate = {
        id: Date.now(),
        title: dateInput.value.trim(),
        date: dateValue.value,
        createdAt: new Date().toISOString()
    };
    
    state.importantDates.push(importantDate);
    state.importantDates.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    saveToLocalStorage();
    renderDates();
    
    // Reset form
    dateInput.value = '';
    dateValue.value = '';
    
    showNotification('Important date added! 📆');
    dateInput.focus();
}

function deleteDate(id) {
    const dateIndex = state.importantDates.findIndex(d => d.id === id);
    if (dateIndex === -1) return;
    
    state.importantDates.splice(dateIndex, 1);
    saveToLocalStorage();
    renderDates();
    showNotification('Date removed');
}

function renderDates() {
    const datesList = document.getElementById('dates-list');
    
    if (state.importantDates.length === 0) {
        datesList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--light-gray);">
                <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">📆</p>
                <p>No important dates yet. Add one above!</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    state.importantDates.forEach(date => {
        const dateElement = createDateElement(date);
        fragment.appendChild(dateElement);
    });
    
    datesList.innerHTML = '';
    datesList.appendChild(fragment);
}

function createDateElement(dateObj) {
    const div = document.createElement('div');
    div.className = 'date-item';
    
    const dateDisplay = formatImportantDate(dateObj.date);
    const dateClass = getDateClass(dateObj.date);
    
    div.innerHTML = `
        <div class="date-content">
            <div class="date-title">${escapeHtml(dateObj.title)}</div>
            <div class="date-value ${dateClass}">${dateDisplay}</div>
        </div>
        <button class="delete-btn" aria-label="Delete date">Delete</button>
    `;
    
    div.querySelector('.delete-btn').addEventListener('click', () => deleteDate(dateObj.id));
    
    return div;
}

function formatImportantDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    if (diffDays < 0) return `${formattedDate} (Passed)`;
    if (diffDays === 0) return `${formattedDate} - TODAY! 🔥`;
    if (diffDays === 1) return `${formattedDate} - Tomorrow!`;
    if (diffDays <= 7) return `${formattedDate} - In ${diffDays} days`;
    
    return formattedDate;
}

function getDateClass(dateString) {
    const diffDays = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays > 0 && diffDays <= 7) return 'upcoming';
    return '';
}

// ==========================================
// Gamification System
// ==========================================

function checkLevelUp() {
    while (state.xp >= state.xpNeeded) {
        state.xp -= state.xpNeeded;
        state.level++;
        state.xpNeeded = Math.floor(state.xpNeeded * 1.5);
        showNotification(`🎊 Level Up! You're now Level ${state.level}!`, 3000);
    }
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
    const pendingTasks = state.tasks.filter(t => !t.completed).length;
    
    document.getElementById('tasks-completed').textContent = state.tasksCompleted;
    document.getElementById('pending-tasks').textContent = pendingTasks;
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
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.transition = 'none';
    progressFill.style.transform = 'scale(1.05)';
    setTimeout(() => {
        progressFill.style.transition = 'all var(--transition-slow)';
        progressFill.style.transform = 'scale(1)';
    }, 200);
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

// ==========================================
// Local Storage
// ==========================================

function saveToLocalStorage() {
    try {
        const data = {
            tasks: state.tasks,
            importantDates: state.importantDates,
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-input').focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});
