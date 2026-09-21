// SM-2 spaced-repetition scheduler (the algorithm behind Anki/SuperMemo).
// Each flashcard carries its own scheduling state; reviewing it with a
// quality score (0-5) pushes its next-due date further out the better
// the student knows it, and resets it to tomorrow if they struggle.

export type SrsState = {
  repetitions: number; // consecutive correct reviews
  easeFactor: number; // how quickly the interval grows (>= 1.3)
  intervalDays: number; // days until next review
  dueAt: string; // ISO date string
};

export function initSrsState(): SrsState {
  const now = new Date();
  return {
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: now.toISOString(),
  };
}

/**
 * quality: 0-5
 *   0-2 = "forgot it" (again)   -> restart tomorrow
 *   3   = "hard" but recalled   -> short interval
 *   4   = "good"                -> normal growth
 *   5   = "easy"                -> fastest growth
 */
export function reviewCard(state: SrsState, quality: 0 | 1 | 2 | 3 | 4 | 5): SrsState {
  let { repetitions, easeFactor, intervalDays } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;

    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);

    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + intervalDays);

  return {
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    dueAt: dueAt.toISOString(),
  };
}

export function isDue(state: SrsState): boolean {
  return new Date(state.dueAt).getTime() <= Date.now();
}

export function sortByDue<T extends { srs: SrsState }>(cards: T[]): T[] {
  return [...cards].sort(
    (a, b) => new Date(a.srs.dueAt).getTime() - new Date(b.srs.dueAt).getTime()
  );
}
