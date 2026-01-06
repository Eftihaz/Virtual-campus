const api = {
  menu: '/api/cafeteria/menu',
  news: '/api/news',
  events: '/api/events',
  rooms: '/api/rooms',
  thesis: '/api/thesis',
};

// Get auth headers if logged in
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

async function fetchJson(url, options = {}) {
  try {
    const headers = { ...getAuthHeaders(), ...options.headers };
    const res = await fetch(url, { ...options, headers });
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Server returned HTML instead of JSON. Check API route.');
      }
      throw new Error(`Unexpected response type: ${contentType}`);
    }
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `Request failed: ${res.status}` }));
      throw new Error(error.message || `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

function showError(element, message) {
  element.innerHTML = `<li class="error">Error: ${message}</li>`;
}

function showLoading(element) {
  element.innerHTML = '<li class="loading">Loading...</li>';
}

// Cafeteria
document.getElementById('loadMenu').onclick = async () => {
  const list = document.getElementById('menuList');
  showLoading(list);
  try {
    const allergy = document.getElementById('allergyFilter').value.trim();
    const qs = allergy ? `?allergy=${encodeURIComponent(allergy)}` : '';
    const menu = await fetchJson(`${api.menu}${qs}`);
    list.innerHTML = '';
    if (menu.length === 0) {
      list.innerHTML = '<li>No menu items found</li>';
      return;
    }
    menu.forEach((item) => {
      const allergies = item.allergies?.length ? `Allergies: ${item.allergies.join(', ')}` : 'Allergy-safe';
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.name}</strong> — $${item.price} <span class="status ${item.available ? 'available' : 'unavailable'}">${item.available ? 'Available' : 'Out'}</span>`;
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = allergies;
      li.appendChild(pill);
      list.appendChild(li);
    });
  } catch (error) {
    showError(list, error.message);
  }
};

// News
document.getElementById('loadNews').onclick = async () => {
  const list = document.getElementById('newsList');
  showLoading(list);
  try {
    const news = await fetchJson(api.news);
    list.innerHTML = '';
    if (news.length === 0) {
      list.innerHTML = '<li>No news items found</li>';
      return;
    }
    news.forEach((n) => {
      const li = document.createElement('li');
      const id = n._id || n.id;
      const author = n.authorName || n.authorId?.name || 'Unknown';
      const likedBy = n.likedBy || [];
      const likedByNames = likedBy.map(u => u.name || u.email || 'User').slice(0, 5);
      const likedByText = likedBy.length > 0 ? ` (Liked by: ${likedByNames.join(', ')}${likedBy.length > 5 ? '...' : ''})` : '';
      
      li.innerHTML = `
        <strong>${n.title}</strong><br>
        ${n.body}<br>
        <small>By: ${author} | Category: ${n.category || 'general'} | Department: ${n.department || 'general'}</small><br>
        <button onclick="likeNews('${id}')" class="btn-like">👍 ${n.likes || 0}${likedByText}</button>
        <button onclick="showCommentForm('${id}')" class="btn-comment">💬 Comment</button>
      `;
      if (n.comments && n.comments.length > 0) {
        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'comments';
        n.comments.forEach(c => {
          const commentP = document.createElement('p');
          commentP.className = 'comment';
          const commentAuthor = c.userName || c.userId?.name || 'Anonymous';
          const commentRole = c.userRole || c.userId?.role || '';
          commentP.innerHTML = `💬 <strong>${commentAuthor}</strong>${commentRole ? ` (${commentRole})` : ''}: ${c.text}`;
          commentsDiv.appendChild(commentP);
        });
        li.appendChild(commentsDiv);
      }
      list.appendChild(li);
    });
  } catch (error) {
    showError(list, error.message);
  }
};

async function likeNews(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Please sign in to like news');
    window.location.href = '/signin.html';
    return;
  }
  try {
    const updated = await fetchJson(`${api.news}/${id}/like`, { method: 'POST' });
    document.getElementById('loadNews').click();
  } catch (error) {
    alert('Failed to like: ' + error.message);
  }
}

async function showCommentForm(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Please sign in to comment');
    window.location.href = '/signin.html';
    return;
  }
  const text = prompt('Enter your comment:');
  if (!text) return;
  try {
    await fetchJson(`${api.news}/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    document.getElementById('loadNews').click();
  } catch (error) {
    alert('Failed to comment: ' + error.message);
  }
}

// Events
document.getElementById('loadEvents').onclick = async () => {
  const list = document.getElementById('eventsList');
  showLoading(list);
  try {
    const events = await fetchJson(api.events);
    list.innerHTML = '';
    if (events.length === 0) {
      list.innerHTML = '<li>No events found</li>';
      return;
    }
    events.forEach((e) => {
      const li = document.createElement('li');
      const id = e._id || e.id;
      const author = e.authorName || e.authorId?.name || 'Unknown';
      const interestedBy = e.interestedBy || [];
      const interestedByNames = interestedBy.map(u => u.name || u.email || 'User').slice(0, 5);
      const interestedByText = interestedBy.length > 0 ? ` (${interestedByNames.join(', ')}${interestedBy.length > 5 ? '...' : ''})` : '';
      
      li.innerHTML = `
        <strong>${e.title}</strong> — ${e.date}<br>
        ${e.description || ''}<br>
        <small>By: ${author} | Type: ${e.type || 'event'} | Department: ${e.department || 'general'}</small><br>
        <button onclick="markInterest('${id}')" class="btn-interest">⭐ Mark Interest (${e.interested || 0})${interestedByText}</button>
        <button onclick="shareEvent('${id}')" class="btn-share">🔗 Share</button>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    showError(list, error.message);
  }
};

