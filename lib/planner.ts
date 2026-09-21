import type { Subject } from "./curriculum";

export type SubjectProgress = Record<string, number>; // subjectId -> 0-100

export type PlannedTask = {
  id: string;
  date: string; // ISO date (day only)
  subjectId: string;
  subjectName: string;
  minutes: number;
  done: boolean;
};

/**
 * Builds a day-by-day study plan between today and `examDate`.
 * Subjects further from 100% mastery get proportionally more minutes;
 * everyone still gets at least one touch per week so nothing is neglected.
 */
export function generatePlan(
  subjects: Subject[],
  progress: SubjectProgress,
  examDate: string,
  minutesPerDay: number
): PlannedTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(examDate);
  end.setHours(0, 0, 0, 0);

  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - today.getTime()) / 86400000)
  );

  // Weight = how far each subject is from mastery (+ a floor so nothing hits 0).
  const weights = subjects.map((subject) => {
    const mastery = progress[subject.id] ?? 0;
    return Math.max(10, 100 - mastery);
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const tasks: PlannedTask[] = [];

  for (let day = 0; day < totalDays; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().slice(0, 10);

    // Rotate which subjects appear each day so students aren't doing
    // all 8 subjects daily — pick the top 2-3 by weight, round-robin shifted by day.
    const ranked = subjects
      .map((subject, index) => ({ subject, weight: weights[index] }))
      .sort((a, b) => b.weight - a.weight);

    const perDaySlots = Math.min(3, ranked.length);
    const rotated = [
      ...ranked.slice(day % ranked.length),
      ...ranked.slice(0, day % ranked.length),
    ].slice(0, perDaySlots);

    const dayWeightSum = rotated.reduce((sum, item) => sum + item.weight, 0);

    rotated.forEach(({ subject, weight }) => {
      const minutes = Math.max(
        15,
        Math.round((weight / dayWeightSum) * minutesPerDay / 5) * 5
      );

      tasks.push({
        id: `${dateStr}-${subject.id}`,
        date: dateStr,
        subjectId: subject.id,
        subjectName: subject.name,
        minutes,
        done: false,
      });
    });
  }

  void totalWeight; // reserved for future weighting tweaks
  return tasks;
}

export function tasksForToday(tasks: PlannedTask[]): PlannedTask[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  return tasks.filter((task) => task.date === todayStr);
}
