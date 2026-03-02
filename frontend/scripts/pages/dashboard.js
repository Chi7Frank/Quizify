/**
 * Dashboard Page JavaScript
 * HCI Principles:
 * - Visibility of System Status: Loading states, empty states
 * - Recognition over Recall: Display recent rooms
 */

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Load user data
  await loadUserData();
  
  // Load rooms
  await loadRooms();
});

// ========================================
// Load User Data
// ========================================

async function loadUserData() {
  const user = getCurrentUser();
  
  if (user) {
    document.getElementById('user-name').textContent = user.fullName;
    
    // Update greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
    } else if (hour >= 17) {
      greeting = 'Good Evening';
    }
    document.querySelector('.greeting').textContent = greeting + ',';
  } else {
    // Fetch user data if not in localStorage
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      localStorage.setItem('user', JSON.stringify(userData));
      document.getElementById('user-name').textContent = userData.fullName;
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Redirect to login if unauthorized
      if (error.message.includes('Unauthorized') || error.message.includes('token')) {
        clearAuth();
        window.location.href = 'login.html';
      }
    }
  }
}

// ========================================
// Load Rooms
// ========================================

async function loadRooms() {
  const roomsList = document.getElementById('rooms-list');
  const emptyState = document.getElementById('empty-state');
  
  try {
    const response = await api.get('/rooms/teacher');
    const rooms = response.data.rooms;
    
    if (rooms.length === 0) {
      roomsList.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }
    
    // Take only first 3 rooms for dashboard
    const recentRooms = rooms.slice(0, 3);
    
    roomsList.innerHTML = recentRooms.map(room => renderRoomCard(room)).join('');
    
  } catch (error) {
    console.error('Failed to load rooms:', error);
    roomsList.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined empty-icon">error</span>
        <h3 class="empty-title">Failed to load rooms</h3>
        <p class="empty-description">Please try again later.</p>
        <button class="btn btn-primary" onclick="loadRooms()">Retry</button>
      </div>
    `;
  }
}

// ========================================
// Render Room Card
// ========================================

function renderRoomCard(room) {
  const isActive = room.status === 'active';
  const statusClass = isActive ? 'badge-success' : 'badge-neutral';
  const statusText = isActive ? 'Active' : 'Finished';
  
  // Determine icon based on room name
  let iconClass = 'default';
  let iconName = 'quiz';
  const roomNameLower = room.room_name.toLowerCase();
  
  if (roomNameLower.includes('physics') || roomNameLower.includes('science') || roomNameLower.includes('bio') || roomNameLower.includes('chem')) {
    iconClass = 'science';
    iconName = 'science';
  } else if (roomNameLower.includes('history') || roomNameLower.includes('war') || roomNameLower.includes('civil')) {
    iconClass = 'history';
    iconName = 'history_edu';
  } else if (roomNameLower.includes('math') || roomNameLower.includes('calculus') || roomNameLower.includes('algebra')) {
    iconClass = 'math';
    iconName = 'functions';
  }
  
  // Format date
  const date = room.start_time ? formatDate(room.start_time, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled';
  
  // Get participant count
  const participantCount = room.participant_count || 0;
  
  return `
    <a href="room-details.html?code=${room.room_code}" class="room-card ${!isActive ? 'finished' : ''}" role="listitem">
      <div class="room-header">
        <div class="room-info">
          <div class="room-icon ${iconClass}">
            <span class="material-symbols-outlined" aria-hidden="true">${iconName}</span>
          </div>
          <div class="room-details">
            <h3>${escapeHtml(room.room_name)}</h3>
            <p class="room-code">ID: #${room.room_code}</p>
          </div>
        </div>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="room-divider"></div>
      <div class="room-meta">
        <div class="room-meta-item">
          <span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>
          <span>${date}</span>
        </div>
        <div class="room-meta-item">
          <span class="material-symbols-outlined" aria-hidden="true">group</span>
          <span>${participantCount} Students</span>
        </div>
      </div>
    </a>
  `;
}