async function markInterest(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Please sign in to mark interest');
    window.location.href = '/signin.html';
    return;
  }
  try {
    const updated = await fetchJson(`${api.events}/${id}/interest`, { method: 'POST' });
    document.getElementById('loadEvents').click();
  } catch (error) {
    alert('Failed to mark interest: ' + error.message);
  }
}

async function shareEvent(id) {
  try {
    const result = await fetchJson(`${api.events}/${id}/share`, { method: 'POST' });
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(result.link);
      alert('Share link copied to clipboard!');
    } else {
      prompt('Share link:', result.link);
    }
  } catch (error) {
    alert('Failed to share: ' + error.message);
  }
}

// Rooms
document.getElementById('loadRooms').onclick = async () => {
  const list = document.getElementById('roomsList');
  showLoading(list);
  try {
    const rooms = await fetchJson(api.rooms);
    list.innerHTML = '';
    if (rooms.length === 0) {
      list.innerHTML = '<li>No rooms found</li>';
      return;
    }
    rooms.forEach((r) => {
      const li = document.createElement('li');
      const id = r._id || r.id;
      const isFavorite = r.favoriteBy && r.favoriteBy.length > 0;
      li.innerHTML = `
        <strong>${r.name}</strong> (${r.building}) — 
        <span class="status ${r.status === 'Available' ? 'available' : 'occupied'}">${r.status}</span>
        <button onclick="toggleFavorite('${id}')" class="btn-favorite">${isFavorite ? '❤️' : '🤍'} Favorite</button>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    showError(list, error.message);
  }
};

async function toggleFavorite(id) {
  try {
    await fetchJson(`${api.rooms}/${id}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123' })
    });
    document.getElementById('loadRooms').click();
  } catch (error) {
    alert('Failed to toggle favorite: ' + error.message);
  }
}

// Thesis
document.getElementById('loadThesis').onclick = async () => {
  const list = document.getElementById('thesisList');
  showLoading(list);
  try {
    const slots = await fetchJson(api.thesis);
    list.innerHTML = '';
    if (slots.length === 0) {
      list.innerHTML = '<li>No thesis slots found</li>';
      return;
    }
    slots.forEach((s) => {
      const li = document.createElement('li');
      const id = s._id || s.id;
      li.innerHTML = `
        <strong>${s.supervisor}</strong> — ${s.topic || 'Open topic'}<br>
        <span class="status ${s.status === 'open' ? 'available' : 'occupied'}">${s.status}</span><br>
        Requests: ${s.requests ? s.requests.length : 0}
        ${s.status === 'open' ? `<button onclick="requestSupervision('${id}')" class="btn-request">Request Supervision</button>` : ''}
      `;
      if (s.requests && s.requests.length > 0) {
        const requestsDiv = document.createElement('div');
        requestsDiv.className = 'requests';
        s.requests.forEach(req => {
          const reqP = document.createElement('p');
          reqP.className = 'request';
          reqP.textContent = `📋 ${req.studentName || 'Student'}: ${req.status || 'pending'}`;
          requestsDiv.appendChild(reqP);
        });
        li.appendChild(requestsDiv);
      }
      list.appendChild(li);
    });
  } catch (error) {
    showError(list, error.message);
  }
};

async function requestSupervision(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Please sign in to request supervision');
    window.location.href = '/signin.html';
    return;
  }
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const studentName = user.name || prompt('Enter your name:');
  if (!studentName) return;
  const topic = prompt('Enter thesis topic (optional):') || '';
  try {
    await fetchJson(`${api.thesis}/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({ studentName, topic, groupMembers: [] })
    });
    document.getElementById('loadThesis').click();
  } catch (error) {
    alert('Failed to request supervision: ' + error.message);
  }
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const token = localStorage.getItem('authToken');
  
  const userMenu = document.getElementById('userMenu');
  const authButtons = document.getElementById('authButtons');
  const userName = document.getElementById('userName');
  const signOutBtn = document.getElementById('signOutBtn');
  
  if (user && token) {
    if (userName) userName.textContent = user.name || user.email;
    if (userMenu) userMenu.style.display = 'block';
    if (authButtons) authButtons.style.display = 'none';
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        signOut();
      });
    }
  } else {
    if (userMenu) userMenu.style.display = 'none';
    if (authButtons) authButtons.style.display = 'flex';
  }
});

