// Web-only quiz interface that citește întrebările din questions.json
// și folosește aceeași logică de bază ca aplicația Tauri.

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
} from "../src/quiz-core.js";

let answeredCurrent = false;

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

async function loadQuestions() {
  const res = await fetch("../questions.json");
  if (!res.ok) {
    throw new Error("Nu s-a putut încărca questions.json");
  }
  return res.json();
}

async function startQuiz() {
  answeredCurrent = false;
  nextBtn.disabled = true;

  const allQuestions = await loadQuestions();
  initQuestions(allQuestions);

  const mode = getSelectedMode();
  const firstQuestion = startSession(mode);

  if (!firstQuestion) {
    questionTextEl.textContent =
      "Nu s-au putut inițializa întrebările. Încearcă din nou.";
    return;
  }

  showScreen("quiz");
  renderQuestion();
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
  nextBtn.disabled = false;
}

function nextQuestion() {
  if (!answeredCurrent) return;

  const next = goNext();
  if (!next) {
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

  showScreen("result");
}

function setupEventListeners() {
  startBtn.addEventListener("click", () => {
    startQuiz().catch((err) => {
      console.error("Eroare la pornirea quizului web:", err);
      alert("Nu s-au putut încărca întrebările. Verifică consola.");
    });
  });

  nextBtn.addEventListener("click", () => {
    nextQuestion();
  });

  restartBtn.addEventListener("click", () => {
    showScreen("start");
  });
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

  showScreen("start");
  setupEventListeners();
});

