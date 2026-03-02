/**
 * Exam Page JavaScript
 * HCI Principles:
 * - Visibility of System Status: Timer, progress, auto-save
 * - Error Prevention: Auto-save, confirmation dialogs
 * - Forgiving UI: Can navigate between questions, flag for review
 */

// State
let examData = null;
let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let flaggedQuestions = new Set();
let submissionId = null;
let timerInterval = null;
let autoSaveInterval = null;
let endTime = null;

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Load exam data from sessionStorage
  const joinData = sessionStorage.getItem('joinRoomData');
  if (!joinData) {
    showToast('No exam data found', 'error');
    window.location.href = 'join-room.html';
    return;
  }
  
  examData = JSON.parse(joinData);
  
  // Load questions
  await loadQuestions();
  
  // Initialize submission
  await initializeSubmission();
  
  // Setup timer
  setupTimer();
  
  // Setup auto-save
  setupAutoSave();
  
  // Render first question
  renderQuestion();
  
  // Update progress
  updateProgress();
  
  // Setup keyboard navigation
  setupKeyboardNavigation();
});

// ========================================
// Load Questions
// ========================================

async function loadQuestions() {
  try {
    const response = await api.get(`/rooms/${examData.roomCode}/exam`);
    questions = response.data.questions;
    
    // Render question dots
    renderQuestionDots();
  } catch (error) {
    showToast('Failed to load questions', 'error');
    console.error(error);
  }
}

// ========================================
// Initialize Submission
// ========================================

async function initializeSubmission() {
  try {
    // Check for existing submission
    const savedSubmission = sessionStorage.getItem('examSubmissionId');
    if (savedSubmission) {
      submissionId = savedSubmission;
      
      // Load saved answers
      const autoSaveResponse = await api.get(`/rooms/${examData.roomCode}/auto-save/${submissionId}`);
      answers = autoSaveResponse.data.answers || {};
    } else {
      // Create new submission
      const response = await api.post(`/rooms/${examData.roomCode}/register`, {
        registrationData: {}
      });
      submissionId = response.data.submissionId;
      sessionStorage.setItem('examSubmissionId', submissionId);
    }
  } catch (error) {
    console.error('Failed to initialize submission:', error);
  }
}

// ========================================
// Timer
// ========================================

function setupTimer() {
  if (!examData.endTime) {
    document.querySelector('.timer-row').style.display = 'none';
    return;
  }
  
  endTime = new Date(examData.endTime);
  
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const now = new Date();
  const remaining = endTime - now;
  
  if (remaining <= 0) {
    clearInterval(timerInterval);
    autoSubmit();
    return;
  }
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
  
  // Add warning class when less than 5 minutes
  if (remaining < 5 * 60 * 1000) {
    document.querySelectorAll('.timer-unit').forEach(el => el.classList.add('warning'));
  }
}

// ========================================
// Auto-save
// ========================================

function setupAutoSave() {
  autoSaveInterval = setInterval(autoSave, 30000); // Auto-save every 30 seconds
}

