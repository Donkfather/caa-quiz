// Frontend quiz logic for Tauri (mobile/desktop) using shared quiz core.
import {
  MODE_TEST_26,
  MODE_ALL,
  initQuestions,
  startSession,
  getCurrentQuestion,
  answerCurrent,
  goNext,
  getStats,
  getCurrentIndex,
  getTotalQuestions,
  getSerializableState,
  restoreFromState,
} from "./quiz-core.js";

import * as sessionStore from "./session-store.js";

const { invoke } = window.__TAURI__.core;

let answeredCurrent = false;
let currentSessionMeta = null;
let isStartingQuiz = false;

let screenStart;
let screenQuiz;
let screenResult;
let startBtn;
let nextBtn;
let restartBtn;
let questionTextEl;
let optionsContainerEl;
let progressTextEl;
let progressFillEl;
let resultEmojiEl;
let resultScoreEl;
let resultMessageEl;
let summaryCorrectEl;
let summaryWrongEl;
let summaryRemainingEl;
let modeInputs;
let sessionSectionEl;
let sessionListEl;
let homeBtn;
let saveExitBtn;
let modeOptionEls;

function showScreen(screenId) {
  const screens = [screenStart, screenQuiz, screenResult];
  screens.forEach((s) => s.classList.remove("active"));

  if (screenId === "start") {
    screenStart.classList.add("active");
  } else if (screenId === "quiz") {
    screenQuiz.classList.add("active");
  } else if (screenId === "result") {
    screenResult.classList.add("active");
  }
}

function getSelectedMode() {
  const checked =
    Array.from(modeInputs).find((input) => input.checked) || null;
  if (!checked) return MODE_TEST_26;
  return checked.value === MODE_ALL ? MODE_ALL : MODE_TEST_26;
}

function updateStats() {
  const { correct, wrong, remaining } = getStats();
  summaryCorrectEl.textContent = correct;
  summaryWrongEl.textContent = wrong;
  summaryRemainingEl.textContent = remaining;
}

function updateProgress() {
  const total = getTotalQuestions();
  if (!total) {
    progressTextEl.textContent = "";
    progressFillEl.style.width = "0%";
    return;
  }

  const questionNumber = getCurrentIndex() + 1;
  progressTextEl.textContent = `Întrebarea ${questionNumber}/${total}`;

  const percent = ((questionNumber - 1) / total) * 100;
  progressFillEl.style.width = `${percent}%`;
}

async function loadQuestionsFromTauri() {
  const questions = await invoke("get_questions");
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new Error("Nu s-au putut încărca întrebările din backend.");
  }
  return questions;
}

async function startQuiz() {
  if (isStartingQuiz) return;
  isStartingQuiz = true;
  answeredCurrent = false;
  nextBtn.disabled = true;

  try {
    const allQuestions = await loadQuestionsFromTauri();
    initQuestions(allQuestions);

    const mode = getSelectedMode();
    const firstQuestion = startSession(mode);

    if (!firstQuestion) {
      questionTextEl.textContent =
        "Nu s-au putut inițializa întrebările. Încearcă din nou.";
      return;
    }

    const nowIso = new Date().toISOString();
    const id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    currentSessionMeta = {
      id,
      mode,
      createdAt: nowIso,
    };

    saveCurrentSession("in_progress");
    refreshSessionList();

    showScreen("quiz");
    renderQuestion();
  } finally {
    isStartingQuiz = false;
  }
}

function renderQuestion() {
  answeredCurrent = false;
  nextBtn.disabled = true;

  const question = getCurrentQuestion();
  if (!question) {
    showResult();
    return;
  }

  updateStats();
  updateProgress();

  questionTextEl.textContent = question.question;
  optionsContainerEl.innerHTML = "";

  const labels = ["A", "B", "C", "D"];

  question.options.forEach((option, optionIndex) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";

    const labelSpan = document.createElement("span");
    labelSpan.className = "option-label";
    labelSpan.textContent = labels[optionIndex] || "?";

    const textSpan = document.createElement("span");
    textSpan.className = "option-text";
    textSpan.textContent = option;

    btn.appendChild(labelSpan);
    btn.appendChild(textSpan);

    btn.addEventListener("click", () => {
      if (!answeredCurrent) {
        handleSelectAnswer(optionIndex);
      }
    });

    optionsContainerEl.appendChild(btn);
  });
}

