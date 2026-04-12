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
    const { script, styleAnchorTokens, characters, environments } = await request.json();

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://ai.sumopod.com";

    if (!openaiApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const systemPrompt = `Kamu adalah editor video yang mengkonversi skrip narasi menjadi scene manifest JSON.
KEMBALIKAN HANYA JSON ARRAY. Tanpa penjelasan, tanpa markdown code block, tanpa komentar.`;

    const userPrompt = `Konversi skrip berikut menjadi scene manifest JSON.

Gaya visual yang dikunci: ${styleAnchorTokens || "realistic, detailed illustration, 16:9"}
Visual Bible — Karakter: ${characters || "no specific characters"}
Visual Bible — Environment: ${environments || "no specific environment"}

Aturan pembagian scene:
- Bagi berdasarkan beat narasi dan perubahan visual, BUKAN per kalimat
- Satukan kalimat yang satu beat visual/emosi
- Pisah hanya jika visual atau narasi beat benar-benar berubah
- Target: 20–30 scenes untuk video 10 menit (sesuaikan proporsional)

Aturan image prompt:
- Tulis dalam bahasa Inggris
- Format: [character anchor jika ada], [environment anchor], [scene action], [style tokens], [lighting]
- Selalu sertakan: "no text, no watermark, no typography"
- Jangan gunakan nama karakter secara langsung di prompt jika bisa diganti deskripsi fisik

Format output:
[
  {
    "text": "teks narasi bahasa Indonesia",
    "image": "image prompt bahasa Inggris, detail"
  }
]

SKRIP:
${script}`;

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
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json({ error: "Failed to convert script to scenes" }, { status: 500 });
    }

    const data = await response.json();
    let scenesJson = data.choices[0].message.content;

    // Clean up potential markdown code blocks
    scenesJson = scenesJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

    let scenes: Array<{ text: string; image: string }>;
    try {
      scenes = JSON.parse(scenesJson);
    } catch {
      // Try to repair broken JSON
      const repairResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "MiniMax-M2.7-highspeed",
          messages: [
            {
              role: "system",
              content: `Kamu adalah JSON validator dan fixer.
Perbaiki JSON yang diberikan agar sesuai schema yang diminta.
Kembalikan HANYA JSON yang sudah diperbaiki. Tanpa penjelasan.`
            },
            {
              role: "user",
              content: `Perbaiki JSON berikut agar menjadi array objek dengan field "text" dan "image". Setiap item harus punya kedua field tersebut, keduanya string non-kosong.\n\nJSON rusak:\n${scenesJson}`
            },
          ],
          max_tokens: 2048,
          temperature: 0,
        }),
      });

      if (repairResponse.ok) {
        try {
          const repairData = await repairResponse.json();
          const repaired = repairData.choices[0].message.content.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
          scenes = JSON.parse(repaired);
        } catch {
          return NextResponse.json({ error: "Failed to parse scene manifest after repair attempt" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Failed to parse scene manifest" }, { status: 500 });
      }
    }

    // Delete existing scenes and create new ones
    await prisma.scene.deleteMany({ where: { projectId: id } });

    const createdScenes = await Promise.all(
      scenes.map((scene, index) =>
        prisma.scene.create({
          data: {
            projectId: id,
            sceneIndex: index,
            text: scene.text,
            imagePrompt: scene.image,
            status: "PENDING",
          },
        })
      )
    );

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "SCENES_DONE" },
    });

    return NextResponse.json({
      message: "Scenes created successfully",
      scenes: createdScenes,
    });
  } catch (error) {
    console.error("Convert script error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
