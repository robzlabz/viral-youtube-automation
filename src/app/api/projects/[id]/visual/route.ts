import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

export async function PATCH(
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

    const project = await prisma.project.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const visualBible = await prisma.visualBible.update({
      where: { projectId: id },
      data: {
        characters: typeof body.characters === "string" ? body.characters : JSON.stringify(body.characters || []),
        environments: typeof body.environments === "string" ? body.environments : JSON.stringify(body.environments || []),
        colorPalette: typeof body.colorPalette === "string" ? body.colorPalette : JSON.stringify(body.colorPalette || []),
        cameraLanguage: body.cameraLanguage || "medium shot",
        negativeRules: typeof body.negativeRules === "string" ? body.negativeRules : JSON.stringify(body.negativeRules || ["no text", "no watermark", "no typography"]),
        styleAnchorTokens: body.styleAnchorTokens || "",
      },
    });

    return NextResponse.json(visualBible);
  } catch (error) {
    console.error("Update visual bible error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
