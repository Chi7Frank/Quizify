/**
 * Add Questions Page JavaScript
 * Handles question creation, management, and persistence
 */

let questions = [];
let currentRoom = null;

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // Load room data from session storage
  const roomData = sessionStorage.getItem("createRoomData");
  if (!roomData) {
    showToast("No room data found. Please start from room creation.", "error");
    setTimeout(() => (window.location.href = "create-room.html"), 1500);
    return;
  }

  currentRoom = JSON.parse(roomData);
  document.querySelector(".page-title").textContent =
    `Add Questions: ${currentRoom.roomName}`;
  updateQuestionCount();

  // Initial question
  addBlankQuestion();

  // Event Listeners
  document.querySelector(".btn-fab").addEventListener("click", (e) => {
    e.preventDefault();
    addBlankQuestion();
  });

  // Save All button (Add to bottom bar if not exists)
  addSaveButton();
});

function addSaveButton() {
  const bottomNav = document.querySelector(".bottom-nav-items");
  if (bottomNav) {
    // Find existing Library item and change it to "Save & Finish"
    const libraryItem = document.querySelector(
      'a[href="add-questions.html"].bottom-nav-item',
    );
    if (libraryItem) {
      libraryItem.innerHTML = `<span class="material-symbols-outlined">save</span><span>Finish</span>`;
      libraryItem.href = "#";
      libraryItem.addEventListener("click", (e) => {
        e.preventDefault();
        saveAllAndFinish();
      });
    }
  }
}

function updateQuestionCount() {
  const count = document.querySelectorAll(".question-card").length;
  document.querySelector(".question-count").textContent =
    `${count} question${count !== 1 ? "s" : ""} added`;
}

function addBlankQuestion() {
  const container = document.getElementById("main-content");
  const qIndex = document.querySelectorAll(".question-card").length + 1;

  const qCard = document.createElement("div");
  qCard.className = "question-card";
  qCard.innerHTML = `
      <div class="question-header">
        <span class="question-number">Question ${qIndex}</span>
        <div class="question-actions">
          <button type="button" class="btn btn-ghost btn-icon delete-q" aria-label="Delete">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Question Text</label>
        <textarea class="form-input q-text" rows="3" placeholder="Enter your question here..."></textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">Points</label>
        <div style="display: flex; align-items: center; gap: var(--space-sm);">
          <input type="number" class="form-input q-points" value="1" style="width: 80px;">
          <span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">pts</span>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Options (Mark correct answer on the left)</label>
        <div class="options-list">
          ${[0, 1, 2, 3]
            .map(
              (i) => `
            <label class="option-row">
              <input type="radio" name="correct-${qIndex}" ${i === 0 ? "checked" : ""} class="q-correct" value="${i}">
              <div class="option-input-wrapper">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                <input type="text" class="option-input q-option" placeholder="Option ${String.fromCharCode(65 + i)}">
              </div>
            </label>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

  container.appendChild(qCard);

  // Scroll to bottom
  qCard.scrollIntoView({ behavior: "smooth" });

  // Add delete listener
  qCard.querySelector(".delete-q").addEventListener("click", () => {
    if (document.querySelectorAll(".question-card").length > 1) {
      qCard.remove();
      renumberQuestions();
      updateQuestionCount();
    } else {
      showToast("You must have at least one question.", "warning");
    }
  });

  updateQuestionCount();
}

function renumberQuestions() {
  document.querySelectorAll(".question-card").forEach((card, index) => {
    const qIndex = index + 1;
    card.querySelector(".question-number").textContent = `Question ${qIndex}`;
    card.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.name = `correct-${qIndex}`;
    });
  });
}

async function saveAllAndFinish() {
  const qCards = document.querySelectorAll(".question-card");
  const questionsToSave = [];
  let isValid = true;

  if (qCards.length === 0) {
    showToast("Please add at least one question.", "error");
    return;
  }

  qCards.forEach((card, index) => {
    const text = card.querySelector(".q-text").value.trim();
    const points = parseInt(card.querySelector(".q-points").value) || 1;
    const optionInputs = card.querySelectorAll(".q-option");
    const correctRadio = card.querySelector('input[type="radio"]:checked');
    const correctIndex = correctRadio ? parseInt(correctRadio.value) : 0;

    const options = Array.from(optionInputs)
      .map((input) => input.value.trim())
      .filter((val) => val !== "");

    if (!text) {
      isValid = false;
      card.querySelector(".q-text").classList.add("form-input-error");
    } else {
      card.querySelector(".q-text").classList.remove("form-input-error");
    }

    if (options.length < 2) {
      isValid = false;
      showToast(`Question ${index + 1} needs at least 2 options`, "error");
    }

    questionsToSave.push({
      questionType: "multiple_choice",
      questionText: text,
      points: points,
      options: options, // apiRequest will stringify this
      correctAnswer: { text: options[correctIndex], index: correctIndex },
      orderIndex: index + 1,
    });
  });

  if (!isValid) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  try {
    const saveBtn = document.querySelector(".bottom-nav-item.active");
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = `<span>Saving...</span>`;

    // 1. Create Room first (as Draft)
    const roomResponse = await api.post("/rooms", {
      roomName: currentRoom.roomName,
      maxParticipants: currentRoom.isUnlimited
        ? null
        : parseInt(currentRoom.maxParticipants) || null,
      isUnlimited: currentRoom.isUnlimited ? 1 : 0,
      startTime: currentRoom.startTime || null,
      endTime: currentRoom.endTime || null,
      instructions: "Please answer all questions carefully.",
      registrationFields: sessionStorage.getItem("customFields")
        ? JSON.parse(sessionStorage.getItem("customFields"))
        : [{ label: "Full Name", type: "text", required: true }],
    });

    const roomCode = roomResponse.data.room.room_code;
    const actualRoomId = roomResponse.data.room.id;

    // 2. Add all questions
    for (const q of questionsToSave) {
      await api.post(`/rooms/${roomCode}/questions`, {
        ...q,
        roomId: actualRoomId,
      });
    }

    // 3. Set room to Active
    await api.put(`/rooms/${roomCode}`, { status: "active" });

    showToast("Assessment created and published!", "success");

    // Cleanup
    sessionStorage.removeItem("createRoomData");
    sessionStorage.removeItem("customFields");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  } catch (error) {
    console.error("Save error:", error);
    showToast(error.message || "Failed to save assessment.", "error");
    const saveBtn = document.querySelector(".bottom-nav-item.active");
    if (saveBtn)
      saveBtn.innerHTML = `<span class="material-symbols-outlined">save</span><span>Finish</span>`;
  }
}
