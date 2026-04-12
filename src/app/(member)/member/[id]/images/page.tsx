"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2 } from "lucide-react";

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

interface Project {
  id: string;
  title: string;
  scenes: Scene[];
}

function EditPromptModal({
  isOpen,
  onClose,
  sceneIndex,
  initialPrompt,
  onSave,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneIndex: number;
  initialPrompt: string;
  onSave: (prompt: string) => void;
  saving: boolean;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Edit Scene {sceneIndex + 1} Image Prompt</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="h-64 w-full rounded-lg border border-border bg-background p-3 text-sm resize-none"
          placeholder="Enter image prompt..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(prompt)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GenerateImageModal({
  isOpen,
  onClose,
  sceneIndex,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneIndex: number;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Generate Image</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Generate image for Scene {sceneIndex + 1}?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ImagesPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(-1);
  const [progress, setProgress] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<{ id: string; prompt: string; sceneIndex: number } | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [generatingScene, setGeneratingScene] = useState<{ id: string; sceneIndex: number } | null>(null);

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
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async (prompt: string) => {
    if (!editingPrompt) return;
    setSavingPrompt(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/scenes/${editingPrompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imagePrompt: prompt }),
      });
      if (res.ok) {
        setEditingPrompt(null);
        await fetchProject();
      }
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!project) return;

    const scenesNeedingImage = project.scenes.filter((s) => !s.imageFilePath && s.imagePrompt);
    if (scenesNeedingImage.length === 0) {
      alert("No scenes with prompts need image generation");
      return;
    }

    setGenerating(true);
    setCurrentSceneIndex(-1);

    for (let i = 0; i < scenesNeedingImage.length; i++) {
      const scene = scenesNeedingImage[i];
      setCurrentSceneIndex(i);
      setProgress(`Generating image for scene ${i + 1}/${scenesNeedingImage.length}...`);

      try {
        const res = await fetch(
          `/api/projects/${params.id}/scenes/${scene.id}/generate-image`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!res.ok) {
          const data = res.json ? await res.json() : { error: "Failed" };
          alert(`Failed to generate image for scene ${i + 1}: ${data.error}`);
          break;
        }

        await fetchProject();
      } catch (err) {
        alert(`Error generating image: ${err}`);
        break;
      }
    }

    setGenerating(false);
    setCurrentSceneIndex(-1);
    setProgress("");
  };

  const handleGenerate = (sceneId: string, sceneIndex: number) => {
    if (generating) return;
    setGeneratingScene({ id: sceneId, sceneIndex });
  };

  const handleGenerateConfirm = async () => {
    if (!generatingScene) return;

    setGenerating(true);
    setProgress("Generating...");

    try {
      const res = await fetch(
        `/api/projects/${params.id}/scenes/${generatingScene.id}/generate-image`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to generate image: ${data.error}`);
      }

      await fetchProject();
    } catch (err) {
      alert(`Error generating image: ${err}`);
    } finally {
      setGenerating(false);
      setProgress("");
      setGeneratingScene(null);
    }
  };

  const handleRegenerate = (sceneId: string, sceneIndex: number) => {
    if (generating) return;
    setGeneratingScene({ id: sceneId, sceneIndex });
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

  const imagesReady = project.scenes.filter((s) => s.imageFilePath).length;

  return (
    <div className="mx-auto max-w-5xl">
      <EditPromptModal
        isOpen={editingPrompt !== null}
        onClose={() => setEditingPrompt(null)}
        sceneIndex={editingPrompt?.sceneIndex ?? 0}
        initialPrompt={editingPrompt?.prompt ?? ""}
        onSave={handleSavePrompt}
        saving={savingPrompt}
      />

      <GenerateImageModal
        isOpen={generatingScene !== null}
        onClose={() => setGeneratingScene(null)}
        sceneIndex={generatingScene?.sceneIndex ?? 0}
        onConfirm={handleGenerateConfirm}
        loading={generating}
      />

      <div className="mb-6">
        <Link
          href={`/member/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Project
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Images</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold">{imagesReady}/{project.scenes.length}</p>
              </div>
              {imagesReady === project.scenes.length && project.scenes.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  All Complete
                </span>
              )}
            </div>
            <Button onClick={handleGenerateAll} disabled={generating || project.scenes.length === 0}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {progress}
                </span>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Generate All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {project.scenes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No scenes yet. Go to Scenes page to add scenes first.
            </p>
            <Link href={`/member/${params.id}/scenes`}>
              <Button className="mt-4">Go to Scenes</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {project.scenes.map((scene, idx) => (
            <Card key={scene.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {scene.sceneIndex + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`flex-1 text-sm ${scene.imagePrompt ? "text-foreground" : "text-muted-foreground"}`}>
                        {scene.imagePrompt || "No image prompt"}
                      </p>
                      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                        {scene.imageFilePath ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerate(scene.id, scene.sceneIndex)}
                            disabled={generating}
                            title="Regenerate image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGenerate(scene.id, scene.sceneIndex)}
                            disabled={generating}
                            title="Generate image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPrompt({ id: scene.id, prompt: scene.imagePrompt || "", sceneIndex: scene.sceneIndex })}
                          disabled={generating}
                          title="Edit prompt"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {scene.imageFilePath && (
                      <div className="mt-3">
                        <img
                          src={scene.imageFilePath}
                          alt={`Scene ${scene.sceneIndex + 1}`}
                          className="h-48 w-auto rounded-lg border border-border object-cover"
                        />
                      </div>
                    )}
                    {!scene.imageFilePath && (
                      <div className="mt-3">
                        {generating && currentSceneIndex === idx ? (
                          <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <span className="flex items-center gap-2 text-sm text-primary">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              Generating...
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
                            Image not generated
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}