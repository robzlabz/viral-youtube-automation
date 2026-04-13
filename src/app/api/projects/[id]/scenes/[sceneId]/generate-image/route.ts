import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

function safeParseJson(value: unknown, fallback: string[]): string[] {
  if (!value) return fallback;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
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
      include: { visualImage: true },
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

    if (!scene.imagePrompt) {
      return NextResponse.json({ error: "Scene image prompt is empty" }, { status: 400 });
    }

    const runwareApiKey = process.env.RUNWARE_API_KEY;
    const runwareUrl = process.env.RUNWARE_URL || "https://api.runware.ai/v1";
    const negativeRules = safeParseJson(project.visualImage?.negativeRules, []);
    const styleTokens = (project.visualImage?.styleAnchorTokens as string) || "";
    const negativePrompt = negativeRules.length > 0 ? negativeRules.join(", ") : "text, watermark, typography";

    const imagePrompt = `${scene.imagePrompt}, ${styleTokens}, ${negativePrompt}`;

    await prisma.scene.update({
      where: { id: sceneId },
      data: { status: "IMAGE_GENERATING" },
    });

    const response = await fetch(`${runwareUrl}/image/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runwareApiKey}`,
      },
      body: JSON.stringify([{
        taskUUID: randomUUID(),
        taskType: "imageInference",
        model: "runware:400@4",
        positivePrompt: imagePrompt,
        num_images: 1,
        output_format: "png",
        width: 1024,
        height: 576,
      }]),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Runware API error:", error);
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "PENDING" },
      });
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.imageURL;

    if (!imageUrl) {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "PENDING" },
      });
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    await prisma.scene.update({
      where: { id: sceneId },
      data: {
        imageFilePath: imageUrl,
        status: "IMAGE_DONE",
      },
    });

    return NextResponse.json({
      message: "Image generated",
      sceneId,
      imageUrl,
      status: "IMAGE_DONE",
    });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
