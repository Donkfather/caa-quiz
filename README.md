[![Deploy Web to GitHub Pages](https://github.com/Donkfather/caa-quiz/actions/workflows/pages.yml/badge.svg)](https://github.com/Donkfather/caa-quiz/actions/workflows/pages.yml) [![Release builds](https://github.com/Donkfather/caa-quiz/actions/workflows/release.yml/badge.svg)](https://github.com/Donkfather/caa-quiz/actions/workflows/release.yml)

## Quiz Clasa C – Tauri 2 (Android, iOS, Desktop, Web)

Aplicatie de quiz pentru întrebările de teorie „Clasa C”, construită cu:

- **Backend**: Rust + Tauri 2
- **Frontend**: HTML/CSS/JS vanilla, logică comună în `src/quiz-core.js`
- **Platforme**: Android, iOS, macOS (desktop) și Web (GitHub Pages)

Interfața și logica de quiz sunt partajate între aplicația Tauri și versiunea web.

---

## Structura proiectului

- `src/` – frontend comun Tauri (mobil + desktop)
  - `index.html` – UI principal (start / quiz / rezultat)
  - `style.css` – design mobile‑first
  - `main.js` – integrare Tauri + `quiz-core`
  - `quiz-core.js` – logică de quiz (randomizare, scor, moduri)
- `web/` – front‑end web standalone (folosește aceleași stiluri și `quiz-core`)
  - `index.html`
  - `main.js`
- `questions.json` – toate întrebările, în format:
  - `{ "id": number, "question": string, "options": string[], "correct": number }`
- `src-tauri/` – cod Rust și configurare Tauri
  - `src/quiz.rs` – modele și încărcare întrebări
  - `src/lib.rs` – `AppState`, comenzi Tauri (`get_questions`, `check_answer`)
  - `src/main.rs` – entrypoint desktop
  - `Cargo.toml`, `tauri.conf.json`

---

## Rulare în modul dezvoltare

### Desktop (Tauri dev)

Prerechizite: Rust stable, `tauri-cli`, Node (opțional, pentru tooling suplimentar).

```bash
cd caa
cargo tauri dev
```

Se va deschide fereastra desktop (macOS) cu aceleași ecrane ca pe mobil.

### Android – modul dev

Prerechizite: Android SDK + NDK, Java 17+ configurat (`JAVA_HOME`), dispozitiv sau emulator conectat.

```bash
cd caa
cargo tauri android dev
```

Tauri va construi APK‑ul de debug și îl va instala pe dispozitivul detectat.

### Web local (fără Tauri)

Poți rula varianta web direct din browser folosind un server static simplu:

```bash
cd caa
python3 -m http.server 8000
```

Apoi deschide:

- `http://localhost:8000/web/` – interfața web (folosește `questions.json` din rădăcină).

---

## Build de release – manual

### Desktop (macOS)

```bash
cd caa
cargo tauri build
```

Artefacte:

- binar: `src-tauri/target/release/quiz-app`
- bundle macOS (dmg, app): `src-tauri/target/release/bundle/dmg/`

### Android (APK/AAB)

```bash
cd caa
cargo tauri android build
```

Artefacte principale:

- APK/AAB: `src-tauri/gen/android/app/build/outputs/`
  - ex.: `.../apk/arm64/release/app-arm64-release.apk`

### iOS

Dacă ai configurat iOS (Xcode + device/simulator):

```bash
cd caa
cargo tauri ios build
```

Artefacte:

- proiect și bundle: `src-tauri/gen/ios/`

### Web (static)

Varianta web nu necesită build suplimentar – fișierele sunt servite direct din repository:

- HTML: `web/index.html`
- JS: `web/main.js`, `src/quiz-core.js`
- Date: `questions.json`

Pentru un pachet simplu:

```bash
cd caa
./web-build.sh
tar -czf web-dist.tar.gz -C public .
```

---

## GitHub Actions – release și Pages

### Workflow de release (`.github/workflows/release.yml`)

Se declanșează la `push` pe un branch de forma `release/x.y.z`:

- creează automat un tag `v<x.y.z>` pe commitul respectiv;
- construiește:
  - **desktop** (macOS) – `cargo tauri build`;
  - **Android** – `cargo tauri android build`;
  - **iOS** – `cargo tauri ios build`;
  - **web** – arhivează directorul `web/` în `web-dist.tar.gz`;
- încarcă artefactele ca **GitHub Actions artifacts**:
  - desktop bundles din `src-tauri/target/release/bundle/**`;
  - Android outputs din `src-tauri/gen/android/app/build/outputs/**`;
  - iOS outputs din `src-tauri/gen/ios/**`;
  - `web-dist.tar.gz`.

### Deploy Web pe GitHub Pages (`.github/workflows/pages.yml`)

Se declanșează la `push` pe `main` și `release/*`:

- publică întreg repository‑ul ca artifact pentru GitHub Pages;
- interfața web este accesibilă la:
  - `https://<user>.github.io/<repo>/web/`

Asigură‑te că în setările repository‑ului, la **Pages**, sursa este setată pe „GitHub Actions”.

---

## Notițe

- Pentru Android și iOS, majoritatea problemelor de build vin din:
  - versiunea de Java (recomandat JDK 17 LTS);
  - configurarea SDK/NDK.
- Toate întrebările sunt încărcate în memorie la startup (`load_questions()` în Rust); modul de quiz (26 întrebări vs. toate) și scorul sunt gestionate în `quiz-core.js`. 

