"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Plus, Edit2, Check } from "lucide-react";

interface VisualImage {
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
  visualImage: VisualImage | null;
}

const FORMAT_OPTIONS = [
  { id: "9:16", label: "YouTube Short/TikTok", pixels: "1080×1920" },
  { id: "16:9", label: "YouTube", pixels: "1920×1080" },
  { id: "1:1", label: "Instagram Square", pixels: "1080×1080" },
  { id: "4:5", label: "Instagram Portrait", pixels: "1080×1350" },
  { id: "21:9", label: "Cinematic", pixels: "2560×1080" },
];

const STYLE_OPTIONS = [
  { id: "realistic", label: "Realistic", icon: "📸", desc: "Photorealistic" },
  { id: "anime", label: "Anime", icon: "🎌", desc: "Japanese animation" },
  { id: "3d-render", label: "3D Render", icon: "🎮", desc: "Computer graphics" },
  { id: "watercolor", label: "Watercolor", icon: "🎨", desc: "Hand-painted" },
  { id: "oil-painting", label: "Oil Painting", icon: "🖼️", desc: "Classical art" },
  { id: "digital-art", label: "Digital Art", icon: "✨", desc: "Modern digital" },
  { id: "comic", label: "Comic", icon: "💥", desc: "Comic book style" },
  { id: "sketch", label: "Sketch", icon: "✏️", desc: "Pencil sketch" },
  { id: "pixel-art", label: "Pixel Art", icon: "👾", desc: "Retro gaming" },
  { id: "papercraft", label: "Papercraft", icon: "📦", desc: "Paper cutout" },
  { id: "origami", label: "Origami", icon: "🦢", desc: "Folded paper" },
  { id: "minimalist", label: "Minimalist", icon: "◼️", desc: "Simple design" },
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
  const [visualImage, setVisualImage] = useState<VisualImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [generatingType, setGeneratingType] = useState<string | null>(null);

  // Edit modals
  const [characterModal, setCharacterModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [environmentModal, setEnvironmentModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });

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
        setVisualImage(data.visualImage);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!visualImage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/visual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(visualImage),
      });
    } finally {
      setSaving(false);
    }
  };

  const autoSaveVisual = async (updated: VisualImage, redirectToScript = false) => {
    setVisualImage(updated);
    try {
      await fetch(`/api/projects/${params.id}/visual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updated),
      });
      if (redirectToScript) {
        router.push(`/member/${params.id}/script?autoGenerate=true`);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
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
        setVisualImage(data.visualImage);
        setProject((prev) =>
          prev ? { ...prev, styleChoice: data.styleChoice } : prev
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const generateSection = async (type: string) => {
    setGeneratingType(type);
    try {
      const res = await fetch(`/api/projects/${params.id}/visual/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setVisualImage(data.visualImage);
      }
    } finally {
      setGeneratingType(null);
    }
  };

  const updateCharacters = (chars: any[]) => {
    setVisualImage((prev) => prev ? { ...prev, characters: chars } : prev);
  };

  const updateEnvironments = (envs: any[]) => {
    setVisualImage((prev) => prev ? { ...prev, environments: envs } : prev);
  };

  const updateColorPalette = (colors: string[]) => {
    setVisualImage((prev) => prev ? { ...prev, colorPalette: colors } : prev);
  };

  const updateNegativeRules = (rules: string[]) => {
    setVisualImage((prev) => prev ? { ...prev, negativeRules: rules } : prev);
  };

  const addCharacter = () => {
    setCharacterModal({ open: true, index: null });
  };

  const editCharacter = (idx: number) => {
    setCharacterModal({ open: true, index: idx });
  };

  const saveCharacter = (char: { name: string; face_features: string; description: string }) => {
    const chars = [...safeJsonParse(visualImage?.characters, [])];
    if (characterModal.index === null) {
      chars.push(char);
    } else {
      chars[characterModal.index] = char;
    }
    updateCharacters(chars);
    setCharacterModal({ open: false, index: null });
  };

  const removeCharacter = (idx: number) => {
    const chars = safeJsonParse(visualImage?.characters, []).filter((_: any, i: number) => i !== idx);
    updateCharacters(chars);
  };

  const addEnvironment = () => {
    setEnvironmentModal({ open: true, index: null });
  };

  const editEnvironment = (idx: number) => {
    setEnvironmentModal({ open: true, index: idx });
  };

  const saveEnvironment = (env: { name: string; description: string }) => {
    const envs = [...safeJsonParse(visualImage?.environments, [])];
    if (environmentModal.index === null) {
      envs.push(env);
    } else {
      envs[environmentModal.index] = env;
    }
    updateEnvironments(envs);
    setEnvironmentModal({ open: false, index: null });
  };

  const removeEnvironment = (idx: number) => {
    const envs = safeJsonParse(visualImage?.environments, []).filter((_: any, i: number) => i !== idx);
    updateEnvironments(envs);
  };

  const addColor = () => {
    const colors = [...safeJsonParse(visualImage?.colorPalette, []), "#000000"];
    updateColorPalette(colors);
  };

  const updateColor = (idx: number, value: string) => {
    const colors = [...safeJsonParse(visualImage?.colorPalette, [])];
    colors[idx] = value;
    updateColorPalette(colors);
  };

  const removeColor = (idx: number) => {
    const colors = safeJsonParse(visualImage?.colorPalette, []).filter((_: any, i: number) => i !== idx);
    updateColorPalette(colors);
  };

  const addNegativeRule = () => {
    const rules = [...safeJsonParse(visualImage?.negativeRules, []), ""];
    updateNegativeRules(rules);
  };

  const updateNegativeRule = (idx: number, value: string) => {
    const rules = [...safeJsonParse(visualImage?.negativeRules, [])];
    rules[idx] = value;
    updateNegativeRules(rules);
  };

  const removeNegativeRule = (idx: number) => {
    const rules = safeJsonParse(visualImage?.negativeRules, []).filter((_: any, i: number) => i !== idx);
    updateNegativeRules(rules);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project || !visualImage) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const characters = safeJsonParse(visualImage.characters, []);
  const environments = safeJsonParse(visualImage.environments, []);
  const colorPalette = safeJsonParse(visualImage.colorPalette, []);
  const negativeRules = safeJsonParse(visualImage.negativeRules, []);

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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visual Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {STYLE_OPTIONS.map((style) => {
                const isSelected = visualImage.styleAnchorTokens?.toLowerCase().includes(style.id);
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      autoSaveVisual({
                        ...visualImage!,
                        styleAnchorTokens: `${style.id}, detailed illustration, high quality`
                      });
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-3xl">{style.icon}</span>
                    <span className="text-sm font-medium">{style.label}</span>
                    <span className="text-xs text-muted-foreground">{style.desc}</span>
                  </button>
                );
              })}
            </div>
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
                const isSelected = (visualImage.aspectRatio || "16:9") === format.id;
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
                      if ((visualImage.aspectRatio || "16:9") !== format.id) {
                        autoSaveVisual({ ...visualImage!, aspectRatio: format.id }, true);
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSection("characters")} disabled={generatingType !== null}>
                  {generatingType === "characters" ? (
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  )}
                  Generate
                </Button>
                <Button variant="outline" size="sm" onClick={addCharacter}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No characters yet. Click "Generate" or "Add" to create.
              </p>
            ) : (
              <div className="space-y-2">
                {characters.map((char: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex-1">
                      <p className="font-medium">{char.name || `Character ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{char.face_features}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => editCharacter(idx)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeCharacter(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Environments</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSection("environments")} disabled={generatingType !== null}>
                  {generatingType === "environments" ? (
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  )}
                  Generate
                </Button>
                <Button variant="outline" size="sm" onClick={addEnvironment}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {environments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No environments yet. Click "Generate" or "Add" to create.
              </p>
            ) : (
              <div className="space-y-2">
                {environments.map((env: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex-1">
                      <p className="font-medium">{env.name || `Environment ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{env.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => editEnvironment(idx)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeEnvironment(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camera Language */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Camera Language</CardTitle>
              <Button variant="outline" size="sm" onClick={() => generateSection("cameraLanguage")} disabled={generatingType !== null}>
                {generatingType === "cameraLanguage" ? (
                  <span className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                ) : (
                  <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                )}
                Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              value={visualImage.cameraLanguage}
              onChange={(e) =>
                setVisualImage({ ...visualImage, cameraLanguage: e.target.value })
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSection("colorPalette")} disabled={generatingType !== null}>
                  {generatingType === "colorPalette" ? (
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  )}
                  Generate
                </Button>
                <Button variant="outline" size="sm" onClick={addColor}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {colorPalette.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No colors yet. Click "Generate" or "Add" to create.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {colorPalette.map((color: string, idx: number) => (
                  <div key={idx} className="relative group">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(idx, e.target.value)}
                      className="h-12 w-12 rounded-lg border border-border cursor-pointer"
                    />
                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background" onClick={() => removeColor(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Negative Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Negative Rules</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSection("negativeRules")} disabled={generatingType !== null}>
                  {generatingType === "negativeRules" ? (
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  )}
                  Generate
                </Button>
                <Button variant="outline" size="sm" onClick={addNegativeRule}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {negativeRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No negative rules yet. Click "Generate" or "Add" to create.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {negativeRules.map((rule: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1">
                    <span className="text-sm">{rule}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => removeNegativeRule(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Character Edit Modal */}
      <Dialog open={characterModal.open} onOpenChange={(open) => !open && setCharacterModal({ open: false, index: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{characterModal.index === null ? "Add Character" : "Edit Character"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                id="charName"
                placeholder="Character name"
                defaultValue={characterModal.index !== null ? characters[characterModal.index]?.name : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Face Features</Label>
              <Input
                id="charFace"
                placeholder="e.g., young woman, short black hair"
                defaultValue={characterModal.index !== null ? characters[characterModal.index]?.face_features : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                id="charDesc"
                placeholder="Additional details"
                defaultValue={characterModal.index !== null ? characters[characterModal.index]?.description : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCharacterModal({ open: false, index: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const name = (document.getElementById("charName") as HTMLInputElement)?.value;
                const face_features = (document.getElementById("charFace") as HTMLInputElement)?.value;
                const description = (document.getElementById("charDesc") as HTMLInputElement)?.value;
                saveCharacter({ name, face_features, description });
              }}
            >
              {characterModal.index === null ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Environment Edit Modal */}
      <Dialog open={environmentModal.open} onOpenChange={(open) => !open && setEnvironmentModal({ open: false, index: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{environmentModal.index === null ? "Add Environment" : "Edit Environment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                id="envName"
                placeholder="Environment name"
                defaultValue={environmentModal.index !== null ? environments[environmentModal.index]?.name : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                id="envDesc"
                placeholder="e.g., misty forest with ancient ruins"
                defaultValue={environmentModal.index !== null ? environments[environmentModal.index]?.description : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvironmentModal({ open: false, index: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const name = (document.getElementById("envName") as HTMLInputElement)?.value;
                const description = (document.getElementById("envDesc") as HTMLInputElement)?.value;
                saveEnvironment({ name, description });
              }}
            >
              {environmentModal.index === null ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
