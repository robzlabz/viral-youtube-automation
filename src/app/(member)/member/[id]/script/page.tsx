"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface VisualImage {
  id: string;
  characters: string;
  environments: string;
  colorPalette: string;
  styleAnchorTokens: string;
}

interface Project {
  id: string;
  title: string;
  script: string | null;
  narrativeStyle: string;
  status: string;
  visualImage: VisualImage | null;
}

const NARRATIVE_STYLES = [
  { value: "historical", label: "Historical", desc: "Tokoh sejarah + pelajaran produktivitas" },
  { value: "medical", label: "Medical", desc: "Explainer kesehatan/sains" },
  { value: "productivity", label: "Productivity", desc: "Self-help modern, tip praktis" },
];

const DURATION_OPTIONS = [
  { value: 5, label: "5 min", icon: "⚡" },
  { value: 10, label: "10 min", icon: "⏱️" },
  { value: 15, label: "15 min", icon: "🕐" },
  { value: 30, label: "30 min", icon: "⏰" },
  { value: 60, label: "1 hour", icon: "⏳" },
];

const GENERATION_STEPS = [
  "Analyzing topic...",
  "Researching key points...",
  "Creating narrative structure...",
  "Writing dialogue...",
  "Adding scene transitions...",
  "Finalizing script...",
];

export default function ScriptEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [script, setScript] = useState("");
  const [narrativeStyle, setNarrativeStyle] = useState("productivity");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [generateTitle, setGenerateTitle] = useState("");
  const [generateDescription, setGenerateDescription] = useState("");
  const [targetDuration, setTargetDuration] = useState<number>(10);

  // Real-time generation progress
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const scriptRef = useRef<HTMLTextAreaElement>(null);

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
        setScript(data.script || "");
        setNarrativeStyle(data.narrativeStyle || "productivity");
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ script, narrativeStyle }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTargetDuration = async (duration: number) => {
    try {
      await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetDuration: duration }),
      });
    } catch (err) {
      console.error("Failed to save target duration:", err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationProgress(5);
    setGenerationStatus(GENERATION_STEPS[0]);
    setCurrentStep(0);
    setScript("");
    setShowGenerateModal(false);

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % GENERATION_STEPS.length;
      setCurrentStep(stepIndex);
      setGenerationStatus(GENERATION_STEPS[stepIndex]);
      setGenerationProgress(Math.min(90, 10 + stepIndex * 12));
    }, 4000);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: generateTitle || project?.title,
          description: generateDescription,
          narrativeStyle,
          targetDuration,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullScript = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullScript += chunk;
          setScript(fullScript);
          setGenerationProgress(95);
        }
      }

      setScript(fullScript);
      setGenerationProgress(100);
      setGenerationStatus("Generation complete!");
      await handleSave();
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationStatus("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertToVisual = () => {
    if (!script.trim()) return;
    setShowConvertModal(false);
    // Redirect to visual page
    router.push(`/member/${params.id}/visual`);
  };

  const handleConvertToScenes = async () => {
    if (!script.trim()) return;

    setShowConvertModal(false);
    setConverting(true);

    // Start conversion
    const res = await fetch(`/api/projects/${params.id}/convert-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        script,
        styleAnchorTokens: project?.visualImage?.styleAnchorTokens || "",
        characters: project?.visualImage?.characters || "[]",
        environments: project?.visualImage?.environments || "[]",
      }),
    });

    if (res.ok) {
      router.push(`/member/${params.id}/scenes?converting=true`);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to start conversion");
      setConverting(false);
    }
  };

  const openConvertModal = () => {
    if (!script.trim()) return;
    setShowConvertModal(true);
  };

  const openGenerateModal = () => {
    setGenerateTitle(project?.title || "");
    setGenerateDescription("");
    setTargetDuration(10);
    setShowGenerateModal(true);
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/member/${params.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Project
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Script Editor</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={openGenerateModal} disabled={generating}>
            {generating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Video Title</Label>
                <p className="text-sm text-muted-foreground">{project.title}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="narrativeStyle">Narrative Style</Label>
                <select
                  id="narrativeStyle"
                  value={narrativeStyle}
                  onChange={(e) => setNarrativeStyle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {NARRATIVE_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {NARRATIVE_STYLES.find((s) => s.value === narrativeStyle)?.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Target Duration - Card Pick */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Target Duration</h3>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTargetDuration(opt.value);
                    handleSaveTargetDuration(opt.value);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    targetDuration === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={openConvertModal}
            disabled={converting || !script.trim()}
          >
            {converting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Converting...
              </>
            ) : (
              "→ Next: Visual Style"
            )}
          </Button>
        </div>

        {/* Script Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Script Content</h3>
              {generating && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  {generationStatus}
                </div>
              )}
            </div>

            {/* Generation Progress */}
            {generating && (
              <div className="px-4 py-3 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">{generationStatus}</span>
                  <span className="text-xs text-muted-foreground">{generationProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {GENERATION_STEPS.map((step, idx) => (
                    <span
                      key={step}
                      className={`text-[10px] ${
                        idx <= currentStep ? "text-primary font-medium" : "text-muted-foreground/50"
                      }`}
                    >
                      {step.split("...")[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <textarea
              ref={scriptRef}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your script here or generate with AI..."
              className="min-h-[500px] w-full resize-none border-0 bg-transparent p-4 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Script with AI</DialogTitle>
            <DialogDescription>
              Tell us about the story you want to create. The more detail you provide, the better the script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="genTitle">Story Title</Label>
              <Input
                id="genTitle"
                placeholder="e.g., Ibnu Sina dan Kesabarannya"
                value={generateTitle}
                onChange={(e) => setGenerateTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use project title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="genDesc">Story Description</Label>
              <textarea
                id="genDesc"
                placeholder="Describe the story in detail. Include main characters, key events, moral lessons, and any specific scenes you want to include..."
                value={generateDescription}
                onChange={(e) => setGenerateDescription(e.target.value)}
                className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Be as detailed as possible for better results
              </p>
            </div>

            <div className="space-y-2">
              <Label>Target Duration</Label>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTargetDuration(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      targetDuration === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || (!generateTitle.trim() && !project?.title)}
            >
              {generating ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Generate Script
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Visual/Style Confirmation Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to Continue</DialogTitle>
            <DialogDescription>
              Click "Continue" to go to Visual Style page to review characters, environments, and other visual settings before creating scenes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertToVisual}>
              Continue to Visual Style
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
