import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

// Store conversion state in memory (in production, use Redis or similar)
const conversionState = new Map<string, {
  status: "idle" | "converting" | "done" | "error";
  totalScenes: number;
  error?: string;
}>();

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

    // Set state to converting
    conversionState.set(id, { status: "converting", totalScenes: 0 });

    console.log(`🎬 [Convert-Script] Job started for project ${id}`);

    // Delete existing scenes
    await prisma.scene.deleteMany({ where: { projectId: id } });

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "SCENES_DONE" },
    });

    // Start background conversion
    runConversion(id, script, styleAnchorTokens, characters, environments, openaiApiKey, baseUrl);

    console.log(`🚀 [Convert-Script] Job dispatched for project ${id} - AI processing started`);

    return NextResponse.json({
      message: "Conversion started",
      status: "converting"
    });

  } catch (error) {
    console.error("Convert script error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function runConversion(
  id: string,
  script: string,
  styleAnchorTokens: string,
  characters: string,
  environments: string,
  openaiApiKey: string,
  baseUrl: string
) {
  try {
    console.log(`📡 [Convert-Script] Calling AI API for project ${id}`);

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

    console.log(`⏳ [Convert-Script] Waiting for AI response...`);
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
      throw new Error("OpenAI API error");
    }

    console.log(`✅ [Convert-Script] AI response received for project ${id}`);
    const data = await response.json();
    let scenesJson = data.choices[0].message.content;
    console.log(`📝 [Convert-Script] Parsing JSON response...`);

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
              content: `Perbaiki JSON berikut agar menjadi array objek dengan field "text" dan "image".\n\nJSON rusak:\n${scenesJson}`
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
          throw new Error("Failed to parse scene manifest");
        }
      } else {
        throw new Error("Failed to parse scene manifest");
      }
    }

    // Update state with total scenes
    conversionState.set(id, { status: "converting", totalScenes: scenes.length });
    console.log(`🎬 [Convert-Script] Starting to create ${scenes.length} scenes for project ${id}`);

    // Create scenes incrementally with delay
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      await prisma.scene.create({
        data: {
          projectId: id,
          sceneIndex: i,
          text: scene.text,
          imagePrompt: scene.image,
          status: "PENDING",
        },
      });

      console.log(`  ✓ [Convert-Script] Scene ${i + 1}/${scenes.length} created - "${scene.text.substring(0, 50)}..."`);
      conversionState.set(id, { status: "converting", totalScenes: scenes.length });

      // Small delay to show incremental creation
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Mark as done
    conversionState.set(id, { status: "done", totalScenes: scenes.length });
    console.log(`🎉 [Convert-Script] Job DONE! All ${scenes.length} scenes created for project ${id}`);

  } catch (error) {
    console.error(`❌ [Convert-Script] Job FAILED for project ${id}:`, error);
    conversionState.set(id, { status: "error", totalScenes: 0, error: String(error) });
  }
}

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "status") {
      // Get current conversion status
      const state = conversionState.get(id);
      const scenes = await prisma.scene.findMany({
        where: { projectId: id },
        orderBy: { sceneIndex: "asc" },
      });

      return NextResponse.json({
        status: state?.status || "idle",
        scenes,
        totalScenes: state?.totalScenes || 0,
        error: state?.error,
      });
    }

    // Default: return current scenes
    const scenes = await prisma.scene.findMany({
      where: { projectId: id },
      orderBy: { sceneIndex: "asc" },
    });

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("GET convert-script error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
