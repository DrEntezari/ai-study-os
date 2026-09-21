// Iranian national curriculum, structured by grade (پایه) 1-12.
// Grades 10-12 depend on the student's branch (رشته).

export type Branch = "ریاضی‌فیزیک" | "تجربی" | "انسانی";

export type Grade =
  | 1 | 2 | 3 | 4 | 5 | 6 // دبستان
  | 7 | 8 | 9 // متوسطه اول
  | 10 | 11 | 12; // متوسطه دوم

export type Subject = {
  id: string;
  name: string;
  icon: string;
};

const ELEMENTARY_SUBJECTS: Subject[] = [
  { id: "farsi", name: "فارسی", icon: "ف" },
  { id: "math", name: "ریاضی", icon: "∑" },
  { id: "science", name: "علوم تجربی", icon: "⚗" },
  { id: "social", name: "مطالعات اجتماعی", icon: "◈" },
  { id: "quran", name: "قرآن", icon: "☾" },
  { id: "heavenly-gifts", name: "هدیه‌های آسمان", icon: "✦" },
];

const MIDDLE_SUBJECTS: Subject[] = [
  { id: "farsi", name: "فارسی", icon: "ف" },
  { id: "math", name: "ریاضی", icon: "∑" },
  { id: "science", name: "علوم تجربی", icon: "⚗" },
  { id: "social", name: "مطالعات اجتماعی", icon: "◈" },
  { id: "arabic", name: "عربی", icon: "ع" },
  { id: "english", name: "انگلیسی", icon: "A" },
  { id: "religion", name: "پیام‌های آسمان", icon: "☾" },
  { id: "quran", name: "قرآن", icon: "☾" },
  { id: "defense", name: "آمادگی دفاعی", icon: "⛨" },
  { id: "work-tech", name: "کار و فناوری", icon: "⚙" },
];

const HIGH_SCHOOL_COMMON: Subject[] = [
  { id: "farsi-lit", name: "ادبیات فارسی", icon: "ف" },
  { id: "arabic", name: "عربی", icon: "ع" },
  { id: "religion", name: "دینی", icon: "☾" },
  { id: "quran", name: "قرآن", icon: "☾" },
  { id: "english", name: "انگلیسی", icon: "A" },
  { id: "geography", name: "جغرافیا", icon: "◈" },
  { id: "defense", name: "آمادگی دفاعی", icon: "⛨" },
];

const BRANCH_SUBJECTS: Record<Branch, Subject[]> = {
  "ریاضی‌فیزیک": [
    { id: "math", name: "حسابان", icon: "∑" },
    { id: "geometry", name: "هندسه", icon: "△" },
    { id: "physics", name: "فیزیک", icon: "⚡" },
    { id: "chemistry", name: "شیمی", icon: "⚗" },
    { id: "algebra", name: "جبر و احتمال", icon: "∞" },
  ],
  "تجربی": [
    { id: "biology", name: "زیست‌شناسی", icon: "❦" },
    { id: "chemistry", name: "شیمی", icon: "⚗" },
    { id: "physics", name: "فیزیک", icon: "⚡" },
    { id: "math", name: "ریاضی", icon: "∑" },
    { id: "geometry", name: "هندسه", icon: "△" },
    { id: "geology", name: "زمین‌شناسی", icon: "◈" },
  ],
  "انسانی": [
    { id: "history", name: "تاریخ", icon: "◷" },
    { id: "philosophy", name: "فلسفه و منطق", icon: "✦" },
    { id: "economics", name: "اقتصاد", icon: "$" },
    { id: "sociology", name: "جامعه‌شناسی", icon: "☰" },
  ],
};

export function subjectsForGrade(grade: Grade, branch?: Branch): Subject[] {
  if (grade <= 6) return ELEMENTARY_SUBJECTS;
  if (grade <= 9) return MIDDLE_SUBJECTS;
  const b = branch || "ریاضی‌فیزیک";
  return [...HIGH_SCHOOL_COMMON, ...BRANCH_SUBJECTS[b]];
}

export function needsBranch(grade: Grade): boolean {
  return grade >= 10;
}

export function gradeLabel(grade: Grade): string {
  const names: Record<Grade, string> = {
    1: "اول دبستان",
    2: "دوم دبستان",
    3: "سوم دبستان",
    4: "چهارم دبستان",
    5: "پنجم دبستان",
    6: "ششم دبستان",
    7: "هفتم",
    8: "هشتم",
    9: "نهم",
    10: "دهم",
    11: "یازدهم",
    12: "دوازدهم",
  };
  return names[grade];
}

export const ALL_GRADES: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const ALL_BRANCHES: Branch[] = ["ریاضی‌فیزیک", "تجربی", "انسانی"];
