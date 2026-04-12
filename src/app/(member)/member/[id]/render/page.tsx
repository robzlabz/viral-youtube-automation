"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Scene {
  id: string;
  sceneIndex: number;
  text: string;
  voiceFilePath: string | null;
  voiceLength: number | null;
  imageFilePath: string | null;
}

interface Project {
  id: string;
  title: string;
  status: string;
  scenes: Scene[];
  renderOutput: { filepath: string; durationSec: number; filesizeBytes: number } | null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RenderPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchProject();
  }, []);

  const handleDownload = () => {
    if (!project?.renderOutput?.filepath) return;
    const link = document.createElement("a");
    link.href = `${window.location.origin}${project.renderOutput.filepath}`;
    link.download = project.title.replace(/[^a-zA-Z0-9]/g, "_") + ".mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
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
      </div>
    );
  }

  const voicesReady = project.scenes.filter((s) => s.voiceFilePath).length;
  const imagesReady = project.scenes.filter((s) => s.imageFilePath).length;
  const totalVoiceLength = project.scenes.reduce((acc, s) => acc + (s.voiceLength || 0), 0);
  const canRender = voicesReady === project.scenes.length && imagesReady === project.scenes.length && project.scenes.length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/member/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Project
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Render Video</h1>
      </div>

      {/* Pre-render Checklist */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Pre-render Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {voicesReady === project.scenes.length && project.scenes.length > 0 ? (
              <span className="text-green-600">✅</span>
            ) : (
              <span className="text-muted-foreground">⏳</span>
            )}
            <span className="text-sm">
              {voicesReady}/{project.scenes.length} voices ready
              {totalVoiceLength > 0 && ` (total: ${formatDuration(totalVoiceLength)})`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {imagesReady === project.scenes.length && project.scenes.length > 0 ? (
              <span className="text-green-600">✅</span>
            ) : (
              <span className="text-muted-foreground">⏳</span>
            )}
            <span className="text-sm">
              {imagesReady}/{project.scenes.length} images ready
            </span>
          </div>
          <div className="flex items-center gap-3">
            {project.scenes.length > 0 ? (
              <span className="text-green-600">✅</span>
            ) : (
              <span className="text-muted-foreground">⏳</span>
            )}
            <span className="text-sm">{project.scenes.length} scenes defined</span>
          </div>
        </CardContent>
      </Card>

      {/* Render Status */}
      {project.renderOutput ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>✅ Video Ready!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span>{formatDuration(project.renderOutput.durationSec)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File size</span>
                <span>{formatBytes(project.renderOutput.filesizeBytes)}</span>
              </div>
              <Button className="w-full" onClick={handleDownload}>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Video
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : rendering ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Rendering in progress...</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {canRender
                  ? `Ready to render ~${formatDuration(totalVoiceLength)} video`
                  : "Complete all scenes with voices and images to enable render"}
              </p>
              <Button
                size="lg"
                disabled={!canRender}
                onClick={async () => {
                  setRendering(true);
                  setProgress(0);
                  
                  const progressInterval = setInterval(async () => {
                    try {
                      const res = await fetch(`/api/projects/${params.id}/render`, {
                        credentials: "include",
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data && data.renderOutput) {
                          clearInterval(progressInterval);
                          setRendering(false);
                          fetchProject();
                        }
                      }
                    } catch (e) {
                      console.error("Progress check error:", e);
                    }
                  }, 2000);

                  try {
                    const res = await fetch(`/api/projects/${params.id}/render`, {
                      method: "POST",
                      credentials: "include",
                    });
                    
                    clearInterval(progressInterval);
                    
                    if (!res.ok) {
                      const data = await res.json();
                      alert(`Render failed: ${data.error}`);
                    }
                    
                    setRendering(false);
                    fetchProject();
                  } catch (err) {
                    clearInterval(progressInterval);
                    setRendering(false);
                    alert(`Render error: ${err}`);
                  }
                }}
              >
                ▶ Start Render
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Info */}
      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Output:</strong> 1920×1080 · H.264 · AAC · 30fps · Subtitle burned-in
        </p>
      </div>
    </div>
  );
}
