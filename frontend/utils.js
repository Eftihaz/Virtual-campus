// Utility functions for UI/UX enhancements

// Toast notification system
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">×</button>
    `;
    
    this.container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    
    return toast;
  }

  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 3000) {
    return this.show(message, 'error', duration);
  }

  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global toast manager instance
const toast = new ToastManager();

// Confirmation dialog
function confirmDialog(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    
    dialog.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-primary btn-confirm">Confirm</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Show animation
    setTimeout(() => overlay.classList.add('show'), 10);
    
    const handleConfirm = () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve(true);
      }, 300);
    };
    
    const handleCancel = () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve(false);
      }, 300);
    };
    
    dialog.querySelector('.btn-confirm').addEventListener('click', handleConfirm);
    dialog.querySelector('.btn-cancel').addEventListener('click', handleCancel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleCancel();
    });
    
    // ESC key to cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

// Loading spinner component
function createSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.innerHTML = '<div class="spinner-ring"></div><div class="spinner-ring"></div><div class="spinner-ring"></div>';
  return spinner;
}

// Show loading state
function showLoading(element) {
  if (!element) return;
  element.classList.add('loading-state');
  const spinner = createSpinner();
  element.appendChild(spinner);
}

// Hide loading state
function hideLoading(element) {
  if (!element) return;
  element.classList.remove('loading-state');
  const spinner = element.querySelector('.spinner');
  if (spinner) spinner.remove();
}

// Empty state component
function createEmptyState(message, icon = '📭') {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <p class="empty-message">${message}</p>
  `;
  return empty;
}

// Debounce function
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

// Throttle function to prevent rapid clicking
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

// Form validation
function validateForm(formElement) {
  const errors = {};
  const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
  
  inputs.forEach(input => {
    const errorId = `${input.id}-error`;
    const existingError = document.getElementById(errorId);
    if (existingError) existingError.remove();
    
    if (!input.value.trim()) {
      errors[input.id] = `${input.labels[0]?.textContent || input.name || 'Field'} is required`;
      showFieldError(input, errors[input.id]);
    } else if (input.type === 'email' && !isValidEmail(input.value)) {
      errors[input.id] = 'Please enter a valid email address';
      showFieldError(input, errors[input.id]);
    } else if (input.type === 'password' && input.minLength && input.value.length < input.minLength) {
      errors[input.id] = `Password must be at least ${input.minLength} characters`;
      showFieldError(input, errors[input.id]);
    } else {
      clearFieldError(input);
    }
  });
  
  return Object.keys(errors).length === 0;
}

function showFieldError(input, message) {
  const errorId = `${input.id}-error`;
  const existingError = document.getElementById(errorId);
  if (existingError) existingError.remove();
  
  input.classList.add('error');
  const error = document.createElement('div');
  error.id = errorId;
  error.className = 'field-error';
  error.textContent = message;
  input.parentElement.appendChild(error);
}

function clearFieldError(input) {
  input.classList.remove('error');
  const errorId = `${input.id}-error`;
  const error = document.getElementById(errorId);
  if (error) error.remove();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Clear form after successful submission
function clearForm(formElement) {
  formElement.reset();
  formElement.querySelectorAll('.field-error').forEach(err => err.remove());
  formElement.querySelectorAll('input, select, textarea').forEach(input => {
    input.classList.remove('error');
  });
}

// Handle network errors gracefully
function handleNetworkError(error) {
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    toast.error('Network error: Please check your internet connection', 5000);
    return true;
  }
  if (error.message.includes('500')) {
    toast.error('Server error: Please try again later', 5000);
    return true;
  }
  return false;
}

// Safe JSON parse with error handling
function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse error:', e);
    return fallback;
  }
}

// Get user role for role-based UI
function getUserRole() {
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  return user?.role || null;
}

// Check if user has permission
function hasPermission(requiredRoles) {
  const role = getUserRole();
  if (!role) return false;
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(role);
  }
  return role === requiredRoles;
}

// Show/hide elements based on role
function showForRole(element, roles) {
  if (!element) return;
  if (hasPermission(roles)) {
    element.style.display = '';
  } else {
    element.style.display = 'none';
  }
}

