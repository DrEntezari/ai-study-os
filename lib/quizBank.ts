// Original sample question bank, organized by subject id and difficulty.
// This is a starter set to demonstrate the adaptive-difficulty engine —
// swap in a larger bank (or hook up a real content API) as the app grows.

export type Difficulty = "easy" | "medium" | "hard";

export type QuizQuestion = {
  id: string;
  subjectId: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctIndex: number;
};

export type Flashcard = {
  id: string;
  subjectId: string;
  front: string;
  back: string;
};

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "math-1",
    subjectId: "math",
    difficulty: "easy",
    question: "حاصل ۷ × ۸ چند است؟",
    options: ["۴۹", "۵۶", "۶۳", "۵۴"],
    correctIndex: 1,
  },
  {
    id: "math-2",
    subjectId: "math",
    difficulty: "medium",
    question: "مشتق تابع f(x) = x² چیست؟",
    options: ["x", "2x", "x²", "2"],
    correctIndex: 1,
  },
  {
    id: "math-3",
    subjectId: "math",
    difficulty: "hard",
    question: "حاصل انتگرال ∫2x dx برابر است با:",
    options: ["x² + C", "2x² + C", "x + C", "2 + C"],
    correctIndex: 0,
  },
  {
    id: "physics-1",
    subjectId: "physics",
    difficulty: "easy",
    question: "واحد نیرو در سیستم SI چیست؟",
    options: ["ژول", "نیوتن", "وات", "پاسکال"],
    correctIndex: 1,
  },
  {
    id: "physics-2",
    subjectId: "physics",
    difficulty: "medium",
    question: "اگر سرعت جسمی از ۱۰ به ۳۰ متر بر ثانیه در ۵ ثانیه برسد، شتاب آن چقدر است؟",
    options: ["۲ m/s²", "۴ m/s²", "۶ m/s²", "۸ m/s²"],
    correctIndex: 1,
  },
  {
    id: "physics-3",
    subjectId: "physics",
    difficulty: "hard",
    question: "طبق قانون دوم نیوتن، رابطه صحیح کدام است؟",
    options: ["F = m/a", "F = ma", "F = a/m", "F = m + a"],
    correctIndex: 1,
  },
  {
    id: "chemistry-1",
    subjectId: "chemistry",
    difficulty: "easy",
    question: "عدد اتمی هیدروژن چند است؟",
    options: ["۰", "۱", "۲", "۸"],
    correctIndex: 1,
  },
  {
    id: "chemistry-2",
    subjectId: "chemistry",
    difficulty: "medium",
    question: "فرمول شیمیایی آب چیست؟",
    options: ["CO₂", "H₂O", "O₂", "NaCl"],
    correctIndex: 1,
  },
  {
    id: "english-1",
    subjectId: "english",
    difficulty: "easy",
    question: "Choose the correct plural of 'child':",
    options: ["childs", "children", "childes", "child"],
    correctIndex: 1,
  },
  {
    id: "farsi-lit-1",
    subjectId: "farsi-lit",
    difficulty: "medium",
    question: "«بوستان» اثر کیست؟",
    options: ["حافظ", "سعدی", "فردوسی", "مولوی"],
    correctIndex: 1,
  },
];

export const FLASHCARD_BANK: Flashcard[] = [
  { id: "fc-1", subjectId: "physics", front: "قانون دوم نیوتن چیست؟", back: "F = ma" },
  { id: "fc-2", subjectId: "math", front: "انتگرال چیست؟", back: "پادمشتق یک تابع" },
  { id: "fc-3", subjectId: "chemistry", front: "عدد اتمی چیست؟", back: "تعداد پروتون‌های هسته" },
  { id: "fc-4", subjectId: "math", front: "قضیه فیثاغورس", back: "a² + b² = c²" },
  { id: "fc-5", subjectId: "physics", front: "واحد کار و انرژی", back: "ژول (J)" },
  { id: "fc-6", subjectId: "english", front: "Synonym for 'happy'", back: "glad / joyful" },
];

export function questionsForSubject(
  subjectId: string,
  difficulty?: Difficulty
): QuizQuestion[] {
  return QUIZ_BANK.filter(
    (q) => q.subjectId === subjectId && (!difficulty || q.difficulty === difficulty)
  );
}

export function flashcardsForSubject(subjectId: string): Flashcard[] {
  return FLASHCARD_BANK.filter((c) => c.subjectId === subjectId);
}

/** Bumps difficulty up after 2 correct in a row, down after a miss. */
export function nextDifficulty(
  current: Difficulty,
  streak: number,
  gotItRight: boolean
): Difficulty {
  const order: Difficulty[] = ["easy", "medium", "hard"];
  const index = order.indexOf(current);

  if (!gotItRight) return order[Math.max(0, index - 1)];
  if (streak > 0 && streak % 2 === 0) return order[Math.min(2, index + 1)];
  return current;
}
