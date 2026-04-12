import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { spawn } from "child_process";
import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import https from "https";
import http from "http";

const RENDER_DIR = join(process.cwd(), "public", "renders");

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.on("error", (err) => {
        file.close();
        reject(err);
      });
      
      response.pipe(file);
      
      file.on("finish", () => {
        file.close();
        resolve();
      });
      
      file.on("error", (err) => {
        file.close();
        reject(err);
      });
    });
    
    request.on("error", (err) => {
      file.close();
      reject(err);
    });
  });
}

async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    let stderr = "";
    
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on("error", reject);
  });
}

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
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.scenes.length === 0) {
      return NextResponse.json({ error: "No scenes to render" }, { status: 400 });
    }

    if (!existsSync(RENDER_DIR)) {
      mkdirSync(RENDER_DIR, { recursive: true });
    }

    await prisma.project.update({
      where: { id },
      data: { status: "RENDERING" },
    });

    const projectRenderDir = join(RENDER_DIR, id);
    if (!existsSync(projectRenderDir)) {
      mkdirSync(projectRenderDir, { recursive: true });
    }

    const tempDir = join(projectRenderDir, "temp");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    } else {
      for (const file of ["concat.txt"]) {
        const f = join(tempDir, file);
        if (existsSync(f)) unlinkSync(f);
      }
    }

    const segments: string[] = [];
    const totalScenes = project.scenes.length;
    const downloadedAssets: { voicePath: string; imagePath: string; scene: typeof project.scenes[0]; index: number }[] = [];

    console.log("=== PHASE 1: Downloading all assets ===");

    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      
      if (!scene.voiceFilePath || !scene.imageFilePath) {
        console.log(`Scene ${i + 1}: Skipping - missing voice or image path`);
        continue;
      }

      const voicePath = join(tempDir, `voice_${i}.mp3`);
      const imagePath = join(tempDir, `image_${i}.jpg`);

      console.log(`Scene ${i + 1}/${totalScenes}: Downloading assets...`);
      console.log(`  Voice: ${scene.voiceFilePath}`);
      console.log(`  Image: ${scene.imageFilePath}`);

      let voiceDownloaded = false;
      let imageDownloaded = false;
      const maxRetries = 3;

      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          if (!voiceDownloaded) {
            try {
              await downloadFile(scene.voiceFilePath!, voicePath);
              if (existsSync(voicePath) && statSync(voicePath).size > 0) {
                voiceDownloaded = true;
                console.log(`  Voice downloaded (${statSync(voicePath).size} bytes)`);
              }
            } catch (err) {
              console.log(`  Voice download attempt ${retry + 1} failed: ${err}`);
            }
          }
          if (!imageDownloaded) {
            try {
              await downloadFile(scene.imageFilePath!, imagePath);
              if (existsSync(imagePath) && statSync(imagePath).size > 0) {
                imageDownloaded = true;
                console.log(`  Image downloaded (${statSync(imagePath).size} bytes)`);
              }
            } catch (err) {
              console.log(`  Image download attempt ${retry + 1} failed: ${err}`);
            }
          }
          if (voiceDownloaded && imageDownloaded) break;
        } catch (err) {
          console.log(`  Retry ${retry + 1} error: ${err}`);
        }
      }

      if (!voiceDownloaded) {
        console.log(`  Voice download failed after ${maxRetries} retries, regenerating...`);
        try {
          const regenRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/projects/${id}/scenes/${scene.id}/generate-voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice: "leo" }),
          });
          if (regenRes.ok) {
            const regenData = await regenRes.json();
            if (regenData.audioUrl) {
              await downloadFile(regenData.audioUrl, voicePath);
              voiceDownloaded = existsSync(voicePath) && statSync(voicePath).size > 0;
            }
          }
        } catch (err) {
          console.log(`  Voice regeneration failed: ${err}`);
        }
      }

      if (!imageDownloaded) {
        console.log(`  Image download failed after ${maxRetries} retries, regenerating...`);
        try {
          const regenRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/projects/${id}/scenes/${scene.id}/generate-image`, {
            method: "POST",
          });
          if (regenRes.ok) {
            const regenData = await regenRes.json();
            if (regenData.imageUrl) {
              await downloadFile(regenData.imageUrl, imagePath);
              imageDownloaded = existsSync(imagePath) && statSync(imagePath).size > 0;
            }
          }
        } catch (err) {
          console.log(`  Image regeneration failed: ${err}`);
        }
      }

      if (!voiceDownloaded || !imageDownloaded) {
        console.log(`  FAILED: Could not get valid assets for scene ${i + 1}`);
        continue;
      }

      downloadedAssets.push({ voicePath, imagePath, scene, index: i });
    }

    if (downloadedAssets.length === 0) {
      await prisma.project.update({
        where: { id },
        data: { status: "ASSETS_GENERATED" },
      });
      return NextResponse.json({ error: "No valid assets could be downloaded for any scene" }, { status: 400 });
    }

    console.log(`=== PHASE 2: Rendering ${downloadedAssets.length} segments ===`);

    for (const asset of downloadedAssets) {
      const { voicePath, imagePath, scene, index } = asset;
      const segmentPath = join(tempDir, `segment_${index}.mp4`);
      const voiceDuration = scene.voiceLength || 5;

      console.log(`Rendering segment ${index + 1}/${downloadedAssets.length} (${voiceDuration}s)...`);

      try {
        await runFFmpeg([
          "-y",
          "-loop", "1",
          "-i", imagePath,
          "-i", voicePath,
          "-filter_complex",
          "[0:v]scale=1920:1080,setsar=1,fps=30[scaled]",
          "-map", "[scaled]",
          "-map", "1:a",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          "-t", String(voiceDuration),
          segmentPath,
        ]);

        segments.push(segmentPath);
        console.log(`  Segment ${index + 1} rendered successfully`);
      } catch (err) {
        console.error(`  FFmpeg error for segment ${index + 1}: ${err}`);
      }

      try {
        if (existsSync(voicePath)) unlinkSync(voicePath);
        if (existsSync(imagePath)) unlinkSync(imagePath);
      } catch (e) {}
    }

    if (segments.length === 0) {
      await prisma.project.update({
        where: { id },
        data: { status: "ASSETS_GENERATED" },
      });
      return NextResponse.json({ error: "No valid segments to render" }, { status: 400 });
    }

    console.log(`Concatenating ${segments.length} segments...`);
    
    const concatListPath = join(tempDir, "concat.txt");
    const concatListContent = segments.map(s => `file '${s}'`).join("\n");
    
    writeFileSync(concatListPath, concatListContent);

    const outputPath = join(projectRenderDir, `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp4`);

    await runFFmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "22",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      outputPath,
    ]);

    unlinkSync(concatListPath);

    for (const seg of segments) {
      if (existsSync(seg)) unlinkSync(seg);
    }

    const stats = statSync(outputPath);

    const renderOutput = await prisma.renderOutput.create({
      data: {
        projectId: id,
        filepath: `/renders/${id}/${outputPath.split("/").pop()}`,
        durationSec: project.scenes.reduce((acc, s) => acc + (s.voiceLength || 5), 0),
        filesizeBytes: stats.size,
      },
    });

    await prisma.project.update({
      where: { id },
      data: { status: "COMPLETE" },
    });

    return NextResponse.json({
      message: "Render complete",
      renderOutput,
    });
  } catch (error) {
    console.error("Render error:", error);
    
    await prisma.project.update({
      where: { id: (await params).id },
      data: { status: "IMAGES_DONE" },
    }).catch(() => {});

    return NextResponse.json(
      { error: `Render failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
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

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
      include: { renderOutput: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project.renderOutput);
  } catch (error) {
    console.error("Get render status error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}