function handleSelectAnswer(selectedIndex) {
  answeredCurrent = true;

  const optionButtons = Array.from(
    optionsContainerEl.querySelectorAll(".option-btn")
  );
  optionButtons.forEach((btn) => btn.classList.add("disabled"));

  const { isCorrect, question, correctIndex } = answerCurrent(selectedIndex);

  optionButtons.forEach((btn, idx) => {
    if (idx === correctIndex) {
      btn.classList.add("correct");
    }
  });

  const selectedBtn = optionButtons[selectedIndex];
  if (isCorrect) {
    if (!selectedBtn.classList.contains("correct")) {
      selectedBtn.classList.add("correct");
    }
  } else {
    selectedBtn.classList.add("wrong");
  }

  updateStats();
  saveCurrentSession("in_progress");
  nextBtn.disabled = false;
}

function nextQuestion() {
  if (!answeredCurrent) return;

  const next = goNext();
  if (!next) {
    // umplem bara de progres la final
    progressFillEl.style.width = "100%";
    showResult();
    return;
  }

  renderQuestion();
}

function showResult() {
  const { correct, wrong, total } = getStats();
  const score = correct;
  const percent = total ? (score / total) * 100 : 0;

  let emoji = "❌";
  let message = "Nepromovat. Mai exersează și încearcă din nou.";

  if (percent >= 90) {
    emoji = "🏆";
    message = "Excelent! Ai promovat cu un scor foarte bun.";
  } else if (percent >= 70) {
    emoji = "✅";
    message = "Felicitări! Ai promovat.";
  } else if (percent >= 50) {
    emoji = "⚠️";
    message = "La limită. Ar fi bine să mai repeți materia.";
  }

  resultEmojiEl.textContent = emoji;
  resultScoreEl.textContent = `${score}/${total || 0}`;
  resultMessageEl.textContent = message;

  // sesiunea curentă nu mai este "în curs" - o ștergem din listă
  if (currentSessionMeta && currentSessionMeta.id) {
    sessionStore.deleteSession(currentSessionMeta.id);
    refreshSessionList();
    currentSessionMeta = null;
  }

  showScreen("result");
}

function saveCurrentSession(status = "in_progress") {
  if (!currentSessionMeta || !currentSessionMeta.id) return;

  const serial = getSerializableState();
  const stats = getStats();
  const nowIso = new Date().toISOString();

  const session = {
    id: currentSessionMeta.id,
    mode: currentSessionMeta.mode,
    createdAt: currentSessionMeta.createdAt,
    updatedAt: nowIso,
    status,
    correct: stats.correct,
    wrong: stats.wrong,
    total: stats.total,
    currentIndex:
      typeof serial.currentIndex === "number"
        ? serial.currentIndex
        : getCurrentIndex(),
    order: serial.order,
    answers: serial.answers,
  };

  sessionStore.saveSession(session);
}

async function continueSession(session) {
  try {
    const allQuestions = await loadQuestionsFromTauri();
    initQuestions(allQuestions);

    const ok = restoreFromState({
      mode: session.mode,
      order: session.order || [],
      currentIndex:
        typeof session.currentIndex === "number" ? session.currentIndex : 0,
      answers: session.answers || [],
    });

    if (!ok) {
      // sesiune coruptă, o ștergem
      sessionStore.deleteSession(session.id);
      refreshSessionList();
      return;
    }

    currentSessionMeta = {
      id: session.id,
      mode: session.mode,
      createdAt: session.createdAt || new Date().toISOString(),
    };

    showScreen("quiz");
    renderQuestion();
  } catch (err) {
    console.error("Eroare la continuarea sesiunii:", err);
  }
}

