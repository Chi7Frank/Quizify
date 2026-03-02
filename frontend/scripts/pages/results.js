/**
 * Results Page JavaScript
 * HCI Principles:
 * - Visibility of System Status: Clear score display
 * - Recognition over Recall: Show question review
 */

// State
let resultsData = null;

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('code');
  const submissionId = urlParams.get('submission');
  
  if (!roomCode || !submissionId) {
    showToast('Missing required parameters', 'error');
    window.location.href = 'join-room.html';
    return;
  }
  
  // Load results
  await loadResults(roomCode, submissionId);
});

// ========================================
// Load Results
// ========================================

async function loadResults(roomCode, submissionId) {
  try {
    const response = await api.get(`/rooms/${roomCode}/results/${submissionId}`);
    resultsData = response.data;
    
    // Hide loading, show content
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('results-content').classList.remove('hidden');
    
    // Render results
    renderResults();
    
  } catch (error) {
    showToast(error.message || 'Failed to load results', 'error');
    console.error(error);
  }
}

// ========================================
// Render Results
// ========================================

function renderResults() {
  const { submission, questions, showScores, showAnswers } = resultsData;
  
  // Update title
  document.getElementById('exam-title').textContent = 'Exam Results';
  
  // Render score
  if (showScores) {
    const percentage = Math.round(submission.percentage);
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    
    // Set circle progress
    const degrees = (percentage / 100) * 360;
    document.getElementById('score-circle').style.setProperty('--score-deg', `${degrees}deg`);
    
    // Score text
    const correct = calculateCorrectAnswers(questions, submission.answers);
    document.getElementById('score-text').textContent = 
      `You answered ${correct} out of ${questions.length} questions correctly`;
    
    // Pass/Fail badge
    const passBadge = document.getElementById('pass-badge');
    if (percentage >= 60) {
      passBadge.textContent = 'Passed';
      passBadge.className = 'badge badge-success';
    } else {
      passBadge.textContent = 'Failed';
      passBadge.className = 'badge badge-error';
    }
    
    // Stats
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('incorrect-count').textContent = questions.length - correct;
    document.getElementById('time-taken').textContent = formatDuration(submission.timeTaken);
  } else {
    // Hide score if not allowed
    document.querySelector('.score-card').innerHTML = `
      <p class="score-text">Your results will be available soon.</p>
    `;
    document.querySelector('.stats-grid').classList.add('hidden');
  }
  
  // Render question review
  renderQuestionReview(questions, submission.answers, showAnswers);
}

// ========================================
// Calculate Correct Answers
// ========================================

function calculateCorrectAnswers(questions, answers) {
  let correct = 0;
  
  questions.forEach(question => {
    if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer?.index;
      
      if (userAnswer === correctAnswer) {
        correct++;
      }
    }
  });
  
  return correct;
}

// ========================================
// Render Question Review
// ========================================

function renderQuestionReview(questions, answers, showAnswers) {
  const reviewList = document.getElementById('review-list');
  
  reviewList.innerHTML = questions.map((question, index) => {
    const userAnswer = answers[question.id];
    let isCorrect = false;
    let statusBadge = '';
    let answerText = '';
    
    if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
      const correctAnswer = question.correctAnswer?.index;
      isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) {
        statusBadge = '<span class="badge badge-success">Correct</span>';
      } else {
        statusBadge = '<span class="badge badge-error">Incorrect</span>';
      }
      
      if (showAnswers) {
        const userOption = question.options[userAnswer];
        const correctOption = question.options[correctAnswer];
        answerText = `
          <p class="review-answer">Your answer: <strong>${userOption ? escapeHtml(userOption) : 'Not answered'}</strong></p>
          ${!isCorrect ? `<p class="review-answer">Correct answer: <strong>${escapeHtml(correctOption)}</strong></p>` : ''}
        `;
      }
    } else {
      // Short answer/essay
      statusBadge = '<span class="badge badge-info">Pending Review</span>';
      if (userAnswer) {
        answerText = `<p class="review-answer">Your answer: <strong>${escapeHtml(String(userAnswer).substring(0, 100))}${String(userAnswer).length > 100 ? '...' : ''}</strong></p>`;
      }
    }
    
    return `
      <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
        <div class="review-header">
          <p class="review-question">${index + 1}. ${escapeHtml(question.questionText.substring(0, 80))}${question.questionText.length > 80 ? '...' : ''}</p>
          <div class="review-status">${statusBadge}</div>
        </div>
        ${answerText}
      </div>
    `;
  }).join('');
}

// ========================================
// Share Results
// ========================================

function shareResults() {
  if (!resultsData) return;
  
  const { submission } = resultsData;
  const text = `I scored ${Math.round(submission.percentage)}% on my exam!`;
  
  if (navigator.share) {
    navigator.share({
      title: 'My Exam Results',
      text: text
    });
  } else {
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      showToast('Results copied to clipboard!', 'success');
    });
  }
}
