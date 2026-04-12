"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface VisualBible {
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
  visualBible: VisualBible | null;
}

const NARRATIVE_STYLES = [
  { value: "historical", label: "Historical", desc: "Tokoh sejarah + pelajaran produktivitas" },
  { value: "medical", label: "Medical", desc: "Explainer kesehatan/sains" },
  { value: "productivity", label: "Productivity", desc: "Self-help modern, tip praktis" },
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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: project?.title,
          narrativeStyle,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data.script);
        await handleSave();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertToScenes = async () => {
    if (!script.trim()) {
      alert("Please generate or enter a script first");
      return;
    }

    const confirmed = confirm(
      "Convert script to scenes? This will replace existing scenes."
    );
    if (!confirmed) return;

    setConverting(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/convert-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          script,
          styleAnchorTokens: project?.visualBible?.styleAnchorTokens || "",
          characters: project?.visualBible?.characters || "[]",
          environments: project?.visualBible?.environments || "[]",
        }),
      });

      if (res.ok) {
        alert("Scenes created successfully!");
        router.push(`/member/${params.id}/scenes`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to convert script");
      }
    } finally {
      setConverting(false);
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
          <Button onClick={handleGenerate} disabled={generating}>
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

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Target Duration</h3>
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="8">8 minutes</option>
              <option value="10" selected>10 minutes</option>
              <option value="12">12 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleConvertToScenes}
            disabled={converting || !script.trim()}
          >
            {converting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Converting...
              </>
            ) : (
              "→ Convert to Scenes"
            )}
          </Button>
        </div>

        {/* Script Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Script Content</h3>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your script here or generate with AI..."
              className="min-h-[500px] w-full resize-none border-0 bg-transparent p-4 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
