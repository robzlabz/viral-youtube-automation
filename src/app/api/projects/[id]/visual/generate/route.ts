import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromCookie(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
      include: { visualBible: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://ai.sumopod.com";

    if (!openaiApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const systemPrompt = `Kamu adalah art director dan character designer untuk produksi video animasi.
Kembalikan HANYA JSON. Tanpa penjelasan, tanpa markdown code block.`;

    const userPrompt = `Berdasarkan judul video "${project.title}", buat visual bible.

Format output JSON:
{
  "styleChoice": "nama gaya visual yang disarankan",
  "styleAnchorTokens": "token1, token2, token3 (untuk image prompt)",
  "characters": [
    {
      "id": "char_1",
      "name": "nama karakter",
      "face_features": "deskripsi wajah",
      "wardrobe": "deskripsi pakaian",
      "accessories": "deskripsi aksesori",
      "expression_default": "ekspresi default"
    }
  ],
  "environments": [
    {
      "id": "env_1",
      "name": "nama lokasi",
      "description": "deskripsi detail lokasi",
      "lighting": "pencahayaan",
      "era": "era/zaman"
    }
  ],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "cameraLanguage": "deskripsi camera angle dan movement"
}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7-highspeed",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json({ error: "Failed to generate visual bible" }, { status: 500 });
    }

    const data = await response.json();
    let generated = data.choices[0].message.content;

    generated = generated.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

    let visualData;
    try {
      visualData = JSON.parse(generated);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const updated = await prisma.visualBible.update({
      where: { projectId: id },
      data: {
        characters: JSON.stringify(visualData.characters || []),
        environments: JSON.stringify(visualData.environments || []),
        colorPalette: JSON.stringify(visualData.colorPalette || []),
        cameraLanguage: visualData.cameraLanguage || "medium shot",
        negativeRules: JSON.stringify(["no text", "no watermark", "no typography"]),
        styleAnchorTokens: visualData.styleAnchorTokens || "",
      },
    });

    await prisma.project.update({
      where: { id },
      data: { styleChoice: visualData.styleChoice || project.title },
    });

    return NextResponse.json({
      visualBible: updated,
      styleChoice: visualData.styleChoice,
    });
  } catch (error) {
    console.error("Generate visual bible error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
