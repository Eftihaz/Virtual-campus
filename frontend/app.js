// Main application logic with enhanced UI/UX
// Load utils first
const api = {
  menu: '/api/cafeteria/menu',
  news: '/api/news',
  events: '/api/events',
  rooms: '/api/rooms',
  thesis: '/api/thesis',
};

// Enhanced fetch with error handling and loading states
async function fetchJson(url, options = {}) {
  try {
    const token = localStorage.getItem('authToken');
    const headers = { ...options.headers };
    
    // Only add Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Always add Authorization if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, { ...options, headers });
    
    // Handle 401 - redirect to signin
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      toast.error('Session expired. Please sign in again.');
      setTimeout(() => window.location.href = '/signin.html', 1500);
      throw new Error('Unauthorized');
    }
    
    // Handle 403 - permission denied
    if (res.status === 403) {
      toast.error('Permission denied');
      throw new Error('Permission denied');
    }
    
    // Handle 204 No Content - common for DELETE operations
    if (res.status === 204) {
      return { success: true };
    }
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Server returned HTML instead of JSON. Check API route.');
      }
      // Handle empty responses for successful requests
      if (!text && res.ok) {
        return { success: true };
      }
      throw new Error(`Unexpected response type: ${contentType}`);
    }
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `Request failed: ${res.status}` }));
      throw new Error(error.message || `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    if (handleNetworkError && handleNetworkError(error)) {
      throw error;
    }
    throw error;
  }
}

// Get auth headers (for JSON requests only)
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

// Cafeteria Menu
async function loadMenu() {
  const list = document.getElementById('menuList');
  const loadBtn = document.getElementById('loadMenu');
  
  if (!list) return;
  
  list.innerHTML = '';
  showLoading(list);
  loadBtn.disabled = true;
  
  try {
    // FIX: Allergy filter must work with API query parameter
    const allergyFilter = document.getElementById('allergyFilter');
    const allergy = allergyFilter?.value || '';
    // Map common allergy names to their database values
    const allergyMap = {
      'gluten': 'gluten',
      'dairy': 'dairy',
      'peanut': 'peanut',
      'soy': 'soy',
      'shellfish': 'shellfish',
      'egg': 'egg'
    };
    const allergyParam = allergyMap[allergy] || allergy;
    const qs = allergyParam ? `?allergy=${encodeURIComponent(allergyParam)}` : '';
    const menu = await fetchJson(`${api.menu}${qs}`);
    
    list.innerHTML = '';
    hideLoading(list);
    
    if (menu.length === 0) {
      list.appendChild(createEmptyState('No menu items found', '🍽️'));
      return;
    }
    
    menu.forEach((item) => {
      const li = document.createElement('li');
      // Handle allergies as array or string
      let allergiesList = item.allergies;
      if (typeof allergiesList === 'string') {
        allergiesList = allergiesList.split(',').map(a => a.trim()).filter(a => a);
      }
      const allergies = (Array.isArray(allergiesList) && allergiesList.length) 
        ? `Allergies: ${allergiesList.join(', ')}` 
        : 'Allergy-safe';
      li.innerHTML = `
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="menu-image" onclick="openLightbox('${item.image}')" />` : ''}
        <strong>${item.name}</strong> ৳${item.price} 
        <span class="status ${item.available ? 'available' : 'unavailable'}">${item.available ? 'Available' : 'Out'}</span>
        <span class="pill allergy-pill">${allergies}</span>
        ${hasPermission('admin') ? `<span class="sales-badge">📊 Sold: ${item.salesCount || 0}</span>` : ''}
      `;
      
      // Add admin controls
      if (hasPermission('admin')) {
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="showAddSalesModal('${item._id || item.id}', '${escapeHtml(item.name)}')" class="btn btn-secondary">📈 Add Sold</button>
          <button onclick="editMenuItem('${item._id || item.id}')" class="btn btn-edit">Edit</button>
          <button onclick="deleteMenuItem('${item._id || item.id}', '${escapeHtml(item.name)}')" class="btn btn-danger">Delete</button>
        `;
        li.appendChild(actions);
      }
      
      list.appendChild(li);
    });
    
    toast.success('Menu loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  } finally {
    loadBtn.disabled = false;
  }
}

async function deleteMenuItem(id, name) {
  const confirmed = await confirmDialog(`Are you sure you want to delete "${name}"?`, 'Delete Menu Item');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.menu}/${id}`, { method: 'DELETE' });
    toast.success('Menu item deleted successfully');
    loadMenu();
  } catch (error) {
    toast.error(error.message);
  }
}

function editMenuItem(id) {
  // Load item and show edit form
  loadMenu().then(() => {
    // Find item and show modal form
    showMenuItemForm(id);
  });
}

function showMenuItemForm(id = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const form = document.createElement('div');
  form.className = 'modal-dialog';
  form.innerHTML = `
    <div class="modal-header">
      <h3>${id ? 'Edit' : 'Add'} Menu Item</h3>
    </div>
    <div class="modal-body">
      <form id="menuItemForm">
        <div class="form-group">
          <label for="menuName">Name *</label>
          <input type="text" id="menuName" required />
        </div>
        <div class="form-group">
          <label for="menuPrice">Price *</label>
          <input type="number" id="menuPrice" step="0.01" required />
        </div>
        <div class="form-group">
          <label for="menuImage">Food Photo (max 5MB)</label>
          <input type="file" id="menuImage" accept="image/*" />
          <div id="menuImagePreview" class="image-preview"></div>
        </div>
        <div class="form-group">
          <label for="menuAvailable">Available</label>
          <input type="checkbox" id="menuAvailable" checked />
        </div>
        <div class="form-group">
          <label for="menuAllergies">Select Allergy</label>
          <select id="menuAllergies" multiple size="6">
            <option value="gluten">Gluten</option>
            <option value="dairy">Dairy</option>
            <option value="peanut">Peanut</option>
            <option value="soy">Soy</option>
            <option value="shellfish">Shellfish</option>
            <option value="egg">Egg</option>
            <option value="tree-nut">Tree Nut</option>
            <option value="sesame">Sesame</option>
          </select>
          <small style="display: block; margin-top: 5px; color: var(--text-secondary);">Hold Ctrl/Cmd to select multiple</small>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveMenuItem('${id || ''}')">Save</button>
    </div>
  `;
  
  // Image preview handler
  const imageInput = form.querySelector('#menuImage');
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = form.querySelector('#menuImagePreview');
        preview.innerHTML = `
          <img src="${event.target.result}" alt="Preview" />
          <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('menuImage').value='';" class="btn-remove-image">Remove</button>
        `;
      };
      reader.readAsDataURL(file);
    }
  });
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  
  if (id) {
    // Load existing data
    fetchJson(`${api.menu}`).then(menu => {
      const item = menu.find(m => (m._id || m.id) === id);
      if (item) {
        document.getElementById('menuName').value = item.name;
        document.getElementById('menuPrice').value = item.price;
        document.getElementById('menuAvailable').checked = item.available;
        
        // Set multi-select for allergies
        const allergiesSelect = document.getElementById('menuAllergies');
        const allergyList = Array.isArray(item.allergies) ? item.allergies : (item.allergies?.split(',') || []);
        for (let option of allergiesSelect.options) {
          option.selected = allergyList.includes(option.value);
        }
        
        if (item.image) {
          const preview = form.querySelector('#menuImagePreview');
          preview.innerHTML = `
            <img src="${item.image}" alt="Current image" />
            <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('menuImage').value='';" class="btn-remove-image">Remove</button>
          `;
        }
      }
    });
  }
}

