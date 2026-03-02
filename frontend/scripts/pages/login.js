/**
 * Login Page JavaScript
 * HCI Principles:
 * - Error Prevention: Client-side validation
 * - Clear Feedback: Toast notifications
 * - Accessibility: ARIA attributes, keyboard navigation
 */

// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginSwitch = document.getElementById('login-switch');
const signupSwitch = document.getElementById('signup-switch');

// ========================================
// Tab Switching
// ========================================

/**
 * Switch between login and signup tabs
 * @param {string} tab - Tab to switch to ('login' or 'signup')
 */
function switchTab(tab) {
  const isLogin = tab === 'login';
  
  // Update tab states
  loginTab.classList.toggle('active', isLogin);
  loginTab.setAttribute('aria-selected', isLogin);
  
  signupTab.classList.toggle('active', !isLogin);
  signupTab.setAttribute('aria-selected', !isLogin);
  
  // Show/hide forms
  loginForm.classList.toggle('active', isLogin);
  loginForm.hidden = !isLogin;
  
  signupForm.classList.toggle('active', !isLogin);
  signupForm.hidden = isLogin;
  
  // Show/hide switch prompts
  loginSwitch.classList.toggle('hidden', !isLogin);
  signupSwitch.classList.toggle('hidden', isLogin);
  
  // Focus first input of active form
  const activeForm = isLogin ? loginForm : signupForm;
  const firstInput = activeForm.querySelector('input');
  if (firstInput) {
    firstInput.focus();
  }
  
  // Announce to screen readers
  announceToScreenReader(`Switched to ${isLogin ? 'login' : 'sign up'} form`);
}

// Tab click handlers
loginTab.addEventListener('click', () => switchTab('login'));
signupTab.addEventListener('click', () => switchTab('signup'));

// ========================================
// Password Toggle
// ========================================

/**
 * Toggle password visibility
 * @param {string} inputId - Password input ID
 * @param {HTMLElement} button - Toggle button
 */
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector('.material-symbols-outlined');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = 'visibility_off';
    button.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    icon.textContent = 'visibility';
    button.setAttribute('aria-label', 'Show password');
  }
}

// ========================================
// Form Validation
// ========================================

/**
 * Validate login form
 * @param {FormData} formData - Form data
 * @returns {Object} Validation result
 */
function validateLoginForm(formData) {
  const errors = {};
  
  const email = formData.get('email');
  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  const password = formData.get('password');
  if (!password) {
    errors.password = 'Password is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate signup form
 * @param {FormData} formData - Form data
 * @returns {Object} Validation result
 */
function validateSignupForm(formData) {
  const errors = {};
  
  const fullName = formData.get('fullName');
  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }
  
  const email = formData.get('email');
  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  const password = formData.get('password');
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      errors.password = passwordCheck.errors[0];
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// ========================================
// Form Submission
// ========================================

/**
 * Handle login form submission
 */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(loginForm);
  const validation = validateLoginForm(formData);
  
  // Clear previous errors
  loginForm.querySelectorAll('.form-input-error').forEach(el => {
    el.classList.remove('form-input-error');
  });
  loginForm.querySelectorAll('.form-error').forEach(el => el.remove());
  
  // Show validation errors
  if (!validation.valid) {
    Object.entries(validation.errors).forEach(([field, message]) => {
      const input = loginForm.querySelector(`[name="${field}"]`);
      if (input) {
        showFieldError(input, message);
      }
    });
    return;
  }
  
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  showButtonLoading(submitBtn, originalText);
  
  try {
    const response = await api.post('/auth/login', {
      email: formData.get('email'),
      password: formData.get('password'),
      rememberMe: formData.get('rememberMe') === 'on'
    });
    
    // Store auth data
    setAuth(response.data);
    
    showToast('Login successful!', 'success');
    
    // Redirect based on role
    const user = response.data.user;
    setTimeout(() => {
      window.location.href = user.role === 'teacher' ? 'dashboard.html' : 'join-room.html';
    }, 500);
    
  } catch (error) {
    showToast(error.message || 'Login failed. Please try again.', 'error');
    hideButtonLoading(submitBtn);
  }
});

/**
 * Handle signup form submission
 */
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(signupForm);
  const validation = validateSignupForm(formData);
  
  // Clear previous errors
  signupForm.querySelectorAll('.form-input-error').forEach(el => {
    el.classList.remove('form-input-error');
  });
  signupForm.querySelectorAll('.form-error').forEach(el => el.remove());
  
  // Show validation errors
  if (!validation.valid) {
    Object.entries(validation.errors).forEach(([field, message]) => {
      const input = signupForm.querySelector(`[name="${field}"]`);
      if (input) {
        showFieldError(input, message);
      }
    });
    return;
  }
  
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  showButtonLoading(submitBtn, originalText);
  
  try {
    const response = await api.post('/auth/register', {
      email: formData.get('email'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      role: formData.get('role')
    });
    
    // Store auth data
    setAuth(response.data);
    
    showToast('Account created successfully!', 'success');
    
    // Redirect based on role
    const user = response.data.user;
    setTimeout(() => {
      window.location.href = user.role === 'teacher' ? 'dashboard.html' : 'join-room.html';
    }, 500);
    
  } catch (error) {
    showToast(error.message || 'Registration failed. Please try again.', 'error');
    hideButtonLoading(submitBtn);
  }
});

// ========================================
// Initialize
// ========================================

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    const user = getCurrentUser();
    if (user) {
      window.location.href = user.role === 'teacher' ? 'dashboard.html' : 'join-room.html';
    }
  }
});
