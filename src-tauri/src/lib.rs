use std::sync::Mutex;

use tauri::{self, State};

mod quiz;

use quiz::{create_session, load_questions, Question, QuizSession};

pub struct AppState {
    pub questions: Mutex<Vec<Question>>,
}

#[tauri::command]
fn new_quiz(state: State<AppState>) -> QuizSession {
    let questions = state
        .questions
        .lock()
        .expect("lock pentru questions a eșuat");
    create_session(&questions)
}

#[tauri::command]
fn check_answer(state: State<AppState>, question_id: u32, answer: usize) -> bool {
    let questions = state
        .questions
        .lock()
        .expect("lock pentru questions a eșuat");

    if let Some(q) = questions.iter().find(|q| q.id == question_id) {
        q.correct == answer
    } else {
        false
    }
}

#[tauri::command]
fn get_questions(state: State<AppState>) -> Vec<Question> {
    let questions = state
        .questions
        .lock()
        .expect("lock pentru questions a eșuat");
    questions.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let questions = load_questions();

    tauri::Builder::default()
        .manage(AppState {
            questions: Mutex::new(questions),
        })
        .invoke_handler(tauri::generate_handler![
            new_quiz,
            check_answer,
            get_questions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