async function saveMenuItem(id) {
  const form = document.getElementById('menuItemForm');
  if (!form || !validateForm(form)) return;
  
  const imageFile = document.getElementById('menuImage').files[0];
  const formData = new FormData();
  formData.append('name', document.getElementById('menuName').value);
  formData.append('price', document.getElementById('menuPrice').value);
  formData.append('available', document.getElementById('menuAvailable').checked);
  
  // Get selected allergies from multi-select
  const allergiesSelect = document.getElementById('menuAllergies');
  const allergies = Array.from(allergiesSelect.selectedOptions).map(option => option.value);
  formData.append('allergies', JSON.stringify(allergies));
  
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please sign in to continue');
      setTimeout(() => window.location.href = '/signin.html', 1500);
      return;
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };
    // Don't set Content-Type for FormData - browser sets it automatically with boundary
    
    const response = await fetch(id ? `${api.menu}/${id}` : api.menu, { 
      method: id ? 'PUT' : 'POST', 
      headers,
      body: formData 
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed: ${response.status}` }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    toast.success(id ? 'Menu item updated successfully' : 'Menu item added successfully');
    document.querySelector('.modal-overlay')?.remove();
    clearForm(form);
    loadMenu();
  } catch (error) {
    toast.error(error.message || 'Failed to save menu item');
  }
}

// News
async function loadNews() {
  const list = document.getElementById('newsList');
  const loadBtn = document.getElementById('loadNews');
  
  if (!list) return;
  
  list.innerHTML = '';
  showLoading(list);
  loadBtn.disabled = true;
  
  try {
    // Get filter values
    const department = document.getElementById('newsFilter')?.value || '';
    const category = document.getElementById('newsCategoryFilter')?.value || '';
    
    // Build query string
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    
    const news = await fetchJson(`${api.news}${qs}`);
    
    list.innerHTML = '';
    hideLoading(list);
    
    if (news.length === 0) {
      list.appendChild(createEmptyState('No news items found', '📰'));
      return;
    }
    
    // Get current user once for all items
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id;
    
    news.forEach((n) => {
      const li = document.createElement('li');
      const id = n._id || n.id;
      const author = n.authorName || n.authorId?.name || 'Unknown';
      const likedBy = n.likedBy || [];
      const likedByNames = likedBy.map(u => u.name || u.email || 'User');
      
      const likedByHtml = likedBy.length > 0 ? `
        <span class="liked-by-list">
          (Liked by ${likedBy.length} ${likedBy.length === 1 ? 'person' : 'people'})
          <div class="liked-by-tooltip">
            ${likedByNames.join('<br>')}
          </div>
        </span>
      ` : '';
      
      // FIX: Use likedBy.length instead of n.likes
      const likeCount = likedBy ? likedBy.length : 0;
      const isLiked = likedBy.some(u => (u._id || u.id || u)?.toString() === currentUserId?.toString());
      const likeIcon = isLiked ? '❤️' : '🤍';
      const likeDisplay = `${likeIcon} ${likeCount}`;
      const likeText = likeCount === 0 ? 'Be the first to like!' : likedBy.length > 0 ? `Liked by: ${likedByNames.slice(0, 3).join(', ')}${likedBy.length > 3 ? ` +${likedBy.length - 3} others` : ''}` : '';
      
      li.innerHTML = `
        ${n.image ? `<img src="${n.image}" alt="${escapeHtml(n.title)}" class="news-image" onclick="openLightbox('${n.image}')" />` : ''}
        <strong>${escapeHtml(n.title)}</strong><br>
        <div>${escapeHtml(n.body)}</div><br>
        <small>By: ${escapeHtml(author)} | Category: ${n.category || 'general'} | Department: ${n.department || 'general'}</small><br>
        <button onclick="likeNews('${id}')" class="btn-like ${isLiked ? 'liked' : ''}">${likeDisplay} ${likeText ? `(${likeText})` : ''}</button>
        <button onclick="showCommentForm('${id}')" class="btn-comment">💬 Comment</button>
      `;
      
      // FIX: Proper delete permissions - Admin can delete everything, Faculty/Students can delete own
      const authorId = n.authorId?._id || n.authorId?.id || n.authorId;
      const canEdit = hasPermission(['admin', 'faculty']) && 
                     (currentUser?.role === 'admin' || (authorId && authorId.toString() === currentUserId?.toString()));
      const canDelete = currentUser?.role === 'admin' || (authorId && authorId.toString() === currentUserId?.toString());
      
      if (canEdit) {
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="editNews('${id}')" class="btn btn-edit">Edit</button>
        `;
        if (canDelete) {
          actions.innerHTML += `<button onclick="deleteNews('${id}', '${escapeHtml(n.title)}')" class="btn btn-danger">Delete</button>`;
        }
        li.appendChild(actions);
      } else if (currentUser?.role === 'admin') {
        // Admin can delete any news
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="deleteNews('${id}', '${escapeHtml(n.title)}')" class="btn btn-danger">Delete</button>
        `;
        li.appendChild(actions);
      }
      
      // (no inline add button here) — news-level Add button is added below
      
      if (n.comments && n.comments.length > 0) {
        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'comments';
        n.comments.forEach(c => {
          const commentP = document.createElement('p');
          commentP.className = 'comment';
          const commentAuthor = c.userName || c.userId?.name || 'Anonymous';
          const commentRole = c.userRole || c.userId?.role || '';
          commentP.innerHTML = `💬 <strong>${escapeHtml(commentAuthor)}</strong>${commentRole ? ` (${commentRole})` : ''}: ${escapeHtml(c.text)}`;
          commentsDiv.appendChild(commentP);
        });
        li.appendChild(commentsDiv);
      }
      
      list.appendChild(li);
    });

    toast.success('News loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  } finally {
    loadBtn.disabled = false;
  }
}

async function likeNews(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('Please sign in to like news');
    setTimeout(() => window.location.href = '/signin.html', 1500);
    return;
  }
  
  try {
    await fetchJson(`${api.news}/${id}/like`, { method: 'POST' });
    toast.success('News liked');
    loadNews();
  } catch (error) {
    toast.error(error.message);
  }
}

async function showCommentForm(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('Please sign in to comment');
    setTimeout(() => window.location.href = '/signin.html', 1500);
    return;
  }
  
  const text = prompt('Enter your comment:');
  if (!text) return;
  
  try {
    await fetchJson(`${api.news}/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    toast.success('Comment added');
    loadNews();
  } catch (error) {
    toast.error(error.message);
  }
}

