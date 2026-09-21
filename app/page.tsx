"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ALL_BRANCHES,
  ALL_GRADES,
  Branch,
  Grade,
  Subject,
  gradeLabel,
  needsBranch,
  subjectsForGrade,
} from "@/lib/curriculum";
import { loadJSON, saveJSON } from "@/lib/storage";
import { SrsState, initSrsState, isDue, reviewCard, sortByDue } from "@/lib/srs";
import {
  Difficulty,
  Flashcard,
  QuizQuestion,
  flashcardsForSubject,
  nextDifficulty,
  questionsForSubject,
} from "@/lib/quizBank";
import {
  GpaEntry,
  UnitCategory,
  calcGpa,
  convertUnit,
  unitOptions,
} from "@/lib/tools";
import {
  PlannedTask,
  SubjectProgress,
  generatePlan,
  tasksForToday,
} from "@/lib/planner";

type View =
  | "dashboard"
  | "tutor"
  | "notes"
  | "subjects"
  | "planner"
  | "quizzes"
  | "flashcards"
  | "progress"
  | "tools";

type Message = { role: "user" | "ai"; text: string };

type Profile = { name: string; grade: Grade; branch?: Branch };

type QuizStats = Record<string, { correct: number; total: number }>;

const nav: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "داشبورد", icon: "⌂" },
  { id: "tutor", label: "AI Tutor", icon: "✦" },
  { id: "notes", label: "یادداشت‌ها", icon: "▤" },
  { id: "subjects", label: "درس‌ها", icon: "◈" },
  { id: "planner", label: "برنامه‌ریزی", icon: "◷" },
  { id: "quizzes", label: "آزمون‌ها", icon: "✓" },
  { id: "flashcards", label: "فلش‌کارت‌ها", icon: "▣" },
  { id: "progress", label: "پیشرفت", icon: "↗" },
  { id: "tools", label: "ابزارها", icon: "⚙" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const weekdayLetters = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");

  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "سلام! من Darsino AI هستم. سؤال درسی‌ات را بفرست تا مرحله‌به‌مرحله کمک کنم." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [notes, setNotes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [quizStats, setQuizStats] = useState<QuizStats>({});
  const [srsStates, setSrsStates] = useState<Record<string, SrsState>>({});
  const [activityLog, setActivityLog] = useState<Record<string, number>>({});

  const [plan, setPlan] = useState<PlannedTask[]>([]);
  const [examDate, setExamDate] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState(60);

  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quizDifficulty, setQuizDifficulty] = useState<Difficulty>("easy");
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);

  const [aiQuiz, setAiQuiz] = useState<Record<string, QuizQuestion[]>>({});
  const [aiCards, setAiCards] = useState<Record<string, Flashcard[]>>({});
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");

  const [subjectActivity, setSubjectActivity] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedProfile = loadJSON<Profile | null>("profile", null);
    setProfile(savedProfile);

    if (savedProfile) {
      const subjectList = subjectsForGrade(savedProfile.grade, savedProfile.branch);
      setSubjects(subjectList);
      setActiveSubjectId(subjectList[0]?.id || "");
    }

    setNotes(loadJSON<string[]>("notes", ["قانون دوم نیوتن و نکات مهم فصل اول"]));
    setQuizStats(loadJSON<QuizStats>("quizStats", {}));
    setSrsStates(loadJSON<Record<string, SrsState>>("srsStates", {}));
    setActivityLog(loadJSON<Record<string, number>>("activityLog", {}));
    setPlan(loadJSON<PlannedTask[]>("planTasks", []));
    setExamDate(loadJSON<string>("examDate", ""));
    setMinutesPerDay(loadJSON<number>("minutesPerDay", 60));
    setAiQuiz(loadJSON<Record<string, QuizQuestion[]>>("aiQuiz", {}));
    setAiCards(loadJSON<Record<string, Flashcard[]>>("aiCards", {}));
    setSubjectActivity(loadJSON<Record<string, number>>("subjectActivity", {}));

    setHydrated(true);
  }, []);

  function logActivity(minutes: number, subjectId?: string) {
    setActivityLog((prev) => {
      const next = { ...prev, [todayStr()]: (prev[todayStr()] || 0) + minutes };
      saveJSON("activityLog", next);
      return next;
    });

    if (subjectId) {
      setSubjectActivity((prev) => {
        const key = `${todayStr()}|${subjectId}`;
        const next = { ...prev, [key]: (prev[key] || 0) + minutes };
        saveJSON("subjectActivity", next);
        return next;
      });
    }
  }

  function completeOnboarding(p: Profile) {
    saveJSON("profile", p);
    setProfile(p);
    const subjectList = subjectsForGrade(p.grade, p.branch);
    setSubjects(subjectList);
    setActiveSubjectId(subjectList[0]?.id || "");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    logActivity(3, activeSubjectId);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSubjectName(),
          messages: nextMessages,
          grade: profile ? gradeLabel(profile.grade) : "",
          branch: profile?.branch || "",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در ارتباط با AI");

      setMessages([...nextMessages, { role: "ai", text: data.text }]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "ai",
          text: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function activeSubjectName() {
    return subjects.find((s) => s.id === activeSubjectId)?.name || "عمومی";
  }

  async function generateWithAI(kind: "quiz" | "flashcards") {
    if (genLoading || !activeSubjectId) return;
    setGenLoading(true);
    setGenError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          subject: activeSubjectName(),
          grade: profile ? gradeLabel(profile.grade) : "",
          branch: profile?.branch || "",
          count: 6,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "خطا در تولید محتوا");

      const stamp = Date.now();

      if (kind === "quiz") {
        type RawQ = { question?: string; options?: string[]; correctIndex?: number; difficulty?: string };
        const items: QuizQuestion[] = (data.items as RawQ[])
          .map((it, index) => ({
            id: `ai-${activeSubjectId}-${stamp}-${index}`,
            subjectId: activeSubjectId,
            difficulty: (["easy", "medium", "hard"].includes(it.difficulty || "")
              ? it.difficulty
              : "medium") as Difficulty,
            question: String(it.question || ""),
            options: Array.isArray(it.options) ? it.options.map(String).slice(0, 4) : [],
            correctIndex: Number.isInteger(it.correctIndex) ? Number(it.correctIndex) : 0,
          }))
          .filter((q) => q.question && q.options.length === 4);

        setAiQuiz((prev) => {
          const next = { ...prev, [activeSubjectId]: items };
          saveJSON("aiQuiz", next);
          return next;
        });
        setQuizIndex(0);
        setAnswer(null);
        setQuizDifficulty("easy");
        setQuizStreak(0);
      } else {
        type RawC = { front?: string; back?: string };
        const items: Flashcard[] = (data.items as RawC[])
          .map((it, index) => ({
            id: `ai-${activeSubjectId}-${stamp}-${index}`,
            subjectId: activeSubjectId,
            front: String(it.front || ""),
            back: String(it.back || ""),
          }))
          .filter((c) => c.front && c.back);

        setAiCards((prev) => {
          const next = { ...prev, [activeSubjectId]: items };
          saveJSON("aiCards", next);
          return next;
        });
        setFlashIndex(0);
        setFlipped(false);
      }
    } catch (error) {
      setGenError(error instanceof Error ? error.message : "خطا در تولید محتوا");
    } finally {
      setGenLoading(false);
    }
  }

  function openTutor(subjectId: string) {
    setActiveSubjectId(subjectId);
    setView("tutor");
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    const next = [note.trim(), ...notes];
    setNotes(next);
    saveJSON("notes", next);
    setNote("");
  }

  const subjectProgress: SubjectProgress = useMemo(() => {
    const result: SubjectProgress = {};
    subjects.forEach((s) => {
      const stat = quizStats[s.id];
      result[s.id] = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    });
    return result;
  }, [subjects, quizStats]);

  function buildPlan() {
    if (!examDate || subjects.length === 0) return;
    const tasks = generatePlan(subjects, subjectProgress, examDate, minutesPerDay);
    setPlan(tasks);
    saveJSON("planTasks", tasks);
    saveJSON("examDate", examDate);
    saveJSON("minutesPerDay", minutesPerDay);
  }

  function toggleTask(id: string) {
    const next = plan.map((t) => {
      if (t.id !== id) return t;
      const done = !t.done;
      if (done) logActivity(t.minutes, t.subjectId);
      return { ...t, done };
    });
    setPlan(next);
    saveJSON("planTasks", next);
  }

  const upcomingByDay = useMemo(() => {
    const groups: Record<string, PlannedTask[]> = {};
    plan.slice(0, 60).forEach((task) => {
      groups[task.date] = groups[task.date] || [];
      groups[task.date].push(task);
    });
    return Object.entries(groups).slice(0, 7);
  }, [plan]);

  const today = tasksForToday(plan);

  const quizQuestions = useMemo(() => {
    const staticQ = questionsForSubject(activeSubjectId, quizDifficulty);
    const generatedQ = (aiQuiz[activeSubjectId] || []).filter((q) => q.difficulty === quizDifficulty);
    return [...generatedQ, ...staticQ];
  }, [activeSubjectId, quizDifficulty, aiQuiz]);
  const currentQuestion = quizQuestions[quizIndex % Math.max(1, quizQuestions.length)];

  function answerQuiz(index: number) {
    if (!currentQuestion) return;
    setAnswer(index);

    const correct = index === currentQuestion.correctIndex;
    const stat = quizStats[activeSubjectId] || { correct: 0, total: 0 };
    const nextStat = { correct: stat.correct + (correct ? 1 : 0), total: stat.total + 1 };
    const nextStats = { ...quizStats, [activeSubjectId]: nextStat };
    setQuizStats(nextStats);
    saveJSON("quizStats", nextStats);
    logActivity(4, activeSubjectId);

    const streak = correct ? quizStreak + 1 : 0;
    setQuizStreak(streak);
    setQuizDifficulty((d) => nextDifficulty(d, streak, correct));
  }

  function nextQuizQuestion() {
    setAnswer(null);
    setQuizIndex((i) => i + 1);
  }

  const subjectCards = useMemo(
    () => [...(aiCards[activeSubjectId] || []), ...flashcardsForSubject(activeSubjectId)],
    [activeSubjectId, aiCards]
  );
  const cardsWithState = subjectCards.map((c) => ({
    ...c,
    srs: srsStates[c.id] || initSrsState(),
  }));
  const dueCards = sortByDue(cardsWithState.filter((c) => isDue(c.srs)));
  const displayCards = dueCards.length > 0 ? dueCards : cardsWithState;
  const currentCard = displayCards[flashIndex % Math.max(1, displayCards.length)];

  function reviewCurrentCard(quality: 0 | 3 | 5) {
    if (!currentCard) return;
    const nextState = reviewCard(currentCard.srs, quality);
    const next = { ...srsStates, [currentCard.id]: nextState };
    setSrsStates(next);
    saveJSON("srsStates", next);
    logActivity(2, currentCard.subjectId);
    setFlipped(false);
    setFlashIndex((i) => (i + 1) % Math.max(1, displayCards.length));
  }

  const weekData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const minutes = activityLog[key] || 0;
      const pct = Math.min(100, Math.round((minutes / Math.max(1, minutesPerDay)) * 100));
      days.push({ label: weekdayLetters[d.getDay()], value: pct });
    }
    return days;
  }, [activityLog, minutesPerDay]);

  const weeklyAvg = Math.round(weekData.reduce((s, d) => s + d.value, 0) / 7);
  const todayMinutes = activityLog[todayStr()] || 0;
  const remainingToday = today.filter((t) => !t.done).length;
  const doneToday = today.filter((t) => t.done).length;

  const [gpaEntries, setGpaEntries] = useState<GpaEntry[]>([]);
  const [gpaSubject, setGpaSubject] = useState("");
  const [gpaScore, setGpaScore] = useState("");
  const [gpaUnits, setGpaUnits] = useState("1");

  function addGpaEntry(event: FormEvent) {
    event.preventDefault();
    const score = Number(gpaScore);
    const units = Number(gpaUnits) || 1;
    if (!gpaSubject.trim() || Number.isNaN(score)) return;

    setGpaEntries([
      ...gpaEntries,
      { id: String(Date.now()), subjectName: gpaSubject.trim(), score, units },
    ]);
    setGpaSubject("");
    setGpaScore("");
    setGpaUnits("1");
  }

  const [convCategory, setConvCategory] = useState<UnitCategory>("length");
  const [convFrom, setConvFrom] = useState("متر");
  const [convTo, setConvTo] = useState("کیلومتر");
  const [convValue, setConvValue] = useState("1");

  if (!hydrated) return null;

  if (!profile) {
    return <Onboarding onDone={completeOnboarding} />;
  }

  const title = nav.find((item) => item.id === view)?.label || "داشبورد";

  return (
    <main className="app" dir="rtl">
      <aside className="sidebar">
        <div className="brand">
          <b>D</b>
          <div>
            <strong>Darsino</strong>
            <small>دستیار لوکس مطالعه</small>
          </div>
        </div>

        <label>WORKSPACE</label>

        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <i>{item.icon}</i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sideFoot">
          <span>پیشرفت هفتگی</span>
          <strong>{weeklyAvg}%</strong>
          <div className="progress">
            <i style={{ width: weeklyAvg + "%" }} />
          </div>
        </div>
      </aside>

      <section className="content">
        <header>
          <div>
            <small>
              Darsino / {title} · پایه {gradeLabel(profile.grade)}
              {profile.branch ? " · " + profile.branch : ""}
            </small>
            <h1>{view === "dashboard" ? "سلام " + (profile.name || "") + "، آماده‌ای برای مطالعه؟" : title}</h1>
          </div>
          <div className="avatar">{(profile.name || "D")[0]}</div>
        </header>

        {view === "dashboard" && (
          <>
            <section className="hero">
              <div>
                <em>✦ AI POWERED</em>
                <h2>
                  یادگیری هوشمند،
                  <br />
                  <span>ساده‌تر از همیشه.</span>
                </h2>
                <p>درس‌ها، برنامه، یادداشت‌ها و دستیار هوشمندت را یکجا مدیریت کن.</p>
                <button onClick={() => setView("tutor")}>شروع مطالعه ←</button>
              </div>
              <div className="orb">✦</div>
            </section>

            <div className="stats">
              {[
                ["جلسات امروز", String(doneToday), doneToday > 0 ? "امروز فعال بودی" : "هنوز شروع نکردی"],
                ["تکالیف باقی‌مانده", String(remainingToday), remainingToday > 0 ? remainingToday + " مورد" : "همه انجام شد"],
                ["پیشرفت هفتگی", weeklyAvg + "٪", "میانگین ۷ روز اخیر"],
                ["زمان مطالعه امروز", (todayMinutes / 60).toFixed(1) + "h", "هدف: " + (minutesPerDay / 60).toFixed(1) + " ساعت"],
              ].map((item) => (
                <article key={item[0]}>
                  <small>{item[0]}</small>
                  <strong>{item[1]}</strong>
                  <span>{item[2]}</span>
                </article>
              ))}
            </div>

            <div className="grid2">
              <section className="card">
                <small>AI TUTOR</small>
                <h3>دستیار هوشمند</h3>

                <div className="aiBox">
                  ✦
                  <div>
                    <b>چه چیزی می‌خواهی یاد بگیری؟</b>
                    <p>هر سؤال درسی را بپرس؛ از توضیح مفاهیم تا حل تمرین.</p>
                  </div>
                </div>

                <div className="chips">
                  {["حل یک تمرین", "توضیح یک مفهوم", "ساخت آزمون کوتاه"].map((text) => (
                    <button
                      key={text}
                      onClick={() => {
                        setInput(text);
                        setView("tutor");
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <small>TODAY</small>
                <h3>برنامه امروز</h3>

                {today.length === 0 && (
                  <p className="emptyState" style={{ padding: "10px 0" }}>
                    هنوز برنامه‌ای نساختی — از بخش «برنامه‌ریزی» یکی بساز.
                  </p>
                )}

                {today.map((item) => (
                  <div className="task" key={item.id} onClick={() => toggleTask(item.id)}>
                    <b className={item.done ? "done" : ""}>{item.done ? "✓" : ""}</b>
                    {item.subjectName} — {item.minutes} دقیقه
                  </div>
                ))}
              </section>
            </div>

            <section className="card">
              <small>YOUR SUBJECTS</small>
              <h3>درس‌ها</h3>

              <div className="subjects">
                {subjects.map((item) => {
                  const pct = subjectProgress[item.id] || 0;
                  return (
                    <button key={item.id} onClick={() => openTutor(item.id)}>
                      <b>{item.icon}</b>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{pct}% تکمیل</small>
                        <i>
                          <u style={{ width: pct + "%" }} />
                        </i>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {view === "tutor" && (
          <section className="card tutor">
            <div className="head">
              <div>
                <small>AI TUTOR</small>
                <h2>دستیار هوشمند مطالعه</h2>
              </div>

              <select value={activeSubjectId} onChange={(e) => setActiveSubjectId(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="messages">
              {messages.map((message, index) => (
                <div className={"msg " + message.role} key={index}>
                  <small>{message.role === "user" ? "شما" : "Darsino AI"}</small>
                  <div>{message.text}</div>
                </div>
              ))}
              {loading && <div className="msg ai">در حال فکر کردن...</div>}
            </div>

            <form onSubmit={sendMessage}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سؤالت را درباره درس بنویس..."
                disabled={loading}
              />
              <button disabled={loading}>ارسال ✦</button>
            </form>
          </section>
        )}

        {view === "notes" && (
          <Page title="یادداشت‌های من" label="KNOWLEDGE">
            <form className="add" onSubmit={addNote}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت جدید..." />
              <button>افزودن</button>
            </form>

            <div className="cards">
              {notes.map((item, index) => (
                <article className="note" key={index}>
                  <small>یادداشت #{notes.length - index}</small>
                  <h3>{item}</h3>
                  <p>یادداشت ذخیره‌شده برای مرور سریع.</p>
                </article>
              ))}
            </div>
          </Page>
        )}

        {view === "subjects" && (
          <Page title="درس‌های من" label="COURSES">
            <div className="cards">
              {subjects.map((item) => {
                const pct = subjectProgress[item.id] || 0;
                return (
                  <article className="course" key={item.id}>
                    <b>{item.icon}</b>
                    <h3>{item.name}</h3>
                    <p>{pct}% از مسیر یادگیری تکمیل شده</p>
                    <div className="progress">
                      <i style={{ width: pct + "%" }} />
                    </div>
                    <button onClick={() => openTutor(item.id)}>مطالعه با AI ←</button>
                  </article>
                );
              })}
            </div>
          </Page>
        )}

        {view === "planner" && (
          <Page title="برنامه‌ریزی مطالعه" label="PLANNER">
            <div className="planSetup">
              <label>
                تاریخ امتحان / کنکور
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </label>
              <label>
                دقیقه مطالعه در روز
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={minutesPerDay}
                  onChange={(e) => setMinutesPerDay(Number(e.target.value) || 60)}
                />
              </label>
              <button onClick={buildPlan}>ساخت برنامه خودکار</button>
            </div>

            {plan.length === 0 && (
              <p className="emptyState">
                تاریخ امتحان را بزن و «ساخت برنامه خودکار» را بزن — بر اساس پیشرفت هر درس، وقت هر روز خودکار تقسیم می‌شود.
              </p>
            )}

            {upcomingByDay.map(([date, tasks]) => (
              <div className="dayGroup" key={date}>
                <small>{date === todayStr() ? "امروز" : date}</small>
                {tasks.map((item) => (
                  <div className="task big" key={item.id} onClick={() => toggleTask(item.id)}>
                    <b className={item.done ? "done" : ""}>{item.done ? "✓" : ""}</b>
                    {item.subjectName} — {item.minutes} دقیقه
                  </div>
                ))}
              </div>
            ))}
          </Page>
        )}

        {view === "quizzes" && (
          <Page title="آزمون تطبیقی" label="QUIZ">
            <div className="head" style={{ marginBottom: 10 }}>
              <select
                value={activeSubjectId}
                onChange={(e) => {
                  setActiveSubjectId(e.target.value);
                  setQuizIndex(0);
                  setAnswer(null);
                  setQuizDifficulty("easy");
                  setQuizStreak(0);
                }}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button className="aiGenBtn" onClick={() => generateWithAI("quiz")} disabled={genLoading}>
                {genLoading ? "در حال تولید..." : "🪄 تولید سؤال با AI برای پایه من"}
              </button>
            </div>

            {genError && <p className="bad">{genError}</p>}

            {!currentQuestion && (
              <p className="emptyState">
                هنوز برای «{activeSubjectName()}» سؤالی نداریم — دکمه «تولید سؤال با AI» را بزن.
              </p>
            )}

            {currentQuestion && (
              <>
                <span className="diffBadge">
                  سطح: {quizDifficulty === "easy" ? "آسان" : quizDifficulty === "medium" ? "متوسط" : "سخت"}
                </span>

                <h3 className="question">{currentQuestion.question}</h3>

                <div className="options">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={option}
                      className={
                        answer === index
                          ? index === currentQuestion.correctIndex
                            ? "correct"
                            : "wrong"
                          : ""
                      }
                      onClick={() => answerQuiz(index)}
                      disabled={answer !== null}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {answer !== null && (
                  <>
                    <p className={answer === currentQuestion.correctIndex ? "good" : "bad"}>
                      {answer === currentQuestion.correctIndex
                        ? "پاسخ درست است."
                        : "پاسخ درست: " + currentQuestion.options[currentQuestion.correctIndex]}
                    </p>
                    <button className="nextBtn" onClick={nextQuizQuestion}>
                      سؤال بعدی ←
                    </button>
                  </>
                )}

                {quizStats[activeSubjectId] && (
                  <p className="quizScore">
                    امتیاز این درس: {quizStats[activeSubjectId].correct} از {quizStats[activeSubjectId].total}
                  </p>
                )}
              </>
            )}
          </Page>
        )}

        {view === "flashcards" && (
          <Page title="فلش‌کارت‌ها" label="FLASHCARDS">
            <div className="head" style={{ marginBottom: 10 }}>
              <select
                value={activeSubjectId}
                onChange={(e) => {
                  setActiveSubjectId(e.target.value);
                  setFlashIndex(0);
                  setFlipped(false);
                }}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button className="aiGenBtn" onClick={() => generateWithAI("flashcards")} disabled={genLoading}>
                {genLoading ? "در حال تولید..." : "🪄 تولید فلش‌کارت با AI برای پایه من"}
              </button>
            </div>

            {genError && <p className="bad">{genError}</p>}

            {displayCards.length === 0 && (
              <p className="emptyState">
                هنوز برای «{activeSubjectName()}» فلش‌کارتی نداریم — دکمه «تولید فلش‌کارت با AI» را بزن.
              </p>
            )}

            {currentCard && (
              <>
                <p className="dueCount">
                  {dueCards.length > 0
                    ? dueCards.length + " کارت برای مرور امروز آماده است"
                    : "همه کارت‌ها مرور شده — دوباره از اول"}
                </p>

                <div className="flash" onClick={() => setFlipped(!flipped)}>
                  <strong>{flipped ? currentCard.back : currentCard.front}</strong>
                  <small>برای برگرداندن کارت کلیک کن</small>
                </div>

                {flipped && (
                  <div className="srsRow">
                    <button className="again" onClick={() => reviewCurrentCard(0)}>
                      بلد نبودم
                    </button>
                    <button className="hard" onClick={() => reviewCurrentCard(3)}>
                      متوسط
                    </button>
                    <button className="good" onClick={() => reviewCurrentCard(5)}>
                      بلد بودم
                    </button>
                  </div>
                )}
              </>
            )}
          </Page>
        )}

        {view === "progress" && (
          <Page title="پیشرفت یادگیری" label="ANALYTICS">
            <div className="bigProgress">
              <strong>{weeklyAvg}٪</strong>
              <span>میانگین پیشرفت این هفته (نسبت به هدف روزانه‌ات)</span>
            </div>

            <div className="chart">
              {weekData.map((d, index) => (
                <div key={index}>
                  <i style={{ height: Math.max(4, d.value) + "%" }} />
                  <small>{d.label}</small>
                </div>
              ))}
            </div>

            <h3 style={{ margin: "26px 0 12px" }}>گزارش کامل — همه درس‌ها</h3>

            <table className="reportTable">
              <thead>
                <tr>
                  <th>درس</th>
                  <th>امروز</th>
                  <th>این هفته</th>
                  <th>دقت آزمون</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const stat = quizStats[s.id];
                  const pct = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  const todayMin = subjectActivity[`${todayStr()}|${s.id}`] || 0;
                  let weekMin = 0;
                  for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    weekMin += subjectActivity[`${d.toISOString().slice(0, 10)}|${s.id}`] || 0;
                  }
                  return (
                    <tr key={s.id}>
                      <td>
                        <b>{s.icon}</b> {s.name}
                      </td>
                      <td>{todayMin} دقیقه</td>
                      <td>{weekMin} دقیقه</td>
                      <td>{stat ? `${pct}٪ (${stat.correct}/${stat.total})` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="cards" style={{ marginTop: 24 }}>
              {subjects.map((s) => {
                const stat = quizStats[s.id];
                const pct = stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                return (
                  <article className="note" key={s.id}>
                    <small>{s.name}</small>
                    <h3>{pct}% دقت آزمون</h3>
                    <p>{stat ? stat.correct + " درست از " + stat.total + " سؤال" : "هنوز آزمونی نداده‌ای"}</p>
                  </article>
                );
              })}
            </div>
          </Page>
        )}

        {view === "tools" && (
          <Page title="ابزارهای کمکی" label="TOOLS">
            <div className="toolGrid">
              <div className="toolCard">
                <h3>معدل‌سنج</h3>

                <form className="row" onSubmit={addGpaEntry}>
                  <input placeholder="نام درس" value={gpaSubject} onChange={(e) => setGpaSubject(e.target.value)} />
                  <input
                    placeholder="نمره (۰-۲۰)"
                    type="number"
                    min={0}
                    max={20}
                    value={gpaScore}
                    onChange={(e) => setGpaScore(e.target.value)}
                  />
                  <input
                    placeholder="واحد"
                    type="number"
                    min={1}
                    value={gpaUnits}
                    onChange={(e) => setGpaUnits(e.target.value)}
                  />
                  <button>افزودن</button>
                </form>

                {gpaEntries.length > 0 && (
                  <table className="gpaTable">
                    <tbody>
                      {gpaEntries.map((e) => (
                        <tr key={e.id}>
                          <td>{e.subjectName}</td>
                          <td>{e.score}</td>
                          <td>{e.units} واحد</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {gpaEntries.length > 0 && (
                  <div className="gpaResult">
                    معدل: <strong>{calcGpa(gpaEntries)}</strong>
                  </div>
                )}
              </div>

              <div className="toolCard">
                <h3>مبدل واحد</h3>

                <div className="row">
                  <select
                    value={convCategory}
                    onChange={(e) => {
                      const cat = e.target.value as UnitCategory;
                      setConvCategory(cat);
                      const opts = unitOptions(cat);
                      setConvFrom(opts[0]);
                      setConvTo(opts[1] || opts[0]);
                    }}
                  >
                    <option value="length">طول</option>
                    <option value="mass">جرم</option>
                    <option value="volume">حجم</option>
                  </select>
                </div>

                <div className="row">
                  <input type="number" value={convValue} onChange={(e) => setConvValue(e.target.value)} />
                  <select value={convFrom} onChange={(e) => setConvFrom(e.target.value)}>
                    {unitOptions(convCategory).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <span style={{ alignSelf: "center", fontSize: 11 }}>به</span>
                  <select value={convTo} onChange={(e) => setConvTo(e.target.value)}>
                    {unitOptions(convCategory).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="convertResult">
                  {convertUnit(convCategory, convFrom, convTo, Number(convValue) || 0)} {convTo}
                </div>
              </div>
            </div>
          </Page>
        )}
      </section>
    </main>
  );
}

function Page({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card page">
      <small>{label}</small>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);

  const requiresBranch = grade ? needsBranch(grade) : false;
  const canSubmit = grade !== null && (!requiresBranch || branch !== null);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>خوش اومدی به Darsino</h2>
        <p>برای شخصی‌سازی درس‌ها و دستیار هوشمند، پایه تحصیلی‌ات رو انتخاب کن.</p>

        <input
          type="text"
          placeholder="اسمت چیه؟ (اختیاری)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="pillGrid">
          {ALL_GRADES.map((g) => (
            <button
              key={g}
              className={grade === g ? "active" : ""}
              onClick={() => {
                setGrade(g);
                if (!needsBranch(g)) setBranch(null);
              }}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>

        {requiresBranch && (
          <div className="branchRow">
            {ALL_BRANCHES.map((b) => (
              <button key={b} className={branch === b ? "active" : ""} onClick={() => setBranch(b)}>
                {b}
              </button>
            ))}
          </div>
        )}

        <button
          className="primary"
          disabled={!canSubmit}
          onClick={() => {
            if (!grade) return;
            onDone({ name: name.trim(), grade, branch: branch || undefined });
          }}
        >
          شروع کن
        </button>
      </div>
    </div>
  );
}
