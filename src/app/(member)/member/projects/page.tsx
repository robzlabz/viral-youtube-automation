"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

function getStatusLabel(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
    SCRIPT_DONE: { label: "Script Done", color: "bg-blue-100 text-blue-800" },
    SCENES_DONE: { label: "Scenes Done", color: "bg-indigo-100 text-indigo-800" },
    VOICES_DONE: { label: "Voices Done", color: "bg-purple-100 text-purple-800" },
    IMAGES_DONE: { label: "Images Done", color: "bg-orange-100 text-orange-800" },
    RENDERING: { label: "Rendering", color: "bg-yellow-100 text-yellow-800" },
    COMPLETE: { label: "Complete", color: "bg-green-100 text-green-800" },
  };
  return statusMap[status] || { label: status, color: "bg-muted" };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    fetchProjects();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your YouTube story video projects
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started
            </p>
            <Button className="mt-4" onClick={() => setShowNewModal(true)}>
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const status = getStatusLabel(project.status);
            const sceneCount = project.scenes.length;
            const totalVoiceLength = project.scenes.reduce((acc, s) => acc + (s.voiceLength || 0), 0);

            return (
              <Card key={project.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link href={`/member/${project.id}`} className="hover:underline">
                        <CardTitle className="truncate">{project.title}</CardTitle>
                      </Link>
                      <CardDescription className="mt-1">
                        {sceneCount} scenes · {formatDuration(totalVoiceLength)} ·{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Link href={`/member/${project.id}`}>
                        <Button variant="outline" size="sm">
                          Open
                        </Button>
                      </Link>
                      {project.status === "DRAFT" && (
                        <Link href={`/member/${project.id}/script`}>
                          <Button variant="ghost" size="sm">
                            Edit Script
                          </Button>
                        </Link>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(project.id)}
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
    </div>
  );
}