async function deleteNews(id, title) {
  const confirmed = await confirmDialog(`Are you sure you want to delete "${title}"?`, 'Delete News');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.news}/${id}`, { method: 'DELETE' });
    toast.success('News deleted successfully');
    loadNews();
  } catch (error) {
    toast.error(error.message);
  }
}

function editNews(id) {
  // Load news and show edit form
  showNewsForm(id);
}

function showNewsForm(id = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const form = document.createElement('div');
  form.className = 'modal-dialog';
  form.innerHTML = `
    <div class="modal-header">
      <h3>${id ? 'Edit' : 'Add'} News</h3>
    </div>
    <div class="modal-body">
      <form id="newsForm">
        <div class="form-group">
          <label for="newsTitle">Title *</label>
          <input type="text" id="newsTitle" required />
        </div>
        <div class="form-group">
          <label for="newsBody">Body *</label>
          <textarea id="newsBody" required rows="5"></textarea>
        </div>
        <div class="form-group">
          <label for="newsImage">Image (max 5MB)</label>
          <input type="file" id="newsImage" accept="image/*" />
          <div id="newsImagePreview" class="image-preview"></div>
        </div>
        <div class="form-group">
          <label for="newsCategory">Category</label>
          <input type="text" id="newsCategory" />
        </div>
        <div class="form-group">
          <label for="newsDepartment">Department</label>
          <input type="text" id="newsDepartment" />
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNews('${id || ''}')">Save</button>
    </div>
  `;
  
  // Image preview handler
  const imageInput = form.querySelector('#newsImage');
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = form.querySelector('#newsImagePreview');
        preview.innerHTML = `
          <img src="${event.target.result}" alt="Preview" />
          <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('newsImage').value='';" class="btn-remove-image">Remove</button>
        `;
      };
      reader.readAsDataURL(file);
    }
  });
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  
  if (id) {
    fetchJson(api.news).then(news => {
      const item = news.find(n => (n._id || n.id) === id);
      if (item) {
        document.getElementById('newsTitle').value = item.title;
        document.getElementById('newsBody').value = item.body;
        document.getElementById('newsCategory').value = item.category || '';
        document.getElementById('newsDepartment').value = item.department || '';
        if (item.image) {
          const preview = form.querySelector('#newsImagePreview');
          preview.innerHTML = `
            <img src="${item.image}" alt="Current image" />
            <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('newsImage').value='';" class="btn-remove-image">Remove</button>
          `;
        }
      }
    });
  }
}

async function saveNews(id) {
  const form = document.getElementById('newsForm');
  if (!form || !validateForm(form)) return;
  
  const imageFile = document.getElementById('newsImage').files[0];
  const formData = new FormData();
  formData.append('title', document.getElementById('newsTitle').value);
  formData.append('body', document.getElementById('newsBody').value);
  formData.append('category', document.getElementById('newsCategory').value || 'general');
  formData.append('department', document.getElementById('newsDepartment').value || 'general');
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please sign in to continue');
      setTimeout(() => window.location.href = '/signin.html', 1500);
      return;
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };
    // Don't set Content-Type for FormData
    
    const response = await fetch(id ? `${api.news}/${id}` : api.news, { 
      method: id ? 'PUT' : 'POST', 
      headers,
      body: formData 
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed: ${response.status}` }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    toast.success(id ? 'News updated successfully' : 'News added successfully');
    document.querySelector('.modal-overlay')?.remove();
    clearForm(form);
    loadNews();
  } catch (error) {
    toast.error(error.message || 'Failed to save news');
  }
}

