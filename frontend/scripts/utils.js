/**
 * Assessment Platform - Utility Functions
 * HCI Principles:
 * - Error Prevention: Input validation, error handling
 * - Visibility of System Status: Toast notifications, loading states
 */

// API Base URL
const API_BASE_URL = "http://localhost:3000/api";

// ========================================
// API Client
// ========================================

/**
 * Make mock API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const fetchOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Required to send cookies (like session tokens) back and forth
    credentials: "omit", // Using omit for simpler testing with file:// protocol or simple setups, use "include" if using http-only cookies
  };

  // Add JWT token from localStorage if it exists
  const token = localStorage.getItem("token");
  if (token) {
    fetchOptions.headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, fetchOptions);

    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `HTTP error! status: ${response.status}`,
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    // Explicitly catch the "failed to fetch" scenario to explain it better
    if (
      error.name === "TypeError" &&
      error.message.toLowerCase().includes("fetch")
    ) {
      throw new Error(
        "Cannot connect to the backend server. Please ensure the backend server is running on localhost:3000.",
      );
    }
    throw error;
  }
}

// HTTP Methods
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),
  post: (endpoint, body) =>
    apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) =>
    apiRequest(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};

// ========================================
// Authentication
// ========================================

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

/**
 * Get current user
 * @returns {Object|null}
 */
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

/**
 * Set authentication data
 * @param {Object} data - Auth response data
 */
function setAuth(data) {
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
}

/**
 * Clear authentication data
 */
function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/**
 * Logout user
 */
async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearAuth();
    window.location.href = "login.html";
  }
}

// ========================================
// Toast Notifications
// ========================================

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = "info", duration = 3000) {
  // Create toast container if not exists
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("role", "alert");
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Icon based on type
  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };

  toast.innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">${icons[type]}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========================================
// Form Utilities
// ========================================

/**
 * Get form data as object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data
 */
function getFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
  const result = {
    valid: true,
    errors: [],
  };

  if (password.length < 8) {
    result.valid = false;
    result.errors.push("Password must be at least 8 characters");
  }

  if (!/[a-z]/.test(password)) {
    result.valid = false;
    result.errors.push("Password must contain a lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    result.valid = false;
    result.errors.push("Password must contain an uppercase letter");
  }

  if (!/\d/.test(password)) {
    result.valid = false;
    result.errors.push("Password must contain a number");
  }

  return result;
}

/**
 * Show form field error
 * @param {HTMLElement} field - Form field
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
  field.classList.add("form-input-error");

  // Remove existing error
  const existingError = field.parentElement.querySelector(".form-error");
  if (existingError) {
    existingError.remove();
  }

  // Add error message
  const error = document.createElement("span");
  error.className = "form-error";
  error.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">error</span>${escapeHtml(message)}`;
  field.parentElement.appendChild(error);

  // Announce to screen readers
  announceToScreenReader(message, "assertive");
}

/**
 * Clear form field error
 * @param {HTMLElement} field - Form field
 */
function clearFieldError(field) {
  field.classList.remove("form-input-error");
  const error = field.parentElement.querySelector(".form-error");
  if (error) {
    error.remove();
  }
}

// ========================================
// Accessibility Utilities
// ========================================

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Announcement priority (polite/assertive)
 */
function announceToScreenReader(message, priority = "polite") {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Trap focus within element (for modals)
 * @param {HTMLElement} element - Element to trap focus in
 */
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select',
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  element.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }

    if (e.key === "Escape") {
      const closeButton = element.querySelector("[data-close-modal]");
      if (closeButton) {
        closeButton.click();
      }
    }
  });
}

// ========================================
// Text-to-Speech
// ========================================

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 * @param {Object} options - Speech options
 */
function speak(text, options = {}) {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech not supported");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;

  if (options.lang) {
    utterance.lang = options.lang;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop speech
 */
function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
function formatDate(date, options = {}) {
  const d = new Date(date);
  const defaultOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return d.toLocaleDateString("en-US", { ...defaultOptions, ...options });
}

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Generate room code
 * @returns {string} Room code (XXXX-XX format)
 */
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 2; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
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

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ========================================
// Loading States
// ========================================

/**
 * Show loading state on button
 * @param {HTMLButtonElement} button - Button element
 * @param {string} originalText - Original button text
 */
function showButtonLoading(button, originalText) {
  button.disabled = true;
  button.dataset.originalText = originalText;
  button.classList.add("btn-loading");
  button.textContent = originalText;
}

/**
 * Hide loading state on button
 * @param {HTMLButtonElement} button - Button element
 */
function hideButtonLoading(button) {
  button.disabled = false;
  button.classList.remove("btn-loading");
  button.textContent = button.dataset.originalText || button.textContent;
}

// ========================================
// Export
// ========================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    api,
    isAuthenticated,
    getCurrentUser,
    setAuth,
    clearAuth,
    logout,
    showToast,
    getFormData,
    isValidEmail,
    validatePassword,
    showFieldError,
    clearFieldError,
    announceToScreenReader,
    trapFocus,
    speak,
    stopSpeech,
    escapeHtml,
    formatDate,
    formatDuration,
    generateRoomCode,
    debounce,
    throttle,
    showButtonLoading,
    hideButtonLoading,
  };
}
