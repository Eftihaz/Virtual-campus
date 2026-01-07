// Authentication management
const API_BASE = '/api/auth';
let currentUser = null;
let authToken = null;

// Load user from localStorage
function loadAuth() {
  authToken = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    currentUser = JSON.parse(userStr);
  }
}

// Save auth to localStorage
function saveAuth(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('authToken', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Clear auth
function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
}

// Get auth headers
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
}

// Sign up
async function signUp(email, password, name, role, department, studentId) {
  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, department, studentId }),
    });
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error('Server returned invalid response. Please check if the server is running.');
    }
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Sign up failed');
    }
    saveAuth(data.token, data.user);
    return data;
  } catch (error) {
    if (error.message.includes('JSON')) {
      throw new Error('Server error: Invalid response format. Please check server logs.');
    }
    throw error;
  }
}

// Sign in
async function signIn(email, password) {
  try {
    const res = await fetch(`${API_BASE}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error('Server returned invalid response. Please check if the server is running.');
    }
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Sign in failed');
    }
    saveAuth(data.token, data.user);
    return data;
  } catch (error) {
    if (error.message.includes('JSON')) {
      throw new Error('Server error: Invalid response format. Please check server logs.');
    }
    throw error;
  }
}

// Sign out
function signOut() {
  clearAuth();
  window.location.href = '/';
}

// Get profile
async function getProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get profile');
    const user = await res.json();
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  } catch (error) {
    clearAuth();
    throw error;
  }
}

// Update profile
async function updateProfile(name, department, studentId) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, department, studentId }),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const user = await res.json();
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  } catch (error) {
    throw error;
  }
}

// Verify token
async function verifyToken() {
  if (!authToken) return false;
  try {
    const res = await fetch(`${API_BASE}/verify`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Initialize auth on load
loadAuth();


