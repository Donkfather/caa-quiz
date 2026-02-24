// Core quiz logic shared between Tauri (mobile/desktop) and Web.
// This module is completely platform-agnostic: it nu folosește Tauri sau DOM.

export const MODE_TEST_26 = "test_26";
export const MODE_ALL = "all";

let questions = [];
let order = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let hasAnsweredCurrent = false;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function initQuestions(all) {
  questions = Array.isArray(all) ? all.slice() : [];
}

export function startSession(mode = MODE_TEST_26) {
  if (!Array.isArray(questions) || questions.length === 0) {
    order = [];
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    hasAnsweredCurrent = false;
    return null;
  }

  order = questions.map((_, idx) => idx);
  shuffle(order);

  const limit =
    mode === MODE_ALL ? order.length : Math.min(26, Math.max(0, order.length));

  order = order.slice(0, limit);
  currentIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  hasAnsweredCurrent = false;

  return getCurrentQuestion();
}

export function getCurrentQuestion() {
  if (!order.length || currentIndex < 0 || currentIndex >= order.length) {
    return null;
  }
  const qIndex = order[currentIndex];
  return questions[qIndex] || null;
}

export function answerCurrent(selectedIndex) {
  const question = getCurrentQuestion();
  if (!question || typeof selectedIndex !== "number") {
    return { isCorrect: false, question: null, correctIndex: null };
  }

  if (hasAnsweredCurrent) {
    // Nu modificăm scorul dacă deja s-a răspuns.
    return {
      isCorrect: question.correct === selectedIndex,
      question,
      correctIndex: question.correct,
    };
  }

  const isCorrect = question.correct === selectedIndex;
  if (isCorrect) {
    correctCount += 1;
  } else {
    wrongCount += 1;
  }

  hasAnsweredCurrent = true;

  return { isCorrect, question, correctIndex: question.correct };
}

export function goNext() {
  if (currentIndex + 1 >= order.length) {
    return null;
  }
  currentIndex += 1;
  hasAnsweredCurrent = false;
  return getCurrentQuestion();
}

export function getStats() {
  const total = order.length;
  const answered = correctCount + wrongCount;
  const remaining = Math.max(0, total - answered);

  return {
    correct: correctCount,
    wrong: wrongCount,
    remaining,
    total,
  };
}

export function getCurrentIndex() {
  return currentIndex;
}

export function getTotalQuestions() {
  return order.length;
}

