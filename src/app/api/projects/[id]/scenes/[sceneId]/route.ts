import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

async function getUserFromRequest(request: Request) {
  const token = getTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sceneId } = await params;
    const body = await request.json();

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        text: body.text,
        imagePrompt: body.imagePrompt,
        voiceFilePath: body.voiceFilePath,
        voiceLength: body.voiceLength,
        imageFilePath: body.imageFilePath,
        status: body.status,
      },
    });

    return NextResponse.json(scene);
  } catch (error) {
    console.error("PATCH scene error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sceneId } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.scene.delete({ where: { id: sceneId } });

    return NextResponse.json({ message: "Scene deleted" });
  } catch (error) {
    console.error("DELETE scene error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
