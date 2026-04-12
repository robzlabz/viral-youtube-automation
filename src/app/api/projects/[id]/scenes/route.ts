import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

async function getUserFromRequest(request: Request) {
  const token = getTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
      include: {
        scenes: { orderBy: { sceneIndex: "asc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project.scenes);
  } catch (error) {
    console.error("GET scenes error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { text, imagePrompt } = await request.json();

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
      include: { scenes: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const nextIndex = project.scenes.length;

    const scene = await prisma.scene.create({
      data: {
        projectId: id,
        sceneIndex: nextIndex,
        text: text || "",
        imagePrompt: imagePrompt || "",
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error("POST scenes error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
