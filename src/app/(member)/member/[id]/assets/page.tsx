"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

type GenerationType = "voice" | "image" | null;

const VOICE_OPTIONS = [
  { value: "leo", label: "Leo", desc: "Male" },
  { value: "eve", label: "Eve", desc: "Female" },
  { value: "una", label: "Una", desc: "Female" },
  { value: "ara", label: "Ara", desc: "Female" },
  { value: "sal", label: "Sal", desc: "Male" },
  { value: "rex", label: "Rex", desc: "Male" },
];

export default function AssetsPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<GenerationType>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(-1);
  const [progress, setProgress] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("leo");

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

  const handleGenerateVoices = async () => {
    if (!project) return;

    const scenesNeedingVoice = project.scenes.filter((s) => !s.voiceFilePath && s.text);
    if (scenesNeedingVoice.length === 0) {
      alert("No scenes with text need voice generation");
      return;
    }

    setGenerating("voice");
    setCurrentSceneIndex(-1);

    for (let i = 0; i < scenesNeedingVoice.length; i++) {
      const scene = scenesNeedingVoice[i];
      setCurrentSceneIndex(i);
      setProgress(`Generating voice for scene ${i + 1}/${scenesNeedingVoice.length}...`);

      try {
        const res = await fetch(
          `/api/projects/${params.id}/scenes/${scene.id}/generate-voice`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice: selectedVoice }),
            credentials: "include",
          }
        );

        if (!res.ok) {
          const data = await res.json();
          alert(`Failed to generate voice for scene ${i + 1}: ${data.error}`);
          break;
        }

        await fetchProject();
      } catch (err) {
        alert(`Error generating voice: ${err}`);
        break;
      }
    }

    setGenerating(null);
    setCurrentSceneIndex(-1);
    setProgress("");
  };

  const handleRegenerateVoice = async (sceneId: string) => {
    if (generating) return;
    setGenerating("voice");
    setProgress("Regenerating voice...");

    try {
      const res = await fetch(
        `/api/projects/${params.id}/scenes/${sceneId}/generate-voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice: selectedVoice }),
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to regenerate voice: ${data.error}`);
      }

      await fetchProject();
    } catch (err) {
      alert(`Error regenerating voice: ${err}`);
    } finally {
      setGenerating(null);
      setProgress("");
    }
  };

  const handleRegenerateImage = async (sceneId: string) => {
    if (generating) return;
    setGenerating("image");
    setProgress("Regenerating image...");

    try {
      const res = await fetch(
        `/api/projects/${params.id}/scenes/${sceneId}/generate-image`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to regenerate image: ${data.error}`);
      }

      await fetchProject();
    } catch (err) {
      alert(`Error regenerating image: ${err}`);
    } finally {
      setGenerating(null);
      setProgress("");
    }
  };

  const handleGenerateImages = async () => {
    if (!project) return;

    const scenesNeedingImage = project.scenes.filter((s) => !s.imageFilePath && s.imagePrompt);
    if (scenesNeedingImage.length === 0) {
      alert("No scenes with prompts need image generation");
      return;
    }

    setGenerating("image");
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

    setGenerating(null);
    setCurrentSceneIndex(-1);
    setProgress("");
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
  const totalVoiceLength = project.scenes.reduce(
    (acc, s) => acc + (s.voiceLength || 0),
    0
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/member/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Project
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Assets</h1>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">Voices</p>
              <p className="text-2xl font-bold">
                {voicesReady}/{project.scenes.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: {formatDuration(totalVoiceLength)}
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                disabled={generating !== null}
              >
                {VOICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleGenerateVoices}
                disabled={generating !== null || project.scenes.length === 0}
              >
                {generating === "voice" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {progress}
                  </span>
                ) : (
                  "🔊 Generate Voices"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Images</p>
              <p className="text-2xl font-bold">
                {imagesReady}/{project.scenes.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {imagesReady === project.scenes.length ? "All ready" : "Pending"}
              </p>
            </div>
            <Button
              onClick={handleGenerateImages}
              disabled={generating !== null || project.scenes.length === 0}
            >
              {generating === "image" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {progress}
                </span>
              ) : (
                "🖼️ Generate Images"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Scene List */}
      {project.scenes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <p className="text-muted-foreground">
            No scenes yet. Go to Scenes page to add scenes first.
          </p>
          <Link href={`/member/${params.id}/scenes`}>
            <Button className="mt-4">Go to Scenes</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {project.scenes.map((scene, idx) => (
            <div
              key={scene.id}
              className={`rounded-xl border bg-card overflow-hidden ${
                generating && currentSceneIndex === idx - 1 ? "border-primary ring-1 ring-primary/20" : "border-border"
              }`}
            >
              {/* Scene Header */}
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {scene.sceneIndex + 1}
                    </span>
                    <span className="text-sm font-medium">Scene {scene.sceneIndex + 1}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                      scene.voiceFilePath ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {scene.voiceFilePath ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      ) : "○"}
                      Voice {scene.voiceFilePath ? "Ready" : "Pending"}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                      scene.imageFilePath ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {scene.imageFilePath ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      ) : "○"}
                      Image {scene.imageFilePath ? "Ready" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scene Content */}
              <div className="p-5">
                {/* Script Text */}
                <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
                  {scene.text || "No script text available"}
                </p>

                {/* Assets Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Voice Card */}
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Voice</p>
                          <p className="text-xs text-muted-foreground">
                            {scene.voiceFilePath ? formatDuration(scene.voiceLength) : "Not generated"}
                          </p>
                        </div>
                      </div>
                      {scene.voiceFilePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateVoice(scene.id)}
                          disabled={generating !== null}
                          className="text-xs h-7"
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate
                        </Button>
                      )}
                    </div>
                    {scene.voiceFilePath ? (
                      <audio
                        controls
                        src={scene.voiceFilePath}
                        className="h-10 w-full"
                      />
                    ) : (
                      <div className="flex h-10 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        {generating === "voice" && currentSceneIndex === idx ? "Generating..." : "No voice yet"}
                      </div>
                    )}
                  </div>

                  {/* Image Card */}
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Image</p>
                          <p className="text-xs text-muted-foreground">AI Generated</p>
                        </div>
                      </div>
                      {scene.imageFilePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateImage(scene.id)}
                          disabled={generating !== null}
                          className="text-xs h-7"
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate
                        </Button>
                      )}
                    </div>
                    {scene.imageFilePath ? (
                      <div className="relative overflow-hidden rounded-lg border border-border">
                        <img
                          src={scene.imageFilePath}
                          alt={`Scene ${scene.sceneIndex + 1}`}
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        {generating === "image" && currentSceneIndex === idx ? "Generating..." : "No image yet"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
