import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import { join } from "path";
import https from "https";
import http from "http";

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
      file.on("error", reject);
    }).on("error", reject);
  });
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    
    let stdout = "";
    let stderr = "";
    
    ffprobe.stdout.on("data", (data) => { stdout += data.toString(); });
    ffprobe.stderr.on("data", (data) => { stderr += data.toString(); });
    
    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? 5 : Math.round(duration));
      } else {
        console.error("ffprobe error:", stderr);
        resolve(5);
      }
    });
    
    ffprobe.on("error", () => resolve(5));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
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

    const { id, sceneId } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, projectId: id },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    if (!scene.text) {
      return NextResponse.json({ error: "Scene text is empty" }, { status: 400 });
    }

    const runwareApiKey = process.env.RUNWARE_API_KEY;
    const runwareUrl = process.env.RUNWARE_URL || "https://api.runware.ai/v1";

    if (!runwareApiKey) {
      return NextResponse.json({ error: "Voice service not configured" }, { status: 500 });
    }

    await prisma.scene.update({
      where: { id: sceneId },
      data: { status: "VOICE_GENERATING" },
    });

    const body = await request.json();
    const voice = body?.voice || "leo";

    const response = await fetch(runwareUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runwareApiKey}`,
      },
      body: JSON.stringify([{
        taskType: "audioInference",
        taskUUID: randomUUID(),
        model: "xai:tts@0",
        speech: {
          text: scene.text,
          voice,
          language: "id",
        },
        audioSettings: {
          bitrate: 64,
          sampleRate: 8000,
          channels: 2,
        },
        outputFormat: "MP3",
        numberResults: 1,
        includeCost: false,
      }]),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Runware voice error:", error);
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "PENDING" },
      });
      return NextResponse.json({ error: "Failed to generate voice" }, { status: 500 });
    }

    const data = await response.json();
    console.log("Runware voice response:", JSON.stringify(data, null, 2));
    const audioUrl = data.data?.[0]?.audioURL;

    if (!audioUrl) {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "PENDING" },
      });
      return NextResponse.json({ error: "No audio returned" }, { status: 500 });
    }

    const tempPath = join("/tmp", `voice_${sceneId}_${Date.now()}.mp3`);
    try {
      await downloadFile(audioUrl, tempPath);
      const voiceLength = await getAudioDuration(tempPath);
      
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          voiceFilePath: audioUrl,
          voiceLength,
          status: "VOICE_DONE",
        },
      });

      return NextResponse.json({
        message: "Voice generated",
        sceneId,
        audioUrl,
        voiceLength,
        status: "VOICE_DONE",
      });
    } finally {
      if (existsSync(tempPath)) {
        try { unlinkSync(tempPath); } catch (e) {}
      }
    }
  } catch (error) {
    console.error("Generate voice error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
