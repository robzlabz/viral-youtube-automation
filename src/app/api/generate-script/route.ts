import { NextResponse } from "next/server";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const token = getTokenFromCookie(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { title, narrativeStyle } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.minimax.chat/v1";

    if (!openaiApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const systemPrompt = `Kamu adalah penulis konten YouTube Indonesia yang berpengalaman dalam membuat video faceless narasi.
Tulis skrip dalam bahasa Indonesia dengan tone reflektif, praktis, dan tidak menggurui.
Gunakan kata ganti "Anda" secara konsisten.
Hindari jargon abstrak — gunakan kata kerja konkret dan contoh nyata.
Setiap segmen narasi maksimal 2-3 kalimat agar mudah dibagi per scene.`;

    const userPrompt = `Buat skrip video YouTube dengan judul: "${title}"

Pola narasi: ${narrativeStyle || "productivity"}
Target durasi: 10 menit

Struktur wajib:
1. Hook (0:00–0:30) — mulai dengan masalah nyata sehari-hari, jangan dengan pertanyaan klise
2. Konteks (0:30–1:30) — perkenalkan tokoh/tema, satu pencapaian terukur
3. Pelajaran 1 — prinsip + anekdot pendek + tip praktis
4. Pelajaran 2 — prinsip + anekdot pendek + tip praktis
5. Pelajaran 3 — prinsip + anekdot pendek + tip praktis
6. Reframe (menjelang akhir) — koreksi kesalahan umum, ganti dengan framing aksi-dulu
7. Penutup — satu kalimat tesis + satu tantangan hari ini

Aturan tambahan:
- Tiap blok narasi 1–3 kalimat untuk kemudahan scene splitting
- Jangan gunakan heading atau bullet point dalam skrip
- Tulis mengalir seperti narasi audio`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }

    const data = await response.json();
    const script = data.choices[0].message.content;

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Generate script error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
