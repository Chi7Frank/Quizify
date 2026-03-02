/**
 * Join Room Page JavaScript
 * HCI Principles:
 * - Recognition over Recall: Show recent rooms
 * - Error Prevention: Input formatting and validation
 */

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Setup code input formatting
  setupCodeInput();
  
  // Load recent rooms if logged in
  if (isAuthenticated()) {
    loadRecentRooms();
  }
});

// ========================================
// Code Input Formatting
// ========================================

function setupCodeInput() {
  const input = document.getElementById('room-code');
  
  input.addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add hyphen after 4 characters
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4, 6);
    }
    
    e.target.value = value;
  });
  
  input.addEventListener('keydown', (e) => {
    // Allow backspace to work naturally
    if (e.key === 'Backspace') {
      const value = e.target.value;
      if (value.endsWith('-')) {
        e.target.value = value.slice(0, -1);
        e.preventDefault();
      }
    }
  });
}

// ========================================
// Form Submission
// ========================================

document.getElementById('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const codeInput = document.getElementById('room-code');
  const roomCode = codeInput.value.trim();
  
  // Validate
  if (!roomCode || roomCode.length < 7) {
    codeInput.classList.add('form-input-error');
    showToast('Please enter a valid room code', 'error');
    return;
  }
  
  codeInput.classList.remove('form-input-error');
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  showButtonLoading(submitBtn, originalText);
  
  try {
    const response = await api.post('/rooms/join', { roomCode });
    const room = response.data.room;
    
    // Store room info for registration/exam
    sessionStorage.setItem('joinRoomData', JSON.stringify(room));
    
    showToast('Room found!', 'success');
    
    // Redirect based on room configuration
    setTimeout(() => {
      if (room.registrationFields && room.registrationFields.length > 0) {
        window.location.href = 'register-exam.html';
      } else {
        window.location.href = 'exam.html';
      }
    }, 500);
    
  } catch (error) {
    showToast(error.message || 'Failed to join room', 'error');
    codeInput.classList.add('form-input-error');
    hideButtonLoading(submitBtn);
  }
});

// ========================================
// Load Recent Rooms
// ========================================

async function loadRecentRooms() {
  const recentSection = document.getElementById('recent-section');
  const recentList = document.getElementById('recent-list');
  
  // For now, this is a placeholder - in a real app, you'd store recent rooms
  // in localStorage or fetch from the server
  const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
  
  if (recentRooms.length === 0) {
    return;
  }
  
  recentSection.classList.remove('hidden');
  
  recentList.innerHTML = recentRooms.map(room => `
    <a href="#" class="recent-item" onclick="joinRecentRoom('${room.code}'); return false;">
      <div class="recent-icon">
        <span class="material-symbols-outlined">quiz</span>
      </div>
      <div class="recent-info">
        <p class="recent-name">${escapeHtml(room.name)}</p>
        <p class="recent-code">#${room.code}</p>
      </div>
      <span class="material-symbols-outlined recent-arrow">chevron_right</span>
    </a>
  `).join('');
}

// ========================================
// Join Recent Room
// ========================================

async function joinRecentRoom(roomCode) {
  const input = document.getElementById('room-code');
  input.value = roomCode;
  
  // Trigger form submission
  document.getElementById('join-form').dispatchEvent(new Event('submit'));
}
