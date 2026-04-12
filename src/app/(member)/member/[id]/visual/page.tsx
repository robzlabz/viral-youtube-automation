"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Edit2, Check } from "lucide-react";

interface VisualBible {
  id: string;
  characters: string | any[];
  environments: string | any[];
  colorPalette: string | any[];
  cameraLanguage: string;
  negativeRules: string | any[];
  styleAnchorTokens: string;
  aspectRatio: string;
}

interface Project {
  id: string;
  title: string;
  styleChoice: string | null;
  visualBible: VisualBible | null;
}

const FORMAT_OPTIONS = [
  { id: "9:16", label: "YouTube Short/TikTok", pixels: "1080×1920" },
  { id: "16:9", label: "YouTube", pixels: "1920×1080" },
  { id: "1:1", label: "Instagram Square", pixels: "1080×1080" },
  { id: "4:5", label: "Instagram Portrait", pixels: "1080×1350" },
  { id: "21:9", label: "Cinematic", pixels: "2560×1080" },
];

function safeJsonParse(value: string | any[] | null | undefined, fallback: any[]): any[] {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function VisualPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [visualBible, setVisualBible] = useState<VisualBible | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingCharacters, setEditingCharacters] = useState(false);
  const [editingEnvironments, setEditingEnvironments] = useState(false);
  const [editingColors, setEditingColors] = useState(false);
  const [editingNegativeRules, setEditingNegativeRules] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [styleChoice, setStyleChoice] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

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
        setVisualBible(data.visualBible);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!visualBible) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/visual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(visualBible),
      });
      if (res.ok) {
        setEditingCharacters(false);
        setEditingEnvironments(false);
        setEditingColors(false);
        setEditingNegativeRules(false);
        setHasChanges(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/visual/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setVisualBible(data.visualBible);
        setProject((prev) =>
          prev ? { ...prev, styleChoice: data.styleChoice } : prev
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const updateCharacters = (chars: any[]) => {
    setVisualBible((prev) => prev ? { ...prev, characters: chars } : prev);
  };

  const updateEnvironments = (envs: any[]) => {
    setVisualBible((prev) => prev ? { ...prev, environments: envs } : prev);
  };

  const updateColorPalette = (colors: string[]) => {
    setVisualBible((prev) => prev ? { ...prev, colorPalette: colors } : prev);
  };

  const updateNegativeRules = (rules: string[]) => {
    setVisualBible((prev) => prev ? { ...prev, negativeRules: rules } : prev);
  };

  const addCharacter = () => {
    const chars = [...safeJsonParse(visualBible?.characters, []), { name: "", face_features: "", description: "" }];
    updateCharacters(chars);
  };

  const updateCharacter = (idx: number, field: string, value: string) => {
    const chars = [...safeJsonParse(visualBible?.characters, [])];
    chars[idx] = { ...chars[idx], [field]: value };
    updateCharacters(chars);
  };

  const removeCharacter = (idx: number) => {
    const chars = safeJsonParse(visualBible?.characters, []).filter((_: any, i: number) => i !== idx);
    updateCharacters(chars);
  };

  const addEnvironment = () => {
    const envs = [...safeJsonParse(visualBible?.environments, []), { name: "", description: "" }];
    updateEnvironments(envs);
  };

  const updateEnvironment = (idx: number, field: string, value: string) => {
    const envs = [...safeJsonParse(visualBible?.environments, [])];
    envs[idx] = { ...envs[idx], [field]: value };
    updateEnvironments(envs);
  };

  const removeEnvironment = (idx: number) => {
    const envs = safeJsonParse(visualBible?.environments, []).filter((_: any, i: number) => i !== idx);
    updateEnvironments(envs);
  };

  const addColor = () => {
    const colors = [...safeJsonParse(visualBible?.colorPalette, []), "#000000"];
    updateColorPalette(colors);
  };

  const updateColor = (idx: number, value: string) => {
    const colors = [...safeJsonParse(visualBible?.colorPalette, [])];
    colors[idx] = value;
    updateColorPalette(colors);
  };

  const removeColor = (idx: number) => {
    const colors = safeJsonParse(visualBible?.colorPalette, []).filter((_: any, i: number) => i !== idx);
    updateColorPalette(colors);
  };

  const addNegativeRule = () => {
    const rules = [...safeJsonParse(visualBible?.negativeRules, []), ""];
    updateNegativeRules(rules);
  };

  const updateNegativeRule = (idx: number, value: string) => {
    const rules = [...safeJsonParse(visualBible?.negativeRules, [])];
    rules[idx] = value;
    updateNegativeRules(rules);
  };

  const removeNegativeRule = (idx: number) => {
    const rules = safeJsonParse(visualBible?.negativeRules, []).filter((_: any, i: number) => i !== idx);
    updateNegativeRules(rules);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project || !visualBible) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const characters = safeJsonParse(visualBible.characters, []);
  const environments = safeJsonParse(visualBible.environments, []);
  const colorPalette = safeJsonParse(visualBible.colorPalette, []);
  const negativeRules = safeJsonParse(visualBible.negativeRules, []);

  const isEditing = editingCharacters || editingEnvironments || editingColors || editingNegativeRules || hasChanges;

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
          <h1 className="mt-1 text-2xl font-bold text-foreground">Visual</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0 3.09 3.09Z" />
                </svg>
                Generate with AI
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || !isEditing}>
            {saving ? "Saving..." : isEditing ? "💾 Save Changes" : "✓ Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{project.styleChoice || "Not selected"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {visualBible.styleAnchorTokens || "No style tokens"}
            </p>
          </CardContent>
        </Card>

        {/* Aspect Ratio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Format / Aspect Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {FORMAT_OPTIONS.map((format) => {
                const isSelected = (visualBible.aspectRatio || "16:9") === format.id;
                const aspectStyle = format.id === "9:16" 
                  ? "aspect-[9/16]" 
                  : format.id === "16:9" 
                  ? "aspect-video" 
                  : format.id === "1:1" 
                  ? "aspect-square" 
                  : format.id === "4:5" 
                  ? "aspect-[4/5]" 
                  : "aspect-[21/9]";
                
                return (
                  <button
                    key={format.id + format.label}
                    onClick={() => {
                      if ((visualBible.aspectRatio || "16:9") !== format.id) {
                        setVisualBible({ ...visualBible, aspectRatio: format.id });
                        setHasChanges(true);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className={`w-full max-w-[48px] bg-muted rounded border border-border ${aspectStyle}`}
                      title={format.label}
                    />
                    <div className="text-center">
                      <p className="text-xs font-medium">{format.label}</p>
                      <p className="text-[10px] text-muted-foreground">{format.pixels}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Characters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Characters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingCharacters(!editingCharacters)}
              >
                {editingCharacters ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No characters. Click "Generate with AI" to auto-generate or add manually.
              </p>
            ) : (
              <div className="space-y-3">
                {characters.map((char: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border p-3">
                    {editingCharacters ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Name"
                            value={char.name || ""}
                            onChange={(e) => updateCharacter(idx, "name", e.target.value)}
                            className="font-medium"
                          />
                          {idx > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => removeCharacter(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Face features (e.g., young woman, short black hair)"
                          value={char.face_features || ""}
                          onChange={(e) => updateCharacter(idx, "face_features", e.target.value)}
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={char.description || ""}
                          onChange={(e) => updateCharacter(idx, "description", e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{char.name}</p>
                        <p className="text-xs text-muted-foreground">{char.face_features}</p>
                        {char.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{char.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {editingCharacters && (
              <Button variant="outline" size="sm" className="mt-3" onClick={addCharacter}>
                <Plus className="mr-1 h-4 w-4" /> Add Character
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Environments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Environments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEnvironments(!editingEnvironments)}
              >
                {editingEnvironments ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {environments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No environments. Click "Generate with AI" to auto-generate or add manually.
              </p>
            ) : (
              <div className="space-y-3">
                {environments.map((env: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border p-3">
                    {editingEnvironments ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Environment name"
                            value={env.name || ""}
                            onChange={(e) => updateEnvironment(idx, "name", e.target.value)}
                            className="font-medium"
                          />
                          {idx > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => removeEnvironment(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Description (e.g., misty forest with ancient ruins)"
                          value={env.description || ""}
                          onChange={(e) => updateEnvironment(idx, "description", e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{env.name}</p>
                        <p className="text-xs text-muted-foreground">{env.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {editingEnvironments && (
              <Button variant="outline" size="sm" className="mt-3" onClick={addEnvironment}>
                <Plus className="mr-1 h-4 w-4" /> Add Environment
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Camera Language */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Camera Language</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={visualBible.cameraLanguage}
              onChange={(e) =>
                setVisualBible({ ...visualBible, cameraLanguage: e.target.value })
              }
              placeholder="e.g., medium shot, close-up, wide angle..."
            />
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Color Palette</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingColors(!editingColors)}
              >
                {editingColors ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {colorPalette.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No colors generated yet. Click "Generate with AI" or add manually.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {colorPalette.map((color: string, idx: number) => (
                  <div key={idx} className="relative group">
                    {editingColors ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => updateColor(idx, e.target.value)}
                          className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeColor(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="h-12 w-12 rounded-lg border-2 border-border cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {editingColors && (
              <Button variant="outline" size="sm" className="mt-3" onClick={addColor}>
                <Plus className="mr-1 h-4 w-4" /> Add Color
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Negative Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Negative Rules</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNegativeRules(!editingNegativeRules)}
              >
                {editingNegativeRules ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {negativeRules.map((rule: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  {editingNegativeRules ? (
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1">
                      <Input
                        value={rule}
                        onChange={(e) => updateNegativeRule(idx, e.target.value)}
                        className="h-5 w-24 border-0 p-0 text-xs"
                      />
                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeNegativeRule(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">{rule}</span>
                  )}
                </div>
              ))}
            </div>
            {editingNegativeRules && (
              <Button variant="outline" size="sm" className="mt-3" onClick={addNegativeRule}>
                <Plus className="mr-1 h-4 w-4" /> Add Rule
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
