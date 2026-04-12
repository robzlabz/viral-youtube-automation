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

  // Render options
  const [transition, setTransition] = useState<"cut" | "fade" | "dissolve" | "wipe" | "slide">("dissolve");
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [effect, setEffect] = useState<"none" | "kenburns" | "panzoom" | "slowzoom" | "parallax">("kenburns");
  const [musicVolume, setMusicVolume] = useState(0);
  const [showMusic, setShowMusic] = useState(false);

  const TRANSITIONS = [
    { id: "cut", label: "Cut", icon: "✂️", desc: "Instant switch" },
    { id: "fade", label: "Fade", icon: "🌫️", desc: "Smooth fade" },
    { id: "dissolve", label: "Dissolve", icon: "💫", desc: "Cross dissolve" },
    { id: "wipe", label: "Wipe", icon: "➡️", desc: "Directional wipe" },
    { id: "slide", label: "Slide", icon: "↔️", desc: "Slide transition" },
  ] as const;

  const EFFECTS = [
    { id: "none", label: "None", icon: "⬜", desc: "Static image" },
    { id: "kenburns", label: "Ken Burns", icon: "🔍", desc: "Slow zoom & pan" },
    { id: "panzoom", label: "Pan & Zoom", icon: "🎯", desc: "Dynamic movement" },
    { id: "slowzoom", label: "Slow Zoom", icon: "🔎", desc: "Gentle zoom in/out" },
    { id: "parallax", label: "Parallax", icon: "🌌", desc: "Depth effect" },
  ] as const;

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

  // Summary data
  const scenesWithVoices = project.scenes.filter((s) => s.voiceFilePath);
  const scenesWithImages = project.scenes.filter((s) => s.imageFilePath);

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

      {/* Project Summary */}
      <Card className="mb-6 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Scenes */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <span className="text-3xl font-bold text-primary">{project.scenes.length}</span>
              <span className="text-xs text-muted-foreground mt-1">Total Scenes</span>
            </div>

            {/* Total Duration */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <span className="text-2xl font-bold text-foreground">{formatDuration(totalVoiceLength)}</span>
              <span className="text-xs text-muted-foreground mt-1">Total Duration</span>
            </div>

            {/* Voices Ready */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <span className="text-3xl font-bold text-green-600">{voicesReady}</span>
              <span className="text-xs text-muted-foreground mt-1">Voices Ready</span>
            </div>

            {/* Images Ready */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <span className="text-3xl font-bold text-orange-600">{imagesReady}</span>
              <span className="text-xs text-muted-foreground mt-1">Images Ready</span>
            </div>
          </div>

          {/* Scenes Breakdown */}
          {project.scenes.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Scenes Breakdown</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {project.scenes.map((scene, idx) => {
                  const hasVoice = !!scene.voiceFilePath;
                  const hasImage = !!scene.imageFilePath;
                  const voiceDur = scene.voiceLength ? formatDuration(scene.voiceLength) : "—";

                  return (
                    <div key={scene.id} className="flex items-center gap-3 text-sm p-2 rounded bg-muted/30">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {scene.text.substring(0, 50)}{scene.text.length > 50 ? "..." : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-xs ${hasVoice ? "text-green-600" : "text-muted-foreground"}`}>
                          {hasVoice ? "🔊" : "⏳"} {voiceDur}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${hasImage ? "text-green-600" : "text-muted-foreground"}`}>
                          {hasImage ? "🖼️" : "⏳"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estimated Output */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated Output</span>
            <span className="text-sm font-medium">1920×1080 · H.264 · AAC · 30fps</span>
          </div>
        </CardContent>
      </Card>

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

      {/* Effects & Transitions */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Effects & Transitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Transitions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Transition</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Duration</span>
                <select
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(Number(e.target.value))}
                  className="h-7 w-16 rounded border border-input bg-background px-2 text-xs"
                >
                  <option value={0.25}>0.25s</option>
                  <option value={0.5}>0.5s</option>
                  <option value={0.75}>0.75s</option>
                  <option value={1}>1s</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTransition(t.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    transition === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Effects */}
          <div>
            <label className="text-sm font-medium mb-2 block">Image Effect</label>
            <div className="grid grid-cols-5 gap-2">
              {EFFECTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEffect(e.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    effect === e.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{e.icon}</span>
                  <span className="text-xs font-medium">{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Music */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Background Music</label>
              <button
                onClick={() => setShowMusic(!showMusic)}
                className={`text-xs px-2 py-1 rounded ${
                  showMusic ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {showMusic ? "Enabled" : "Disabled"}
              </button>
            </div>
            {showMusic && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Select ambient music track for your video
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["Ambient", "Cinematic", "Emotional", "Upbeat", "Nature", "None"].map((track) => (
                    <button
                      key={track}
                      className="text-xs py-2 px-3 rounded border border-border hover:border-primary/50 transition-colors"
                    >
                      {track}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Volume: {Math.round(musicVolume * 100)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none bg-muted cursor-pointer"
                  />
                </div>
              </div>
            )}
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
