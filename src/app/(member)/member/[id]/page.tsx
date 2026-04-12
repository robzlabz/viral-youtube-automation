"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  title: string;
  status: string;
  styleChoice: string | null;
  narrativeStyle: string;
  script: string | null;
  scenes: Scene[];
  visualBible: VisualBible | null;
  renderOutput: { filepath: string; durationSec: number } | null;
}

interface Scene {
  id: string;
  sceneIndex: number;
  text: string;
  imagePrompt: string;
  voiceFilePath: string | null;
  voiceLength: number | null;
  imageFilePath: string | null;
  status: string;
}

interface VisualBible {
  id: string;
  characters: string;
  environments: string;
  colorPalette: string;
  styleAnchorTokens: string;
}

const STATUS_STEPS = [
  { key: "DRAFT", label: "Script" },
  { key: "SCRIPT_DONE", label: "Style" },
  { key: "SCENES_DONE", label: "Scenes" },
  { key: "VOICES_DONE", label: "Voices" },
  { key: "IMAGES_DONE", label: "Bible" },
  { key: "RENDERING", label: "Render" },
  { key: "COMPLETE", label: "Done" },
];

function getStatusIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function isStepComplete(idx: number, statusIdx: number): boolean {
  if (statusIdx === STATUS_STEPS.length - 1) {
    return idx <= statusIdx;
  }
  return idx < statusIdx;
}

function isStepCurrent(idx: number, statusIdx: number): boolean {
  if (statusIdx === STATUS_STEPS.length - 1) return false;
  return idx === statusIdx;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else if (res.status === 404) {
        router.push("/member/projects");
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/member/projects">
          <Button variant="outline" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const statusIdx = getStatusIndex(project.status);
  const totalVoiceLength = project.scenes.reduce((acc, s) => acc + (s.voiceLength || 0), 0);
  const voicesDone = project.scenes.filter((s) => s.voiceFilePath).length;
  const imagesDone = project.scenes.filter((s) => s.imageFilePath).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link href="/member/projects" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Projects
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.scenes.length} scenes ·{" "}
            {Math.floor(totalVoiceLength / 60)}m {Math.floor(totalVoiceLength % 60)}s ·{" "}
            {project.narrativeStyle}
          </p>
        </div>
      </div>

      {/* Pipeline Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="mb-4 text-sm font-medium text-foreground">Pipeline Progress</p>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, idx) => {
              const complete = isStepComplete(idx, statusIdx);
              const current = isStepCurrent(idx, statusIdx);
              const pending = !complete && !current;

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        complete
                          ? "bg-primary text-primary-foreground"
                          : current
                          ? "bg-primary/20 text-primary border-2 border-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {complete && !current ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs ${
                        pending ? "text-muted-foreground" : "text-foreground font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 min-w-[24px] flex-1 ${
                        complete ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {project.status === "DRAFT" && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <strong>Next:</strong> Generate script with AI or write manually
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        <Link href={`/member/${project.id}/script`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">✏️</div>
              <p className="text-sm font-medium">Script</p>
              <p className="text-xs text-muted-foreground">
                {project.script ? "Edit" : "Write"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/member/${project.id}/scenes`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">🎬</div>
              <p className="text-sm font-medium">Scenes</p>
              <p className="text-xs text-muted-foreground">
                {project.scenes.length} scenes
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/member/${project.id}/visual`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">🎨</div>
              <p className="text-sm font-medium">Visual</p>
              <p className="text-xs text-muted-foreground">Style & chars</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/member/${project.id}/voices`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">🔊</div>
              <p className="text-sm font-medium">Voices</p>
              <p className="text-xs text-muted-foreground">
                {voicesDone}/{project.scenes.length}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/member/${project.id}/images`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">🖼️</div>
              <p className="text-sm font-medium">Images</p>
              <p className="text-xs text-muted-foreground">
                {imagesDone}/{project.scenes.length}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/member/${project.id}/render`}>
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-2 text-2xl">▶️</div>
              <p className="text-sm font-medium">Render</p>
              <p className="text-xs text-muted-foreground">
                {project.renderOutput ? "Done" : "Start"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Render Output */}
      {project.renderOutput && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rendered Video</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Duration: {Math.floor(project.renderOutput.durationSec / 60)}m{" "}
                {Math.floor(project.renderOutput.durationSec % 60)}s
              </div>
              <Button size="sm">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