// Events
async function loadEvents() {
  const list = document.getElementById('eventsList');
  const loadBtn = document.getElementById('loadEvents');
  
  if (!list) return;
  
  list.innerHTML = '';
  showLoading(list);
  loadBtn.disabled = true;
  
  try {
    // Get filter values
    const department = document.getElementById('eventsFilter')?.value || '';
    const type = document.getElementById('eventsTypeFilter')?.value || '';
    
    // Build query string
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (type) params.append('type', type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    
    const events = await fetchJson(`${api.events}${qs}`);
    
    list.innerHTML = '';
    hideLoading(list);
    
    if (events.length === 0) {
      list.appendChild(createEmptyState('No events found', '📅'));
      return;
    }
    
    // Get current user once for all items
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id;
    
    events.forEach((e) => {
      const li = document.createElement('li');
      const id = e._id || e.id;
      const author = e.authorName || e.authorId?.name || 'Unknown';
      const interestedBy = e.interestedBy || [];
      const interestedByNames = interestedBy.map(u => u.name || u.email || 'User');
      
      const interestedByHtml = interestedBy.length > 0 ? `
        <span class="liked-by-list">
          (${interestedBy.length} ${interestedBy.length === 1 ? 'person' : 'people'} interested)
          <div class="liked-by-tooltip">
            ${interestedByNames.join('<br>')}
          </div>
        </span>
      ` : '';
      
      // FIX: Use interestedBy.length instead of e.interested
      const interestCount = interestedBy ? interestedBy.length : 0;
      const isInterested = interestedBy.some(u => (u._id || u.id || u)?.toString() === currentUserId?.toString());
      const interestIcon = isInterested ? '⭐' : '☆';
      const interestDisplay = `${interestIcon} ${interestCount}`;
      const interestText = interestCount === 0 ? 'Be the first to show interest!' : interestedBy.length > 0 ? `${interestedByNames.slice(0, 3).join(', ')}${interestedBy.length > 3 ? ` +${interestedBy.length - 3} others` : ''}` : '';
      
      li.innerHTML = `
        ${e.photo || e.image ? `<img src="${e.photo || e.image}" alt="${escapeHtml(e.title)}" class="event-image" onclick="openLightbox('${e.photo || e.image}')" />` : ''}
        <strong>${escapeHtml(e.title)}</strong> — ${e.date}<br>
        <div>${escapeHtml(e.description || '')}</div><br>
        <small>By: ${escapeHtml(author)} | Type: ${e.type || 'event'} | Department: ${e.department || 'general'}</small><br>
        <button onclick="markInterest('${id}')" class="btn-interest ${isInterested ? 'interested' : ''}">${interestDisplay} ${interestText ? `(${interestText})` : ''}</button>
        <button onclick="shareEvent('${id}')" class="btn-share">🔗 Share</button>
      `;
      
      // FIX: Proper delete permissions
      const authorId = e.authorId?._id || e.authorId?.id || e.authorId;
      const canEdit = hasPermission(['admin', 'faculty']) || 
                     (currentUser?.role === 'student' && authorId && authorId.toString() === currentUserId?.toString());
      const canDelete = currentUser?.role === 'admin' || (authorId && authorId.toString() === currentUserId?.toString());
      
      if (canEdit) {
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="editEvent('${id}')" class="btn btn-edit">Edit</button>
        `;
        if (canDelete) {
          actions.innerHTML += `<button onclick="deleteEvent('${id}', '${escapeHtml(e.title)}')" class="btn btn-danger">Delete</button>`;
        }
        li.appendChild(actions);
      } else if (currentUser?.role === 'admin') {
        // Admin can delete any event
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="deleteEvent('${id}', '${escapeHtml(e.title)}')" class="btn btn-danger">Delete</button>
        `;
        li.appendChild(actions);
      }
      
      list.appendChild(li);
    });

    toast.success('Events loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  } finally {
    loadBtn.disabled = false;
  }
}

async function markInterest(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('Please sign in to mark interest');
    setTimeout(() => window.location.href = '/signin.html', 1500);
    return;
  }
  
  try {
    await fetchJson(`${api.events}/${id}/interest`, { method: 'POST' });
    toast.success('Interest marked');
    loadEvents();
  } catch (error) {
    toast.error(error.message);
  }
}

async function shareEvent(id) {
  try {
    const result = await fetchJson(`${api.events}/${id}/share`, { method: 'POST' });
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(result.link);
      toast.success('Share link copied to clipboard!');
    } else {
      prompt('Share link:', result.link);
    }
  } catch (error) {
    toast.error(error.message);
  }
}

async function deleteEvent(id, title) {
  const confirmed = await confirmDialog(`Are you sure you want to delete "${title}"?`, 'Delete Event');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.events}/${id}`, { method: 'DELETE' });
    toast.success('Event deleted successfully');
    loadEvents();
  } catch (error) {
    toast.error(error.message);
  }
}

function editEvent(id) {
  showEventForm(id);
}

function showEventForm(id = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const form = document.createElement('div');
  form.className = 'modal-dialog';
  form.innerHTML = `
    <div class="modal-header">
      <h3>${id ? 'Edit' : 'Add'} Event</h3>
    </div>
    <div class="modal-body">
      <form id="eventForm">
        <div class="form-group">
          <label for="eventTitle">Title *</label>
          <input type="text" id="eventTitle" required />
        </div>
        <div class="form-group">
          <label for="eventDescription">Description</label>
          <textarea id="eventDescription" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="eventImage">Event Banner (max 5MB)</label>
          <input type="file" id="eventImage" accept="image/*" />
          <div id="eventImagePreview" class="image-preview"></div>
        </div>
        <div class="form-group">
          <label for="eventDate">Date *</label>
          <input type="date" id="eventDate" required />
        </div>
        <div class="form-group">
          <label for="eventType">Type</label>
          <input type="text" id="eventType" />
        </div>
        <div class="form-group">
          <label for="eventDepartment">Department</label>
          <input type="text" id="eventDepartment" />
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEvent('${id || ''}')">Save</button>
    </div>
  `;
  
  // Image preview handler
  const imageInput = form.querySelector('#eventImage');
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = form.querySelector('#eventImagePreview');
        preview.innerHTML = `
          <img src="${event.target.result}" alt="Preview" />
          <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('eventImage').value='';" class="btn-remove-image">Remove</button>
        `;
      };
      reader.readAsDataURL(file);
    }
  });
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  
  if (id) {
    fetchJson(api.events).then(events => {
      const item = events.find(e => (e._id || e.id) === id);
      if (item) {
        document.getElementById('eventTitle').value = item.title;
        document.getElementById('eventDescription').value = item.description || '';
        document.getElementById('eventDate').value = item.date;
        document.getElementById('eventType').value = item.type || '';
        document.getElementById('eventDepartment').value = item.department || '';
        if (item.photo || item.image) {
          const preview = form.querySelector('#eventImagePreview');
          preview.innerHTML = `
            <img src="${item.photo || item.image}" alt="Current image" />
            <button type="button" onclick="this.parentElement.innerHTML=''; document.getElementById('eventImage').value='';" class="btn-remove-image">Remove</button>
          `;
        }
      }
    });
  }
}

async function saveEvent(id) {
  const form = document.getElementById('eventForm');
  if (!form || !validateForm(form)) return;
  
  // Validate date is in the future
  const eventDate = document.getElementById('eventDate').value;
  if (eventDate && new Date(eventDate) < new Date()) {
    toast.error('Event date must be in the future');
    return;
  }
  
  const imageFile = document.getElementById('eventImage').files[0];
  const formData = new FormData();
  formData.append('title', document.getElementById('eventTitle').value);
  formData.append('description', document.getElementById('eventDescription').value);
  formData.append('date', eventDate);
  formData.append('type', document.getElementById('eventType').value || 'event');
  formData.append('department', document.getElementById('eventDepartment').value || 'general');
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please sign in to continue');
      setTimeout(() => window.location.href = '/signin.html', 1500);
      return;
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };
    // Don't set Content-Type for FormData
    
    const response = await fetch(id ? `${api.events}/${id}` : api.events, { 
      method: id ? 'PUT' : 'POST', 
      headers,
      body: formData 
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed: ${response.status}` }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    toast.success(id ? 'Event updated successfully' : 'Event added successfully');
    document.querySelector('.modal-overlay')?.remove();
    clearForm(form);
    loadEvents();
  } catch (error) {
    toast.error(error.message || 'Failed to save event');
  }
}

