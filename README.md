# Darsino

AI-powered luxury study workspace for Iranian students, grades 1-12.

## What's in this version

- **Onboarding**: pick grade (1-12) and branch (ریاضی‌فیزیک / تجربی / انسانی for 10-12) — everything else adapts to it.
- **Grade-based subjects** (`lib/curriculum.ts`): real, fuller subject lists per stage — including دینی/قرآن, عربی, مطالعات اجتماعی, آمادگی دفاعی, جغرافیا, هندسه, علوم, etc. — not a fixed 4-subject list.
- **AI Tutor**: Gemini-backed chat, told the student's grade and branch so it calibrates its explanations.
- **AI-generated quizzes & flashcards** (`app/api/generate/route.ts`): a "تولید با AI" button asks Gemini for a fresh batch of quiz questions or flashcards written specifically for the student's subject + grade + branch, cached locally so spaced-repetition scheduling stays stable across sessions.
- **Planner** (`lib/planner.ts`): give it an exam date and daily minutes; it auto-distributes study time across subjects, weighting subjects you're weaker in.
- **Flashcards** (`lib/srs.ts`): SM-2 spaced-repetition scheduling.
- **Adaptive quizzes** (`lib/quizBank.ts`): difficulty steps up after 2 correct in a row, down after a miss.
- **Full report, every subject** — the Progress page now shows a table with today's and this week's study minutes plus quiz accuracy for every subject in the student's grade, not just the ones they've touched.
- **Mini tools** (`lib/tools.ts`): GPA calculator (معدل‌سنج) and unit converter (مبدل واحد).
- **PWA**: installable, offline-capable app shell.
- **Luxury dark theme**: charcoal base with emerald/gold/ruby accents, gradient-text highlights, and a hover/click "grow + glow" micro-interaction on every button.

All state is stored client-side in `localStorage` (see `lib/storage.ts`) — no backend/database yet.

## Honest gaps (next steps)

- **Static question bank is a small starter set**; AI-generated content fills the gap on demand but isn't curated/reviewed by a teacher.
- **No auth or server-side persistence** — progress lives only in the browser that created it.
- **No official textbook chapter breakdown** — subjects are named correctly per grade/branch, but there's no chapter/unit structure yet.
- **Logo/background** is a CSS gradient approximation of the marble/gold mood you described, not a photoreal render — no image-generation tool is available here.

## Setup

\`\`\`bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY
npm run dev
\`\`\`
