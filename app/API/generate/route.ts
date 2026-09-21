import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type GenerateBody = {
  kind?: "quiz" | "flashcards";
  subject?: string;
  grade?: string;
  branch?: string;
  count?: number;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY در سرور تنظیم نشده است." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateBody;
    const kind = body.kind === "flashcards" ? "flashcards" : "quiz";
    const subject = body.subject || "عمومی";
    const grade = body.grade || "";
    const branch = body.branch || "";
    const count = Math.min(10, Math.max(3, body.count || 5));

    const ai = new GoogleGenAI({ apiKey });

    const quizSchema = `[{"question":"متن سؤال","options":["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],"correctIndex":0,"difficulty":"easy|medium|hard"}]`;
    const cardSchema = `[{"front":"متن جلوی کارت (سؤال/مفهوم)","back":"متن پشت کارت (پاسخ/تعریف)"}]`;

    const prompt = `
تو یک تولیدکننده محتوای آموزشی برای اپلیکیشن Darsino هستی.

وظیفه: تولید ${count} مورد ${kind === "quiz" ? "سؤال چهارگزینه‌ای" : "فلش‌کارت"} برای درس "${subject}"، دقیقاً متناسب با سرفصل‌های رسمی کتاب درسی پایه ${grade || "نامشخص"}${branch ? ` رشته ${branch}` : ""} در نظام آموزشی ایران.

قوانین سخت‌گیرانه:
- خروجی را فقط و فقط به‌صورت یک آرایه JSON معتبر بده، بدون هیچ متن اضافه، بدون Markdown، بدون backtick.
- دقیقاً از این ساختار پیروی کن:
${kind === "quiz" ? quizSchema : cardSchema}
${kind === "quiz" ? '- correctIndex باید عدد صحیح ایندکس گزینه درست در آرایه options باشد (۰ تا ۳).\n- سطح سختی سؤالات را متنوع کن (easy, medium, hard).' : "- پشت کارت باید کوتاه، دقیق و قابل‌حفظ‌شدن باشد."}
- محتوا باید دقیق، صحیح و کاملاً متناسب با سطح سنی و علمی این پایه تحصیلی باشد.
- از تولید محتوای نامرتبط یا اشتباه علمی خودداری کن.
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
    });

    const raw = (interaction.output_text || "").trim();
    const cleaned = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "پاسخ هوش مصنوعی قابل پردازش نبود. دوباره تلاش کن." },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: "هوش مصنوعی محتوایی برنگرداند. دوباره تلاش کن." },
        { status: 502 }
      );
    }

    return NextResponse.json({ items: parsed });
  } catch (error) {
    console.error("Gemini generate error:", error);
    return NextResponse.json(
      { error: "ارتباط با Gemini با خطا مواجه شد." },
      { status: 500 }
    );
  }
}
