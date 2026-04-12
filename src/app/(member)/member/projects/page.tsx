"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  title: string;
  status: string;
  styleChoice: string | null;
  createdAt: string;
  updatedAt: string;
  scenes: { id: string; voiceLength: number | null; status: string }[];
  renderOutput: { filepath: string; durationSec: number } | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

const WORKFLOW_STAGES = [
  { key: "DRAFT", label: "Draft", icon: "📝" },
  { key: "SCRIPT_DONE", label: "Script", icon: "✍️" },
  { key: "SCENES_DONE", label: "Scenes", icon: "🎬" },
  { key: "VOICES_DONE", label: "Voices", icon: "🎙️" },
  { key: "IMAGES_DONE", label: "Images", icon: "🖼️" },
  { key: "RENDERING", label: "Render", icon: "⚙️" },
  { key: "COMPLETE", label: "Done", icon: "✅" },
];

function getStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; bg: string; text: string; ring: string }> = {
    DRAFT: { label: "Draft", bg: "bg-muted", text: "text-muted-foreground", ring: "ring-muted" },
    SCRIPT_DONE: { label: "Script Done", bg: "bg-blue-500/10", text: "text-blue-700", ring: "ring-blue-500" },
    SCENES_DONE: { label: "Scenes Done", bg: "bg-indigo-500/10", text: "text-indigo-700", ring: "ring-indigo-500" },
    VOICES_DONE: { label: "Voices Done", bg: "bg-purple-500/10", text: "text-purple-700", ring: "ring-purple-500" },
    IMAGES_DONE: { label: "Images Done", bg: "bg-orange-500/10", text: "text-orange-700", ring: "ring-orange-500" },
    RENDERING: { label: "Rendering", bg: "bg-yellow-500/10", text: "text-yellow-700", ring: "ring-yellow-500" },
    COMPLETE: { label: "Complete", bg: "bg-green-500/10", text: "text-green-700", ring: "ring-green-500" },
  };
  return statusMap[status] || { label: status, bg: "bg-muted", text: "text-muted-foreground", ring: "ring-muted" };
}

function getStageIndex(status: string): number {
  return WORKFLOW_STAGES.findIndex((s) => s.key === status);
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; projectId: string | null; projectTitle: string }>({
    open: false,
    projectId: null,
    projectTitle: "",
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle }),
      });

      if (res.ok) {
        const project = await res.json();
        router.push(`/member/${project.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.projectId) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${deleteModal.projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setDeleteModal({ open: false, projectId: null, projectTitle: "" });
      fetchProjects();
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (id: string, title: string) => {
    setDeleteModal({ open: true, projectId: id, projectTitle: title });
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your YouTube story video projects
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="shadow-lg shadow-primary/20">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Quick Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{projects.length}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {projects.filter((p) => p.status === "COMPLETE").length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {projects.filter((p) => p.status === "RENDERING").length}
              </p>
              <p className="text-sm text-muted-foreground">Rendering</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first YouTube story video project
            </p>
            <Button className="mt-4" onClick={() => setShowNewModal(true)}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const statusInfo = getStatusInfo(project.status);
            const stageIndex = getStageIndex(project.status);
            const sceneCount = project.scenes.length;
            const totalVoiceLength = project.scenes.reduce((acc, s) => acc + (s.voiceLength || 0), 0);
            const completedScenes = project.scenes.filter((s) => s.status === "COMPLETE").length;
            const isComplete = project.status === "COMPLETE";
            const hasRender = project.renderOutput != null;

            return (
              <Card key={project.id} className="transition-all hover:shadow-lg hover:border-primary/50">
                <CardContent className="p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/member/${project.id}`} className="group">
                        <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Last updated {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.ring}/30`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
                      <span className="text-xs font-medium text-foreground">{Math.round((stageIndex / (WORKFLOW_STAGES.length - 1)) * 100)}%</span>
                    </div>
                    <div className="flex gap-1">
                      {WORKFLOW_STAGES.map((stage, idx) => (
                        <div
                          key={stage.key}
                          className={`h-2 flex-1 rounded-full transition-colors ${
                            idx <= stageIndex
                              ? stage.key === "COMPLETE"
                                ? "bg-green-500"
                                : "bg-primary"
                              : "bg-muted"
                          }`}
                          title={stage.label}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      {WORKFLOW_STAGES.map((stage, idx) => (
                        <div
                          key={stage.key}
                          className={`flex flex-col items-center gap-0.5 ${idx <= stageIndex ? "opacity-100" : "opacity-40"}`}
                        >
                          <span className="text-sm">{stage.icon}</span>
                          <span className={`text-[10px] font-medium ${idx <= stageIndex ? "text-foreground" : "text-muted-foreground"}`}>
                            {stage.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-6 mb-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 19.5h-1.5C18.504 19.5 18 18.996 18 18.375m-1.5 0V5.625m0 12.75c0 .621.504 1.125 1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 19.5H19" />
                      </svg>
                      <span className="text-muted-foreground">Scenes:</span>
                      <span className="font-medium">{sceneCount}</span>
                      {sceneCount > 0 && (
                        <span className="text-xs text-muted-foreground">({completedScenes} done)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{formatDuration(totalVoiceLength)}</span>
                    </div>
                    {hasRender && (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                        <span className="font-medium">{formatDuration(project.renderOutput?.durationSec || 0)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-2">
                      <Link href={`/member/${project.id}`}>
                        <Button variant="default" size="sm">
                          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          {isComplete ? "View Result" : "Continue"}
                        </Button>
                      </Link>
                      {project.status === "DRAFT" && (
                        <Link href={`/member/${project.id}/script`}>
                          <Button variant="outline" size="sm">
                            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                            Edit Script
                          </Button>
                        </Link>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteModal(project.id, project.title)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>New Project</CardTitle>
              <CardDescription>Enter a title for your new video project</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Video Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Ibnu Sina dan Kesabarannya"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewModal(false);
                      setNewTitle("");
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newTitle.trim()}>
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, projectId: null, projectTitle: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteModal.projectTitle}"? This action cannot be undone and all associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, projectId: null, projectTitle: "" })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
