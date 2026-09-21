import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type ClientMessage = {
  role: "user" | "ai";
  text: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY در سرور تنظیم نشده است."
        },
        {
          status: 500
        }
      );
    }

    const body = (await request.json()) as {
      subject?: string;
      messages?: ClientMessage[];
      grade?: string;
      branch?: string;
    };

    const subject = body.subject || "عمومی";
    const grade = body.grade || "";
    const branch = body.branch || "";

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const recentMessages = messages.slice(-20);

    const transcript = recentMessages
      .map((message) => {
        const role =
          message.role === "user"
            ? "دانش‌آموز"
            : "Darsino AI";

        return `${role}: ${message.text}`;
      })
      .join("\n\n");

    const ai = new GoogleGenAI({
      apiKey
    });

    const prompt = `
تو Darsino AI Tutor هستی؛ یک دستیار آموزشی برای دانش‌آموز.

درس انتخاب‌شده:
${subject}

پایه تحصیلی دانش‌آموز: ${grade || "نامشخص"}${branch ? ` (رشته ${branch})` : ""}

قوانین:
- سطح توضیح، مثال‌ها و واژگان را دقیقاً متناسب با پایه تحصیلی دانش‌آموز تنظیم کن؛ برای دانش‌آموز دبستان ساده و با مثال ملموس، برای دبیرستان با دقت و اصطلاحات فنی درس صحبت کن.
- پاسخ‌ها را به فارسی بده، مگر اینکه دانش‌آموز زبان دیگری بخواهد.
- مفاهیم را واضح و مرحله‌به‌مرحله توضیح بده.
- در ریاضی، فرمول‌ها و محاسبات را واضح بنویس.
- در فیزیک و شیمی، مفهوم را با مثال ساده توضیح بده.
- اگر دانش‌آموز تمرین فرستاد، روش حل را هم توضیح بده.
- اگر درخواست آزمون کرد، چند سؤال مناسب تولید کن.
- سطح توضیح را با توجه به سؤال دانش‌آموز تنظیم کن.
- پاسخ‌ها را خوانا و منظم نگه دار.
- اطلاعات ساختگی را به‌عنوان واقعیت بیان نکن.
- اگر سؤال خارج از موضوع درس بود، همچنان محترمانه کمک کن.

گفت‌وگوی اخیر:
${transcript}
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt
    });

    return NextResponse.json({
      text:
        interaction.output_text ||
        "پاسخی از Gemini دریافت نشد."
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return NextResponse.json(
      {
        error: "ارتباط با Gemini با خطا مواجه شد."
      },
      {
        status: 500
      }
    );
  }
}
