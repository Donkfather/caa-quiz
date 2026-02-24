use rand::{seq::SliceRandom, thread_rng};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Question {
    pub id: u32,
    pub question: String,
    pub options: Vec<String>,
    pub correct: usize,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QuizSession {
    pub questions: Vec<Question>,
    pub total: usize,
}

pub fn load_questions() -> Vec<Question> {
    // Questions are embedded into the binary at compile time.
    // The path is relative to this file: src-tauri/src/quiz.rs -> quiz-app/questions.json
    let data = include_str!("../../questions.json");
    serde_json::from_str(data).expect("Nu s-a putut parsa questions.json")
}

pub fn create_session(all: &[Question]) -> QuizSession {
    let mut questions: Vec<Question> = all.to_vec();
    let mut rng = thread_rng();
    questions.shuffle(&mut rng);

    let total = questions.len().min(26);
    questions.truncate(total);

    QuizSession { questions, total }
}