async function autoSave() {
  if (!submissionId) return;
  
  try {
    await api.post(`/rooms/${examData.roomCode}/auto-save`, {
      submissionId,
      answers
    });
    
    // Show auto-save indicator
    const autoSaveText = document.getElementById('auto-save-text');
    autoSaveText.textContent = 'Auto-saved';
    setTimeout(() => {
      autoSaveText.textContent = 'Auto-saved';
    }, 2000);
    
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}

// ========================================
// Render Question
// ========================================

function renderQuestion() {
  const question = questions[currentQuestionIndex];
  const card = document.getElementById('question-card');
  
  // Update counter
  document.getElementById('question-counter').textContent = 
    `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  
  // Update flag button
  const flagBtn = document.getElementById('flag-btn');
  flagBtn.classList.toggle('active', flaggedQuestions.has(question.id));
  
  // Build question HTML
  let html = '';
  
  // Question image (if any)
  if (question.mediaUrl) {
    html += `
      <div class="question-image" style="background-image: url('${question.mediaUrl}')">
        <div class="question-image-overlay"></div>
        <div class="question-image-content">
          <span class="question-category">${escapeHtml(question.category || 'Question')}</span>
          <h2 class="question-text">${escapeHtml(question.questionText)}</h2>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="question-content">
        <p class="question-text-plain">${escapeHtml(question.questionText)}</p>
    `;
  }
  
  // Options based on question type
  if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
    html += '<div class="options-list">';
    question.options.forEach((option, index) => {
      const isSelected = answers[question.id] === index;
      html += `
        <label class="option-label ${isSelected ? 'selected' : ''}">
          <input 
            type="radio" 
            name="question_${question.id}" 
            value="${index}"
            class="option-input"
            ${isSelected ? 'checked' : ''}
            onchange="selectAnswer(${question.id}, ${index})"
          >
          <span class="option-text">${escapeHtml(option)}</span>
          <span class="material-symbols-outlined option-check" aria-hidden="true">check_circle</span>
        </label>
      `;
    });
    html += '</div>';
  } else if (question.questionType === 'short_answer' || question.questionType === 'essay') {
    html += `
      <textarea 
        class="text-answer" 
        placeholder="Type your answer here..."
        onchange="selectAnswer(${question.id}, this.value)"
      >${escapeHtml(answers[question.id] || '')}</textarea>
    `;
  }
  
  if (!question.mediaUrl) {
    html += '</div>';
  }
  
  card.innerHTML = html;
  
  // Update navigation buttons
  document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;
  document.getElementById('next-btn').innerHTML = 
    currentQuestionIndex === questions.length - 1 
      ? 'Submit <span class="material-symbols-outlined" aria-hidden="true">check</span>'
      : 'Next <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
  
  // Update dots
  updateQuestionDots();
}

// ========================================
// Answer Selection
// ========================================

function selectAnswer(questionId, answer) {
  answers[questionId] = answer;
  updateQuestionDots();
  updateProgress();
  
  // Debounced auto-save
  debounce(autoSave, 1000)();
}

// ========================================
// Navigation
// ========================================

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    confirmSubmit();
  }
}

function goToQuestion(index) {
  currentQuestionIndex = index;
  renderQuestion();
}

// ========================================
// Flag for Review
// ========================================

function toggleFlag() {
  const question = questions[currentQuestionIndex];
  
  if (flaggedQuestions.has(question.id)) {
    flaggedQuestions.delete(question.id);
  } else {
    flaggedQuestions.add(question.id);
  }
  
  document.getElementById('flag-btn').classList.toggle('active');
  updateQuestionDots();
}

// ========================================
// Question Dots
// ========================================

function renderQuestionDots() {
  const dotsContainer = document.getElementById('question-dots');
  
  dotsContainer.innerHTML = questions.map((q, index) => `
    <button 
      type="button"
      class="question-dot ${index === 0 ? 'current' : ''}"
      data-index="${index}"
      onclick="goToQuestion(${index})"
      aria-label="Go to question ${index + 1}"
    ></button>
  `).join('');
}

function updateQuestionDots() {
  const dots = document.querySelectorAll('.question-dot');
  
  dots.forEach((dot, index) => {
    const question = questions[index];
    dot.className = 'question-dot';
    
    if (index === currentQuestionIndex) {
      dot.classList.add('current');
    } else if (answers[question.id] !== undefined) {
      dot.classList.add('answered');
    }
    
    if (flaggedQuestions.has(question.id)) {
      dot.classList.add('flagged');
    }
  });
}

// ========================================
// Progress
// ========================================

function updateProgress() {
  const answered = Object.keys(answers).length;
  const progress = (answered / questions.length) * 100;
  
  document.getElementById('progress-fill').style.width = `${progress}%`;
}

// ========================================
// Submit
// ========================================

function confirmSubmit() {
  const answered = Object.keys(answers).length;
  const total = questions.length;
  
  document.getElementById('submit-message').textContent = 
    `You have answered ${answered} of ${total} questions. Are you sure you want to submit?`;
  
  document.getElementById('submit-modal').classList.remove('hidden');
}

function closeSubmitModal() {
  document.getElementById('submit-modal').classList.add('hidden');
}

async function submitExam() {
  closeSubmitModal();
  
  try {
    const response = await api.post(`/rooms/${examData.roomCode}/submit`, {
      submissionId,
      answers
    });
    
    // Clear session data
    sessionStorage.removeItem('joinRoomData');
    sessionStorage.removeItem('examSubmissionId');
    
    showToast('Exam submitted successfully!', 'success');
    
    // Redirect to results
    setTimeout(() => {
      window.location.href = `results.html?code=${examData.roomCode}&submission=${submissionId}`;
    }, 1000);
    
  } catch (error) {
    showToast(error.message || 'Failed to submit exam', 'error');
  }
}

async function autoSubmit() {
  showToast('Time is up! Submitting your exam...', 'warning');
  await submitExam();
}

// ========================================
// Exit
// ========================================

function confirmExit() {
  document.getElementById('exit-modal').classList.remove('hidden');
}

function closeExitModal() {
  document.getElementById('exit-modal').classList.add('hidden');
}

async function exitExam() {
  await autoSave();
  closeExitModal();
  
  sessionStorage.removeItem('joinRoomData');
  sessionStorage.removeItem('examSubmissionId');
  
  window.location.href = 'join-room.html';
}

// ========================================
// Keyboard Navigation
// ========================================

function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Number keys to jump to questions
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < questions.length) {
        goToQuestion(index);
      }
    }
  });
}

// ========================================
// Cleanup
// ========================================

window.addEventListener('beforeunload', () => {
  if (timerInterval) clearInterval(timerInterval);
  if (autoSaveInterval) clearInterval(autoSaveInterval);
});
