/**
 * WellUp - Main Landing Page JavaScript
 * Simple theme toggle for home page
 */

document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();
});

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});