// Rooms
async function loadRooms() {
  const list = document.getElementById('roomsList');
  const loadBtn = document.getElementById('loadRooms');
  
  if (!list) return;
  
  list.innerHTML = '';
  showLoading(list);
  loadBtn.disabled = true;
  
  try {
    // Get filter value
    const statusFilter = document.getElementById('roomsStatusFilter')?.value || '';
    
    const rooms = await fetchJson(api.rooms);
    
    // Filter by status if selected
    let filteredRooms = rooms;
    if (statusFilter) {
      filteredRooms = rooms.filter(r => r.status === statusFilter);
    }
    
    list.innerHTML = '';
    hideLoading(list);
    
    if (filteredRooms.length === 0) {
      list.appendChild(createEmptyState('No rooms found', '🏫'));
      return;
    }
    
    filteredRooms.forEach((r) => {
      const li = document.createElement('li');
      const id = r._id || r.id;
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const currentUserId = currentUser?._id || currentUser?.id;
      const isFavorite = r.favoriteBy && r.favoriteBy.some(favId => favId?.toString() === currentUserId?.toString());
      
      li.innerHTML = `
        <strong>${escapeHtml(r.name)}</strong> (${escapeHtml(r.building)}) — 
        <span class="status ${r.status === 'Available' ? 'available' : 'occupied'}">${r.status}</span>
        <button onclick="toggleFavorite('${id}')" class="btn-favorite">${isFavorite ? '❤️' : '🤍'} Favorite</button>
      `;
      
      // Add admin controls
      if (hasPermission('admin')) {
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="editRoom('${id}')" class="btn btn-edit">Edit</button>
          <button onclick="deleteRoom('${id}', '${escapeHtml(r.name)}')" class="btn btn-danger">Delete</button>
        `;
        li.appendChild(actions);
      }
      
      list.appendChild(li);
    });

    toast.success('Rooms loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  } finally {
    loadBtn.disabled = false;
  }
}

async function toggleFavorite(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('Please sign in to favorite rooms');
    setTimeout(() => window.location.href = '/signin.html', 1500);
    return;
  }
  
  try {
    await fetchJson(`${api.rooms}/${id}/favorite`, { method: 'POST' });
    toast.success('Favorite toggled');
    loadRooms();
  } catch (error) {
    toast.error(error.message);
  }
}

async function deleteRoom(id, name) {
  const confirmed = await confirmDialog(`Are you sure you want to delete "${name}"?`, 'Delete Room');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.rooms}/${id}`, { method: 'DELETE' });
    toast.success('Room deleted successfully');
    loadRooms();
  } catch (error) {
    toast.error(error.message);
  }
}

function editRoom(id) {
  showRoomForm(id);
}

function showRoomForm(id = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const form = document.createElement('div');
  form.className = 'modal-dialog';
  form.innerHTML = `
    <div class="modal-header">
      <h3>${id ? 'Edit' : 'Add'} Room</h3>
    </div>
    <div class="modal-body">
      <form id="roomForm">
        <div class="form-group">
          <label for="roomName">Name *</label>
          <input type="text" id="roomName" required />
        </div>
        <div class="form-group">
          <label for="roomBuilding">Building *</label>
          <input type="text" id="roomBuilding" required />
        </div>
        <div class="form-group">
          <label for="roomStatus">Status</label>
          <select id="roomStatus">
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
          </select>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveRoom('${id || ''}')">Save</button>
    </div>
  `;
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  
  if (id) {
    fetchJson(api.rooms).then(rooms => {
      const item = rooms.find(r => (r._id || r.id) === id);
      if (item) {
        document.getElementById('roomName').value = item.name;
        document.getElementById('roomBuilding').value = item.building;
        document.getElementById('roomStatus').value = item.status;
      }
    });
  }
}

async function saveRoom(id) {
  const form = document.getElementById('roomForm');
  if (!validateForm(form)) return;
  
  const data = {
    name: document.getElementById('roomName').value,
    building: document.getElementById('roomBuilding').value,
    status: document.getElementById('roomStatus').value,
  };
  
  try {
    if (id) {
      await fetchJson(`${api.rooms}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      toast.success('Room updated successfully');
    } else {
      await fetchJson(`${api.rooms}`, { method: 'POST', body: JSON.stringify(data) });
      toast.success('Room added successfully');
    }
    document.querySelector('.modal-overlay').remove();
    clearForm(form);
    loadRooms();
  } catch (error) {
    toast.error(error.message);
  }
}

// Thesis
async function loadThesis() {
  const list = document.getElementById('thesisList');
  const loadBtn = document.getElementById('loadThesis');
  
  if (!list) return;
  
  list.innerHTML = '';
  showLoading(list);
  loadBtn.disabled = true;
  
  try {
    const slots = await fetchJson(api.thesis);
    
    list.innerHTML = '';
    hideLoading(list);
    
    if (slots.length === 0) {
      list.appendChild(createEmptyState('No thesis slots found', '📚'));
      return;
    }
    
    // Get current user once for all items
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    slots.forEach((s) => {
      const li = document.createElement('li');
      const id = s._id || s.id;
      const isSupervisor = currentUser?.name === s.supervisor || currentUser?.role === 'admin';
      
      li.innerHTML = `
        <strong>${escapeHtml(s.supervisor)}</strong> — ${escapeHtml(s.topic || 'Open topic')}<br>
        <span class="status ${s.status === 'open' ? 'available' : 'occupied'}">${s.status}</span><br>
        Requests: ${s.requests ? s.requests.length : 0}
        ${s.status === 'open' ? `<button onclick="requestSupervision('${id}')" class="btn-request">Request Supervision</button>` : ''}
      `;
      
      // Show requests for supervisors
      if (s.requests && s.requests.length > 0) {
        const requestsDiv = document.createElement('div');
        requestsDiv.className = 'requests';
        s.requests.forEach(req => {
          const reqP = document.createElement('p');
          reqP.className = 'request';
          reqP.innerHTML = `📋 ${escapeHtml(req.studentName || 'Student')}: ${req.status || 'pending'}`;
          
          // FIX: Add proper status badges and action buttons for supervisors
          const statusClass = req.status === 'accepted' ? 'status-accepted' : req.status === 'rejected' ? 'status-rejected' : 'status-pending';
          reqP.innerHTML = `📋 ${escapeHtml(req.studentName || 'Student')}: <span class="${statusClass}">${req.status || 'pending'}</span>`;
          if (req.topic) {
            reqP.innerHTML += `<br><small>Topic: ${escapeHtml(req.topic)}</small>`;
          }
          if (req.groupMembers && req.groupMembers.length > 0) {
            reqP.innerHTML += `<br><small>Group: ${escapeHtml(req.groupMembers.join(', '))}</small>`;
          }
          
          // Add action buttons for supervisors
          if (isSupervisor && req.status === 'pending') {
            const actions = document.createElement('div');
            actions.className = 'action-buttons';
            actions.innerHTML = `
              <button onclick="updateThesisRequest('${id}', '${req._id || req.id}', 'accepted')" class="btn btn-success">✅ Accept</button>
              <button onclick="updateThesisRequest('${id}', '${req._id || req.id}', 'rejected')" class="btn btn-danger">❌ Reject</button>
              <button onclick="deleteThesisRequest('${id}', '${req._id || req.id}')" class="btn btn-secondary">Delete</button>
            `;
            reqP.appendChild(actions);
          }
          
          requestsDiv.appendChild(reqP);
        });
        li.appendChild(requestsDiv);
      }
      
      // FIX: Faculty can delete their own slots, Admin can delete any
      const isOwner = currentUser?.name === s.supervisor || currentUser?.role === 'admin';
      
      if (hasPermission(['admin', 'faculty'])) {
        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        actions.innerHTML = `
          <button onclick="editThesisSlot('${id}')" class="btn btn-edit">Edit</button>
        `;
        if (isOwner) {
          actions.innerHTML += `<button onclick="deleteThesisSlot('${id}', '${escapeHtml(s.supervisor)}')" class="btn btn-danger">Delete</button>`;
        }
        li.appendChild(actions);
      }
      
      // No per-item add button here; section-level "Add Thesis Slot" button is used instead

      list.appendChild(li);
    });

    toast.success('Thesis slots loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  } finally {
    loadBtn.disabled = false;
  }
}

async function requestSupervision(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('Please sign in to request supervision');
    setTimeout(() => window.location.href = '/signin.html', 1500);
    return;
  }
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const studentName = currentUser.name || prompt('Enter your name:');
  if (!studentName) return;
  
  const topic = prompt('Enter thesis topic (optional):') || '';
  
  try {
    await fetchJson(`${api.thesis}/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({ studentName, topic, groupMembers: [] })
    });
    toast.success('Supervision requested');
    loadThesis();
  } catch (error) {
    toast.error(error.message);
  }
}

async function updateThesisRequest(slotId, requestId, status) {
  try {
    await fetchJson(`${api.thesis}/${slotId}/requests/${requestId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    toast.success(`Request ${status}`);
    loadThesis();
  } catch (error) {
    toast.error(error.message);
  }
}

async function deleteThesisRequest(slotId, requestId) {
  const confirmed = await confirmDialog('Are you sure you want to delete this request?', 'Delete Request');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.thesis}/${slotId}/requests/${requestId}`, { method: 'DELETE' });
    toast.success('Request deleted');
    loadThesis();
  } catch (error) {
    toast.error(error.message);
  }
}

async function deleteThesisSlot(id, supervisor) {
  const confirmed = await confirmDialog(`Are you sure you want to delete thesis slot for "${supervisor}"?`, 'Delete Thesis Slot');
  if (!confirmed) return;
  
  try {
    await fetchJson(`${api.thesis}/${id}`, { method: 'DELETE' });
    toast.success('Thesis slot deleted successfully');
    loadThesis();
  } catch (error) {
    toast.error(error.message);
  }
}

function editThesisSlot(id) {
  showThesisForm(id);
}

function showThesisForm(id = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const form = document.createElement('div');
  form.className = 'modal-dialog';
  form.innerHTML = `
    <div class="modal-header">
      <h3>${id ? 'Edit' : 'Add'} Thesis Slot</h3>
    </div>
    <div class="modal-body">
      <form id="thesisForm">
        <div class="form-group">
          <label for="thesisSupervisor">Supervisor *</label>
          <input type="text" id="thesisSupervisor" required />
        </div>
        <div class="form-group">
          <label for="thesisTopic">Topic</label>
          <input type="text" id="thesisTopic" />
        </div>
        <div class="form-group">
          <label for="thesisStatus">Status</label>
          <select id="thesisStatus">
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="saveThesis('${id || ''}')">Save</button>
    </div>
  `;
  
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  
  if (id) {
    fetchJson(api.thesis).then(slots => {
      const item = slots.find(s => (s._id || s.id) === id);
      if (item) {
        document.getElementById('thesisSupervisor').value = item.supervisor;
        document.getElementById('thesisTopic').value = item.topic || '';
        document.getElementById('thesisStatus').value = item.status || 'open';
      }
    });
  } else {
    // Pre-fill supervisor for faculty
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser?.role === 'faculty') {
      document.getElementById('thesisSupervisor').value = currentUser.name;
    }
  }
}

async function saveThesis(id) {
  const form = document.getElementById('thesisForm');
  if (!validateForm(form)) return;
  
  const data = {
    supervisor: document.getElementById('thesisSupervisor').value,
    topic: document.getElementById('thesisTopic').value,
    status: document.getElementById('thesisStatus').value,
    open: document.getElementById('thesisStatus').value === 'open',
  };
  
  try {
    if (id) {
      await fetchJson(`${api.thesis}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      toast.success('Thesis slot updated successfully');
    } else {
      // Use supervision endpoint for faculty
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser?.role === 'faculty') {
        await fetchJson(`${api.thesis}/supervision`, { method: 'POST', body: JSON.stringify(data) });
      } else {
        await fetchJson(`${api.thesis}`, { method: 'POST', body: JSON.stringify(data) });
      }
      toast.success('Thesis slot added successfully');
    }
    document.querySelector('.modal-overlay').remove();
    clearForm(form);
    loadThesis();
  } catch (error) {
    toast.error(error.message);
  }
}

// Lightbox function for images
window.openLightbox = function(imageSrc) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" onclick="this.closest('.lightbox-overlay').remove()">×</button>
      <img src="${imageSrc}" alt="Full size" />
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
};

// Helper function to escape HTML (make it global)
window.escapeHtml = function(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Make form functions globally accessible
window.showMenuItemForm = showMenuItemForm;
window.saveMenuItem = saveMenuItem;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.showNewsForm = showNewsForm;
window.saveNews = saveNews;
window.editNews = editNews;
window.deleteNews = deleteNews;
window.showEventForm = showEventForm;
window.saveEvent = saveEvent;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.showRoomForm = showRoomForm;
window.saveRoom = saveRoom;
window.editRoom = editRoom;
window.deleteRoom = deleteRoom;
window.showThesisForm = showThesisForm;
window.saveThesis = saveThesis;
window.editThesisSlot = editThesisSlot;
window.deleteThesisSlot = deleteThesisSlot;
window.updateThesisRequest = updateThesisRequest;
window.deleteThesisRequest = deleteThesisRequest;
window.likeNews = likeNews;
window.showCommentForm = showCommentForm;
window.markInterest = markInterest;
window.shareEvent = shareEvent;
window.toggleFavorite = toggleFavorite;
window.requestSupervision = requestSupervision;

// Add sales count for menu item - admin only
async function showAddSalesModal(itemId, itemName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal-dialog';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Add Sold Quantity - ${escapeHtml(itemName)}</h3>
    </div>
    <div class="modal-body">
      <form id="salesForm">
        <div class="form-group">
          <label for="quantitySold">Quantity Sold *</label>
          <input type="number" id="quantitySold" min="1" value="1" required />
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="updateSalesCount('${itemId}')">Add</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
}

async function updateSalesCount(itemId) {
  const quantityInput = document.getElementById('quantitySold');
  const quantity = parseInt(quantityInput?.value || 1);
  
  if (!quantity || quantity < 1) {
    toast.error('Please enter a valid quantity');
    return;
  }
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please sign in to continue');
      setTimeout(() => window.location.href = '/signin.html', 1500);
      return;
    }
    
    const response = await fetch(`${api.menu}/${itemId}/sales`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed: ${response.status}` }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    toast.success(`Added ${quantity} sold item(s)`);
    document.querySelector('.modal-overlay')?.remove();
    loadMenu();
  } catch (error) {
    toast.error(error.message || 'Failed to update sales count');
  }
}

window.showAddSalesModal = showAddSalesModal;
window.updateSalesCount = updateSalesCount;

// Track room availability changes for notifications
let previousRoomStates = {};

async function checkFavoriteRoomAvailability() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  try {
    const rooms = await fetchJson(api.rooms);
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id;
    
    // Find rooms marked as favorites by current user
    const favoriteRooms = rooms.filter(r => 
      r.favoriteBy && r.favoriteBy.some(favId => favId?.toString() === currentUserId?.toString())
    );
    
    // Check for status changes
    favoriteRooms.forEach(room => {
      const roomId = room._id || room.id;
      const previousState = previousRoomStates[roomId];
      
      if (previousState && previousState.status === 'Occupied' && room.status === 'Available') {
        // Room became available - notify user
        toast.success(`🎉 ${room.name} is now available!`, 5000);
        // Could also use browser notifications here
        if (Notification && Notification.permission === 'granted') {
          new Notification('Room Available', {
            body: `${room.name} in ${room.building} is now available!`,
            icon: '🏫'
          });
        }
      }
      
      // Update state
      previousRoomStates[roomId] = { status: room.status };
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
  }
}

// Check for availability changes every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(checkFavoriteRoomAvailability, 30000);
}

// Analytics function - admin only
async function showAnalytics() {
  if (!hasPermission('admin')) {
    toast.error('Only admins can view analytics');
    return;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay analytics-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal-dialog analytics-modal';
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'analytics-close-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = () => overlay.remove();
  modal.appendChild(closeBtn);
  
  // Create header
  const header = document.createElement('div');
  header.className = 'analytics-modal-header';
  header.innerHTML = '<h2>Cafeteria Sales Analytics</h2>';
  modal.appendChild(header);
  
  // Create list container
  const list = document.createElement('div');
  list.id = 'analyticsList';
  list.className = 'list-container analytics-list';
  modal.appendChild(list);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);

  showLoading(list);

  try {
    const analytics = await fetchJson('/api/cafeteria/analytics');
    
    list.innerHTML = '';
    hideLoading(list);

    if (analytics.length === 0) {
      list.appendChild(createEmptyState('No analytics data available', '📊'));
      return;
    }

    const totalSales = analytics.reduce((sum, item) => sum + (item.salesCount || 0), 0);

    // Create pie chart data structure
    const chartColors = [
      '#003DA5', '#FFB81C', '#0052CC', '#764BA2', '#667eea', '#059669',
      '#ef4444', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'
    ];
    
    // Calculate total revenue
    const totalRevenue = analytics.reduce((sum, item) => sum + (item.price * (item.salesCount || 0)), 0);
    
    // Create pie chart SVG
    const chartSize = 300;
    const radius = chartSize / 2 - 40;
    let currentAngle = -90;
    
    const svgContainer = document.createElement('div');
    svgContainer.className = 'chart-container';
    svgContainer.innerHTML = `
      <h3>Price Distribution & Revenue Breakdown</h3>
      <svg width="${chartSize}" height="${chartSize}" style="max-width: 100%;">
        <g transform="translate(${chartSize/2}, ${chartSize/2})">
          <circle cx="0" cy="0" r="${radius - 30}" fill="white" stroke="#ddd" stroke-width="2"/>
        </g>
      </svg>
      <div class="legend-container"></div>
    `;
    
    const svg = svgContainer.querySelector('svg');
    const g = svg.querySelector('g');
    const legend = svgContainer.querySelector('.legend-container');
    
    analytics.forEach((item, index) => {
      const salesCount = item.salesCount || 0;
      const revenue = item.price * salesCount;
      const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const sliceAngle = (percentage / 100) * 360;
      
      // Calculate pie slice
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + sliceAngle) * (Math.PI / 180);
      
      const x1 = Math.cos(startAngle) * radius;
      const y1 = Math.sin(startAngle) * radius;
      const x2 = Math.cos(endAngle) * radius;
      const y2 = Math.sin(endAngle) * radius;
      
      const largeArc = sliceAngle > 180 ? 1 : 0;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
      path.setAttribute('fill', chartColors[index % chartColors.length]);
      path.setAttribute('stroke', 'white');
      path.setAttribute('stroke-width', '2');
      path.style.cursor = 'pointer';
      path.title = `${item.name}: ৳${revenue.toFixed(2)} (${percentage.toFixed(1)}%)`;
      
      g.appendChild(path);
      
      // Add legend item
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <span class="legend-color" style="background-color: ${chartColors[index % chartColors.length]}"></span>
        <span class="legend-text">
          <strong>${escapeHtml(item.name)}</strong>
          <small>৳${item.price} × ${salesCount} = ৳${revenue.toFixed(2)} (${percentage.toFixed(1)}%)</small>
        </span>
      `;
      legend.appendChild(legendItem);
      
      currentAngle += sliceAngle;
    });
    
    list.appendChild(svgContainer);
    
    // Add summary stats
    const summary = document.createElement('div');
    summary.className = 'analytics-summary';
    summary.innerHTML = `
      <div class="stat-box">
        <span class="stat-label">Total Items Sold</span>
        <span class="stat-value">${totalSales}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value">৳${totalRevenue.toFixed(2)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Avg Price per Sale</span>
        <span class="stat-value">৳${(totalRevenue / Math.max(totalSales, 1)).toFixed(2)}</span>
      </div>
    `;
    list.appendChild(summary);

    toast.success('Analytics loaded successfully');
  } catch (error) {
    hideLoading(list);
    list.appendChild(createEmptyState(`Error: ${error.message}`, '⚠️'));
    toast.error(error.message);
  }
}

window.showAnalytics = showAnalytics;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication on page load
  const token = localStorage.getItem('authToken');
  if (!token && window.location.pathname.includes('index.html')) {
    // Allow viewing index without auth, but show sign in prompt for actions
  }
  
  // Set up event listeners
  const loadMenuBtn = document.getElementById('loadMenu');
  if (loadMenuBtn) {
    loadMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadMenu();
    });
  }
  
  const loadNewsBtn = document.getElementById('loadNews');
  if (loadNewsBtn) {
    loadNewsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadNews();
    });
  }
  
  const loadEventsBtn = document.getElementById('loadEvents');
  if (loadEventsBtn) {
    loadEventsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadEvents();
    });
  }
  
  const loadRoomsBtn = document.getElementById('loadRooms');
  if (loadRoomsBtn) {
    loadRoomsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadRooms();
    });
  }
  
  const loadThesisBtn = document.getElementById('loadThesis');
  if (loadThesisBtn) {
    loadThesisBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadThesis();
    });
  }
  
  // FIX: Add filter change listeners for news and events
  const newsFilter = document.getElementById('newsFilter');
  const newsCategoryFilter = document.getElementById('newsCategoryFilter');
  if (newsFilter) {
    newsFilter.addEventListener('change', () => loadNews());
  }
  if (newsCategoryFilter) {
    newsCategoryFilter.addEventListener('change', () => loadNews());
  }
  
  const eventsFilter = document.getElementById('eventsFilter');
  const eventsTypeFilter = document.getElementById('eventsTypeFilter');
  if (eventsFilter) {
    eventsFilter.addEventListener('change', () => loadEvents());
  }
  if (eventsTypeFilter) {
    eventsTypeFilter.addEventListener('change', () => loadEvents());
  }
  
  // FIX: Room status filter auto-loads on change
  const roomsStatusFilter = document.getElementById('roomsStatusFilter');
  if (roomsStatusFilter) {
    roomsStatusFilter.addEventListener('change', () => loadRooms());
  }
  
  // FIX: Allergy filter auto-loads on change
  const allergyFilter = document.getElementById('allergyFilter');
  if (allergyFilter) {
    allergyFilter.addEventListener('change', () => {
      loadMenu();
    });
  }
  
  // Add admin menu item button
  const menuControls = document.querySelector('#cafeteria .controls');
  if (menuControls && hasPermission('admin')) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Add Item';
    addBtn.onclick = () => showMenuItemForm();
    if (!document.querySelector('.add-menu-btn')) {
      addBtn.classList.add('add-menu-btn');
      menuControls.appendChild(addBtn);
    }
  }
  
  // Show analytics button for admin
  if (hasPermission('admin')) {
    const viewAnalyticsBtn = document.getElementById('viewAnalytics');
    if (viewAnalyticsBtn) {
      viewAnalyticsBtn.style.display = 'block';
      viewAnalyticsBtn.onclick = () => showAnalytics();
    }
  }
  
  // Add news button for authenticated users
  const newsControls = document.querySelector('#news .controls');
  if (newsControls && hasPermission(['admin', 'faculty', 'student'])) {
    const addNewsBtn = document.createElement('button');
    addNewsBtn.className = 'btn btn-primary add-news-btn';
    addNewsBtn.textContent = '+ Add News';
    addNewsBtn.onclick = () => showNewsForm();
    if (!newsControls.querySelector('.add-news-btn')) {
      newsControls.appendChild(addNewsBtn);
    }
  }
  
  // Add events button for authenticated users
  const eventsControls = document.querySelector('#events .controls');
  if (eventsControls && hasPermission(['admin', 'faculty', 'student'])) {
    const addEventBtn = document.createElement('button');
    addEventBtn.className = 'btn btn-primary add-event-btn';
    addEventBtn.textContent = '+ Add Event';
    addEventBtn.onclick = () => showEventForm();
    if (!eventsControls.querySelector('.add-event-btn')) {
      eventsControls.appendChild(addEventBtn);
    }
  }
  
  // Add rooms button for admin
  const roomsControls = document.querySelector('#rooms .controls');
  if (roomsControls && hasPermission('admin')) {
    const addRoomBtn = document.createElement('button');
    addRoomBtn.className = 'btn btn-primary add-room-btn';
    addRoomBtn.textContent = '+ Add Room';
    addRoomBtn.onclick = () => showRoomForm();
    if (!roomsControls.querySelector('.add-room-btn')) {
      roomsControls.appendChild(addRoomBtn);
    }
  }
  
  // Add thesis button for faculty/admin
  const thesisControls = document.querySelector('#thesis .controls');
  if (thesisControls && hasPermission(['admin', 'faculty'])) {
    const addThesisBtn = document.createElement('button');
    addThesisBtn.className = 'btn btn-primary add-thesis-btn';
    addThesisBtn.textContent = '+ Add Thesis Slot';
    addThesisBtn.onclick = () => showThesisForm();
    if (!thesisControls.querySelector('.add-thesis-btn')) {
      thesisControls.appendChild(addThesisBtn);
    }
  }
  
  // Initialize auth UI with role display
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  
  const userMenu = document.getElementById('userMenu');
  const authButtons = document.getElementById('authButtons');
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const signOutBtn = document.getElementById('signOutBtn');
  
  if (user && token) {
    if (userName) userName.textContent = user.name || user.email;
    if (userRole) {
      userRole.textContent = user.role ? `(${user.role.charAt(0).toUpperCase() + user.role.slice(1)})` : '';
      userRole.className = 'user-role role-' + (user.role || 'student');
    }
    if (userMenu) userMenu.style.display = 'flex';
    if (authButtons) authButtons.style.display = 'none';
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        if (typeof signOut === 'function') {
          signOut();
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          window.location.href = '/signin.html';
        }
      });
    }
  } else {
    if (userMenu) userMenu.style.display = 'none';
    if (authButtons) authButtons.style.display = 'flex';
  }
  
  // Smooth scroll for nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  
  // Auto-load data on page load (with error handling)
  try {
    loadMenu();
    loadNews();
    loadEvents();
    loadRooms();
    loadThesis();
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
});