function refreshSessionList() {
  if (!sessionSectionEl || !sessionListEl) return;

  const sessions = sessionStore.loadSessions().filter(
    (s) => s && s.status !== "completed"
  );

  sessionListEl.innerHTML = "";

  if (!sessions.length) {
    sessionSectionEl.style.display = "none";
    return;
  }

  sessionSectionEl.style.display = "block";

  sessions.forEach((s) => {
    const item = document.createElement("div");
    item.className = "session-item";

    item.addEventListener("click", () => {
      continueSession(s);
    });

    const main = document.createElement("div");
    main.className = "session-main";

    const titleRow = document.createElement("div");
    titleRow.className = "session-title-row";

    const title = document.createElement("span");
    title.className = "session-title";
    title.textContent =
      s.mode === MODE_ALL ? "Toate întrebările" : "Test rapid (26 întrebări)";

    const status = document.createElement("span");
    status.className = "session-status";
    status.textContent = "În curs";

    titleRow.appendChild(title);
    titleRow.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "session-meta";

    const correct = Number(s.correct || 0);
    const wrong = Number(s.wrong || 0);
    const total = Number(s.total || 0);
    const remaining = Math.max(0, total - correct - wrong);

    const updated = s.updatedAt || s.createdAt;
    const updatedLabel = updated
      ? new Date(updated).toLocaleString("ro-RO", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    meta.textContent = `${correct} corecte · ${wrong} greșite · ${remaining} rămase${
      updatedLabel ? " · " + updatedLabel : ""
    }`;

    main.appendChild(titleRow);
    main.appendChild(meta);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "session-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "✕";
    deleteBtn.setAttribute("aria-label", "Șterge sesiunea");
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      sessionStore.deleteSession(s.id);
      refreshSessionList();
    });

    item.appendChild(main);
    item.appendChild(deleteBtn);
    sessionListEl.appendChild(item);
  });
}

function handleSaveAndGoHome() {
  saveCurrentSession("in_progress");
  refreshSessionList();
  showScreen("start");
}

function setupEventListeners() {
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      startQuiz().catch((err) => {
        console.error("Eroare la pornirea quizului:", err);
        questionTextEl.textContent =
          "A apărut o eroare la pornirea testului. Verifică consola.";
      });
    });
  }

  nextBtn.addEventListener("click", () => {
    nextQuestion();
  });

  restartBtn.addEventListener("click", () => {
    showScreen("start");
  });

  if (modeOptionEls && modeOptionEls.length) {
    modeOptionEls.forEach((opt) => {
      opt.addEventListener("click", () => {
        const input = opt.querySelector('input[type="radio"]');
        if (input) {
          input.checked = true;
        }
        startQuiz().catch((err) => {
          console.error("Eroare la pornirea quizului:", err);
        });
      });
    });
  }

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      handleSaveAndGoHome();
    });
  }

  if (saveExitBtn) {
    saveExitBtn.addEventListener("click", () => {
      handleSaveAndGoHome();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  screenStart = document.getElementById("screen-start");
  screenQuiz = document.getElementById("screen-quiz");
  screenResult = document.getElementById("screen-result");

  startBtn = document.getElementById("start-btn");
  nextBtn = document.getElementById("next-btn");
  restartBtn = document.getElementById("restart-btn");

  questionTextEl = document.getElementById("question-text");
  optionsContainerEl = document.getElementById("options-container");
  progressTextEl = document.getElementById("progress-text");
  progressFillEl = document.getElementById("progress-fill");

  resultEmojiEl = document.getElementById("result-emoji");
  resultScoreEl = document.getElementById("result-score");
  resultMessageEl = document.getElementById("result-message");

  summaryCorrectEl = document.getElementById("summary-correct");
  summaryWrongEl = document.getElementById("summary-wrong");
  summaryRemainingEl = document.getElementById("summary-remaining");
  modeInputs = document.querySelectorAll('input[name="quiz-mode"]');
  sessionSectionEl = document.getElementById("session-section");
  sessionListEl = document.getElementById("session-list");
  homeBtn = document.getElementById("home-btn");
  saveExitBtn = document.getElementById("save-exit-btn");
  modeOptionEls = document.querySelectorAll(".mode-option");

  showScreen("start");
  setupEventListeners();
  refreshSessionList();
});

