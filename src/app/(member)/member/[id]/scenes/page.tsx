"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  return `${seconds.toFixed(2)}s`;
}

function getSceneStatusIcon(scene: Scene) {
  const voiceDone = !!scene.voiceFilePath;
  const imageDone = !!scene.imageFilePath;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={voiceDone ? "text-green-600" : "text-muted-foreground"}>
        🔊{voiceDone ? "✓" : "○"}
      </span>
      <span className={imageDone ? "text-green-600" : "text-muted-foreground"}>
        🖼{imageDone ? "✓" : "○"}
      </span>
    </div>
  );
}

function ScenesContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<{ id: string; title: string; scenes: Scene[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedPollingRef = useRef(false);

  const isConverting = searchParams.get("converting") === "true";

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsGenerating(false);
    setShowBanner(false);
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setGeneratedCount(data.scenes?.length || 0);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const startPolling = useCallback(() => {
    if (hasStartedPollingRef.current) return;
    hasStartedPollingRef.current = true;
    setIsGenerating(true);
    setGeneratedCount(0);

    pollingRef.current = setInterval(async () => {
      try {
        // Poll the convert-script status endpoint
        const res = await fetch(`/api/projects/${params.id}/convert-script?action=status`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();

          setGeneratedCount(data.scenes?.length || 0);

          // Update project data
          setProject((prev) => prev ? { ...prev, scenes: data.scenes, status: data.status } : prev);

          // Stop polling when conversion is done or error
          if (data.status === "done" || data.status === "error") {
            stopPolling();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  }, [params.id, stopPolling]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Start polling when converting param is present
  useEffect(() => {
    if (isConverting) {
      setShowBanner(true);
      if (!hasStartedPollingRef.current) {
        const timer = setTimeout(() => {
          startPolling();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isConverting, startPolling]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleAddScene = async () => {
    await fetch(`/api/projects/${params.id}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: "", imagePrompt: "" }),
    });
    fetchProject();
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm("Delete this scene?")) return;
    await fetch(`/api/projects/${params.id}/scenes/${sceneId}`, {
      method: "DELETE",
      credentials: "include",
    });
    fetchProject();
  };

  const handleSaveScene = async () => {
    if (!editingScene) return;
    await fetch(`/api/projects/${params.id}/scenes/${editingScene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text: editingScene.text,
        imagePrompt: editingScene.imagePrompt,
      }),
    });
    setEditingScene(null);
    fetchProject();
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

  const scenes = project.scenes || [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/member/${params.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Project
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Scenes ({scenes.length})
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddScene}>
            + Add Scene
          </Button>
        </div>
      </div>

      {/* Generation Progress Banner */}
      {showBanner && (
        <div className="mb-6 rounded-lg border border-primary/50 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">AI is generating scenes...</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {generatedCount} scene{generatedCount !== 1 ? "s" : ""} created
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: "100%" }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Scenes will appear below as they are generated. This may take a moment.
          </p>
        </div>
      )}

      {scenes.length === 0 && !isGenerating ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <p className="text-muted-foreground">No scenes yet. Add one to get started.</p>
          <Button className="mt-4" onClick={handleAddScene}>
            + Add First Scene
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium">
                    {scene.sceneIndex + 1}
                  </span>
                  {getSceneStatusIcon(scene)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingScene(scene)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteScene(scene.id)}
                  >
                    🗑️
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Narration</p>
                  <p className="text-sm">{scene.text || <span className="italic text-muted-foreground">No text</span>}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Image Prompt</p>
                  <p className="text-sm">{scene.imagePrompt || <span className="italic text-muted-foreground">No prompt</span>}</p>
                </div>
              </div>

              {scene.voiceLength && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Voice: {formatDuration(scene.voiceLength)}
                </p>
              )}
            </div>
          ))}

          {/* Loading placeholder for scenes being generated */}
          {isGenerating && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 animate-pulse">
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Waiting for next scene...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Scene Modal */}
      {editingScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold">
                Edit Scene #{editingScene.sceneIndex + 1}
              </h2>
            </div>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Text (Narration)</Label>
                <textarea
                  value={editingScene.text}
                  onChange={(e) =>
                    setEditingScene({ ...editingScene, text: e.target.value })
                  }
                  className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Narration text in Indonesian..."
                />
              </div>
              <div className="space-y-2">
                <Label>Image Prompt</Label>
                <textarea
                  value={editingScene.imagePrompt}
                  onChange={(e) =>
                    setEditingScene({ ...editingScene, imagePrompt: e.target.value })
                  }
                  className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Image generation prompt in English..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border p-4">
              <Button variant="outline" onClick={() => setEditingScene(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveScene}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScenesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <ScenesContent />
    </Suspense>
  );
}
