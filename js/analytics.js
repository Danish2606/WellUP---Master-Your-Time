/**
 * WellUp - Analytics Page JavaScript
 * Study Hours Tracking and Visualization
 */

// ==========================================
// State Management
// ==========================================

const state = {
    studyLogs: [],
    currentWeekOffset: 0, // 0 = current week, -1 = last week, 1 = next week
    currentFilter: 'all'
};

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    setTodayDate();
    renderWeeklyChart();
    renderStudyLogs();
    updateStats();
    updateInsights();
});

function setupEventListeners() {
    document.getElementById('hours-form').addEventListener('submit', handleHoursSubmit);
    
    document.getElementById('prev-week').addEventListener('click', () => {
        state.currentWeekOffset--;
        renderWeeklyChart();
    });
    
    document.getElementById('next-week').addEventListener('click', () => {
        if (state.currentWeekOffset < 0) {
            state.currentWeekOffset++;
            renderWeeklyChart();
        }
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-input').value = today;
}

// ==========================================
// Form Handling
// ==========================================

function handleHoursSubmit(e) {
    e.preventDefault();
    
    const dateInput = document.getElementById('date-input');
    const hoursInput = document.getElementById('hours-input');
    const subjectInput = document.getElementById('subject-input');
    
    const studyLog = {
        id: Date.now(),
        date: dateInput.value,
        hours: parseFloat(hoursInput.value),
        subject: subjectInput.value.trim() || 'General Study',
        createdAt: new Date().toISOString()
    };
    
    // Check if entry exists for this date
    const existingIndex = state.studyLogs.findIndex(log => log.date === studyLog.date);
    
    if (existingIndex !== -1) {
        // Update existing entry
        state.studyLogs[existingIndex].hours += studyLog.hours;
        state.studyLogs[existingIndex].subject = studyLog.subject;
        showNotification('Updated study hours for this date!');
    } else {
        // Add new entry
        state.studyLogs.push(studyLog);
        showNotification('Study hours logged successfully! 📚');
    }
    
    // Sort by date descending
    state.studyLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    saveToLocalStorage();
    renderWeeklyChart();
    renderStudyLogs();
    updateStats();
    updateInsights();
    
    // Reset form
    hoursInput.value = '';
    subjectInput.value = '';
    hoursInput.focus();
}

// ==========================================
// Weekly Chart
// ==========================================

function renderWeeklyChart() {
    const weekData = getWeekData(state.currentWeekOffset);
    const chart = document.getElementById('weekly-chart');
    
    // Update week display
    const weekDisplay = document.getElementById('week-display');
    if (state.currentWeekOffset === 0) {
        weekDisplay.textContent = 'Current Week';
    } else if (state.currentWeekOffset === -1) {
        weekDisplay.textContent = 'Last Week';
    } else if (state.currentWeekOffset < -1) {
        weekDisplay.textContent = `${Math.abs(state.currentWeekOffset)} Weeks Ago`;
    }
    
    // Disable next week button if viewing current week
    document.getElementById('next-week').disabled = state.currentWeekOffset >= 0;
    
    // Create bar chart
    chart.innerHTML = '';
    const maxHours = 12; // Scale for chart
    
    weekData.forEach(day => {
        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';
        
        const percentage = Math.min((day.hours / maxHours) * 100, 100);
        
        barContainer.innerHTML = `
            <div class="bar-label-top">${day.hours > 0 ? day.hours.toFixed(1) + 'h' : ''}</div>
            <div class="bar-wrapper">
                <div class="bar" style="height: ${percentage}%"></div>
            </div>
            <div class="bar-label">${day.dayName}</div>
            <div class="bar-date">${day.dateDisplay}</div>
        `;
        
        chart.appendChild(barContainer);
    });
}

function getWeekData(weekOffset) {
    const days = [];
    const today = new Date();
    
    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        
        const dateString = date.toISOString().split('T')[0];
        const dayLogs = state.studyLogs.filter(log => log.date === dateString);
        const totalHours = dayLogs.reduce((sum, log) => sum + log.hours, 0);
        
        days.push({
            date: dateString,
            dayName: dayNames[i],
            dateDisplay: `${date.getDate()}/${date.getMonth() + 1}`,
            hours: totalHours
        });
    }
    
    return days;
}

// ==========================================
// Study Logs Display
// ==========================================

function renderStudyLogs() {
    const logList = document.getElementById('study-log-list');
    const filteredLogs = getFilteredLogs();
    
    if (filteredLogs.length === 0) {
        logList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--light-gray);">
                <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">📚</p>
                <p>No study logs yet. Start logging your hours above!</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    filteredLogs.forEach(log => {
        const logElement = createLogElement(log);
        fragment.appendChild(logElement);
    });
    
    logList.innerHTML = '';
    logList.appendChild(fragment);
}

function createLogElement(log) {
    const div = document.createElement('div');
    div.className = 'study-log-item';
    
    const date = new Date(log.date);
    const dateDisplay = date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    div.innerHTML = `
        <div class="log-date-col">
            <div class="log-date">${dateDisplay}</div>
        </div>
        <div class="log-subject-col">
            <div class="log-subject">${escapeHtml(log.subject)}</div>
        </div>
        <div class="log-hours-col">
            <div class="log-hours">${log.hours.toFixed(1)} hours</div>
        </div>
        <div class="log-actions-col">
            <button class="delete-btn-small" aria-label="Delete log">Delete</button>
        </div>
    `;
    
    div.querySelector('.delete-btn-small').addEventListener('click', () => deleteLog(log.id));
    
    return div;
}

function deleteLog(id) {
    const index = state.studyLogs.findIndex(log => log.id === id);
    if (index === -1) return;
    
    state.studyLogs.splice(index, 1);
    saveToLocalStorage();
    renderWeeklyChart();
    renderStudyLogs();
    updateStats();
    updateInsights();
    showNotification('Log deleted');
}

function getFilteredLogs() {
    const now = new Date();
    
    switch (state.currentFilter) {
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return state.studyLogs.filter(log => new Date(log.date) >= weekAgo);
        case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return state.studyLogs.filter(log => new Date(log.date) >= monthAgo);
        default:
            return state.studyLogs;
    }
}

function handleFilterClick(e) {
    const filter = e.target.dataset.filter;
    state.currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderStudyLogs();
}

// ==========================================
// Statistics
// ==========================================

function updateStats() {
    const weekData = getWeekData(0);
    const totalHoursWeek = weekData.reduce((sum, day) => sum + day.hours, 0);
    const daysLogged = weekData.filter(day => day.hours > 0).length;
    const avgHours = daysLogged > 0 ? totalHoursWeek / daysLogged : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todayLog = state.studyLogs.find(log => log.date === today);
    const todayHours = todayLog ? todayLog.hours : 0;
    
    document.getElementById('total-hours-week').textContent = totalHoursWeek.toFixed(1);
    document.getElementById('avg-hours-day').textContent = avgHours.toFixed(1);
    document.getElementById('days-logged').textContent = daysLogged;
    document.getElementById('today-hours').textContent = todayHours.toFixed(1);
}

function updateInsights() {
    // Most productive day
    const dayTotals = {};
    state.studyLogs.forEach(log => {
        const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' });
        dayTotals[day] = (dayTotals[day] || 0) + log.hours;
    });
    
    let mostProductiveDay = 'No data yet';
    let maxHours = 0;
    
    for (const [day, hours] of Object.entries(dayTotals)) {
        if (hours > maxHours) {
            maxHours = hours;
            mostProductiveDay = `${day} (${hours.toFixed(1)}h total)`;
        }
    }
    
    document.getElementById('most-productive-day').textContent = mostProductiveDay;
    
    // Consistency streak
    const streak = calculateStreak();
    document.getElementById('consistency-streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
    
    // Weekly goal
    const weekData = getWeekData(0);
    const totalHoursWeek = weekData.reduce((sum, day) => sum + day.hours, 0);
    const goalHours = 20; // Example goal
    
    if (totalHoursWeek >= goalHours) {
        document.getElementById('weekly-goal-status').textContent = `✓ Goal achieved! (${totalHoursWeek.toFixed(1)}h / ${goalHours}h)`;
    } else {
        document.getElementById('weekly-goal-status').textContent = `${totalHoursWeek.toFixed(1)}h / ${goalHours}h (${(totalHoursWeek / goalHours * 100).toFixed(0)}%)`;
    }
}

function calculateStreak() {
    if (state.studyLogs.length === 0) return 0;
    
    const sortedLogs = [...state.studyLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const log of sortedLogs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === streak) {
            streak++;
            currentDate = new Date(logDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (diffDays > streak) {
            break;
        }
    }
    
    return streak;
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
            studyLogs: state.studyLogs
        };
        localStorage.setItem('wellup-analytics', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('wellup-analytics');
        if (saved) {
            const data = JSON.parse(saved);
            state.studyLogs = data.studyLogs || [];
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        document.getElementById('hours-input').focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});
