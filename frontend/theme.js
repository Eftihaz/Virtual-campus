// Dark mode management with BRAC branding
function initTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  setTheme(darkMode);
}

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    document.body.classList.remove('dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('darkMode', 'false');
  }
  
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = isDark ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode') || 
                 localStorage.getItem('darkMode') === 'true';
  setTheme(!isDark);
}

// Initialize theme on load
initTheme();

// Set up toggle button
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', toggleTheme);
  }
});


