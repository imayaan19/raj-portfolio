import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { suggestCategory } from "@/lib/categorize";
import { hasOpenAI } from "@/lib/ai";

// Extracts structured expense fields from an uploaded receipt image using
// OpenAI vision. Returns a draft the user must confirm — never auto-saves.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let dataUrl = "";
  try {
    const body = await request.json();
    dataUrl = String(body.image || "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Please upload a valid image." }, { status: 400 });
  }
  // Cap payload size (~6MB base64).
  if (dataUrl.length > 8_000_000) {
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  }

  if (!hasOpenAI()) {
    return NextResponse.json({
      draft: null,
      note: "Receipt scanning needs an OpenAI API key. You can still enter the expense manually.",
    });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract expense details from the receipt image. Respond ONLY as compact JSON: {\"merchant\":string,\"amount\":number,\"date\":\"YYYY-MM-DD\",\"line_items\":string[]}. If a field is unclear, use null.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the expense details from this receipt." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] as any,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const merchant = json.merchant || "";
    return NextResponse.json({
      draft: {
        merchant,
        amount: Number(json.amount) || 0,
        date: json.date || new Date().toISOString().slice(0, 10),
        category: suggestCategory(merchant),
        lineItems: Array.isArray(json.line_items) ? json.line_items.slice(0, 10) : [],
      },
    });
  } catch (e) {
    console.error("Receipt scan error", e);
    return NextResponse.json(
      { error: "Couldn't read the receipt. Please enter the expense manually." },
      { status: 500 }
    );
  }
}
