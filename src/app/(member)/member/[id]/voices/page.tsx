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

const VOICE_OPTIONS = [
  { value: "leo", label: "Leo", desc: "Male" },
  { value: "eve", label: "Eve", desc: "Female" },
  { value: "una", label: "Una", desc: "Female" },
  { value: "ara", label: "Ara", desc: "Female" },
  { value: "sal", label: "Sal", desc: "Male" },
  { value: "rex", label: "Rex", desc: "Male" },
];

function EditTextModal({
  isOpen,
  onClose,
  sceneIndex,
  initialText,
  onSave,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneIndex: number;
  initialText: string;
  onSave: (text: string) => void;
  saving: boolean;
}) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Edit Scene {sceneIndex + 1} Text</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-64 w-full rounded-lg border border-border bg-background p-3 text-sm resize-none"
          placeholder="Enter script text..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(text)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RegenerateVoiceModal({
  isOpen,
  onClose,
  sceneIndex,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneIndex: number;
  onConfirm: (voice: string) => void;
  loading: boolean;
}) {
  const [selectedVoice, setSelectedVoice] = useState("leo");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Regenerate Voice</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Select voice for Scene {sceneIndex + 1}:
        </p>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="mb-4 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {VOICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.desc}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selectedVoice)} disabled={loading}>
            {loading ? "Generating..." : "Regenerate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VoicesPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(-1);
  const [progress, setProgress] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("leo");
  const [editingScene, setEditingScene] = useState<{ id: string; text: string; sceneIndex: number } | null>(null);
  const [savingText, setSavingText] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<{ id: string; sceneIndex: number } | null>(null);

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

  const handleSaveText = async (text: string) => {
    if (!editingScene) return;
    setSavingText(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/scenes/${editingScene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setEditingScene(null);
        await fetchProject();
      }
    } finally {
      setSavingText(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!project) return;

    const scenesNeedingVoice = project.scenes.filter((s) => !s.voiceFilePath && s.text);
    if (scenesNeedingVoice.length === 0) {
      alert("No scenes with text need voice generation");
      return;
    }

    setGenerating(true);
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

    setGenerating(false);
    setCurrentSceneIndex(-1);
    setProgress("");
  };

  const handleRegenerate = (sceneId: string, sceneIndex: number) => {
    if (generating) return;
    setRegeneratingScene({ id: sceneId, sceneIndex });
  };

  const handleRegenerateConfirm = async (voice: string) => {
    if (!regeneratingScene) return;
    
    setGenerating(true);
    setProgress("Regenerating...");

    try {
      const res = await fetch(
        `/api/projects/${params.id}/scenes/${regeneratingScene.id}/generate-voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice }),
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
      setGenerating(false);
      setProgress("");
      setRegeneratingScene(null);
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
  const totalVoiceLength = project.scenes.reduce((acc, s) => acc + (s.voiceLength || 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <EditTextModal
        isOpen={editingScene !== null}
        onClose={() => setEditingScene(null)}
        sceneIndex={editingScene?.sceneIndex ?? 0}
        initialText={editingScene?.text ?? ""}
        onSave={handleSaveText}
        saving={savingText}
      />

      <RegenerateVoiceModal
        isOpen={regeneratingScene !== null}
        onClose={() => setRegeneratingScene(null)}
        sceneIndex={regeneratingScene?.sceneIndex ?? 0}
        onConfirm={handleRegenerateConfirm}
        loading={generating}
      />

      <div className="mb-6">
        <Link
          href={`/member/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Project
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Voices</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Voice Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold">{voicesReady}/{project.scenes.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="text-lg font-semibold">{formatDuration(totalVoiceLength)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                disabled={generating}
              >
                {VOICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
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
                      <p className={`flex-1 text-sm ${scene.text ? "text-foreground" : "text-muted-foreground"}`}>
                        {scene.text || "No script text"}
                      </p>
                      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                        {scene.voiceFilePath && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerate(scene.id, scene.sceneIndex)}
                            disabled={generating}
                            title="Regenerate voice"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingScene({ id: scene.id, text: scene.text || "", sceneIndex: scene.sceneIndex })}
                          disabled={generating}
                          title="Edit text"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {scene.voiceFilePath && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Duration: {formatDuration(scene.voiceLength)}
                        </p>
                        <audio
                          controls
                          src={scene.voiceFilePath}
                          className="h-10 w-full"
                        />
                      </div>
                    )}
                    {!scene.voiceFilePath && (
                      <div className="mt-2">
                        {generating && currentSceneIndex === idx ? (
                          <span className="flex items-center gap-2 text-sm text-primary">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Generating...
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Voice not generated</span>
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