/**
 * Create Room Page JavaScript
 * HCI Principles:
 * - Progressive Disclosure: Show fields only when needed
 * - Error Prevention: Validation before proceeding
 */

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Generate initial room code
  generateNewCode();
  
  // Set default times
  setDefaultTimes();
});

// ========================================
// Room Code Generation
// ========================================

function generateNewCode() {
  const code = generateRoomCode();
  document.getElementById('room-code').textContent = code;
  
  // Announce to screen readers
  announceToScreenReader(`New room code generated: ${code}`);
}

// ========================================
// Toggle Functions
// ========================================

function toggleMaxParticipants() {
  const toggle = document.getElementById('unlimited-toggle');
  const maxGroup = document.getElementById('max-participants-group');
  
  if (toggle.checked) {
    maxGroup.classList.add('hidden');
  } else {
    maxGroup.classList.remove('hidden');
    document.getElementById('max-participants').focus();
  }
}

function toggleAttendanceInfo() {
  const toggle = document.getElementById('attendance-toggle');
  const info = document.getElementById('attendance-info');
  
  if (toggle.checked) {
    info.classList.remove('hidden');
  } else {
    info.classList.add('hidden');
  }
}

// ========================================
// Set Default Times
// ========================================

function setDefaultTimes() {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const formatDateTime = (date) => {
    return date.toISOString().slice(0, 16);
  };
  
  document.getElementById('start-time').value = formatDateTime(now);
  document.getElementById('end-time').value = formatDateTime(twoHoursLater);
}

// ========================================
// Form Validation
// ========================================

function validateForm() {
  const roomName = document.getElementById('room-name').value.trim();
  const isUnlimited = document.getElementById('unlimited-toggle').checked;
  const maxParticipants = document.getElementById('max-participants').value;
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;
  
  const errors = [];
  
  if (!roomName) {
    errors.push('Room name is required');
    document.getElementById('room-name').classList.add('form-input-error');
  } else if (roomName.length < 3) {
    errors.push('Room name must be at least 3 characters');
    document.getElementById('room-name').classList.add('form-input-error');
  } else {
    document.getElementById('room-name').classList.remove('form-input-error');
  }
  
  if (!isUnlimited) {
    if (!maxParticipants) {
      errors.push('Max participants is required when not unlimited');
      document.getElementById('max-participants').classList.add('form-input-error');
    } else if (maxParticipants < 1 || maxParticipants > 1000) {
      errors.push('Max participants must be between 1 and 1000');
      document.getElementById('max-participants').classList.add('form-input-error');
    } else {
      document.getElementById('max-participants').classList.remove('form-input-error');
    }
  }
  
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      errors.push('End time must be after start time');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ========================================
// Handle Next Step
// ========================================

async function handleNextStep() {
  const validation = validateForm();
  
  if (!validation.valid) {
    showToast(validation.errors[0], 'error');
    return;
  }
  
  // Collect form data
  const formData = {
    roomName: document.getElementById('room-name').value.trim(),
    roomCode: document.getElementById('room-code').textContent,
    isUnlimited: document.getElementById('unlimited-toggle').checked,
    takeAttendance: document.getElementById('attendance-toggle').checked,
    startTime: document.getElementById('start-time').value || null,
    endTime: document.getElementById('end-time').value || null
  };
  
  if (!formData.isUnlimited) {
    formData.maxParticipants = parseInt(document.getElementById('max-participants').value);
  }
  
  // Store in sessionStorage for next step
  sessionStorage.setItem('createRoomData', JSON.stringify(formData));
  
  // Navigate to next step
  if (formData.takeAttendance) {
    window.location.href = 'form-builder.html';
  } else {
    window.location.href = 'add-questions.html';
  }
}
