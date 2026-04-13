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
    const body = await request.json();
    const { type } = body; // 'characters' | 'environments' | 'cameraLanguage' | 'colorPalette' | 'negativeRules'

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
      include: { visualImage: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://ai.sumopod.com";

    if (!openaiApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    let systemPrompt = "";
    let userPrompt = "";
    let updateData: any = {};

    switch (type) {
      case "characters":
        systemPrompt = `Kamu adalah character designer untuk video animasi.
Kembalikan HANYA JSON array. Tanpa penjelasan, tanpa markdown code block.`;
        userPrompt = `Berdasarkan judul video "${project.title}" dan visual style "${project.visualImage?.styleAnchorTokens || 'realistic'}", buat 3-5 karakter utama.

Format output JSON array:
[
  {
    "name": "nama karakter",
    "face_features": "deskripsi wajah (usia, gender, rambut, warna kulit)",
    "wardrobe": "deskripsi pakaian dan fashion",
    "accessories": "deskripsi aksesori (kacamata, topi, dll)",
    "expression_default": "ekspresi default karakter"
  }
]`;
        break;

      case "environments":
        systemPrompt = `Kamu adalah environment designer untuk video animasi.
Kembalikan HANYA JSON array. Tanpa penjelasan, tanpa markdown code block.`;
        userPrompt = `Berdasarkan judul video "${project.title}" dan visual style "${project.visualImage?.styleAnchorTokens || 'realistic'}", buat 3-5 lokasi/environment.

Format output JSON array:
[
  {
    "name": "nama lokasi",
    "description": "deskripsi detail lokasi (gedung, alam, interior, dll)",
    "lighting": "pencahayaan (cerah, gelap, golden hour, dll)",
    "era": "era/zaman (modern, klasik, futuristik, dll)"
  }
]`;
        break;

      case "cameraLanguage":
        systemPrompt = `Kamu adalah cinematographer untuk video animasi.
Kembalikan HANYA JSON object. Tanpa penjelasan, tanpa markdown code block.`;
        userPrompt = `Berdasarkan judul video "${project.title}", buat camera language yang suggested.

Format output JSON:
{
  "cameraLanguage": "deskripsi camera angle dan movement (close-up, wide shot, pan, dolly, dll)"
}`;
        updateData.cameraLanguage = body.cameraLanguage || "medium shot";
        break;

      case "colorPalette":
        systemPrompt = `Kamu adalah color specialist untuk video animasi.
Kembalikan HANYA JSON array. Tanpa penjelasan, tanpa markdown code block.`;
        userPrompt = `Berdasarkan judul video "${project.title}" dan visual style "${project.visualImage?.styleAnchorTokens || 'realistic'}", buat color palette dengan 5 warna hex.

Format output JSON array:
["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"]`;
        break;

      case "negativeRules":
        systemPrompt = `Kamu adalah quality control specialist untuk video AI.
Kembalikan HANYA JSON array. Tanpa penjelasan, tanpa markdown code block.`;
        userPrompt = `Berdasarkan judul video "${project.title}" dan visual style "${project.visualImage?.styleAnchorTokens || 'realistic'}", buat negative rules untuk generation.

Format output JSON array (5-7 items):
["no text", "no watermark", "no blurry", dst...]`;
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
    }

    const data = await response.json();
    let generated = data.choices[0].message.content;
    generated = generated.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(generated);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Update based on type
    switch (type) {
      case "characters":
        updateData.characters = JSON.stringify(parsed);
        break;
      case "environments":
        updateData.environments = JSON.stringify(parsed);
        break;
      case "cameraLanguage":
        updateData.cameraLanguage = parsed.cameraLanguage || "medium shot";
        break;
      case "colorPalette":
        updateData.colorPalette = JSON.stringify(parsed);
        break;
      case "negativeRules":
        updateData.negativeRules = JSON.stringify(parsed);
        break;
    }

    const updated = await prisma.visualImage.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({ visualImage: updated, type });
  } catch (error) {
    console.error("Generate visual image error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
