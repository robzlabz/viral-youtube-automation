# RTK.md
## React State Management Guide — YouTube Story Video Automation

Dokumen ini mendefinisikan strategi state management frontend menggunakan
**React Query** (server state) + **Zustand** (client/UI state).

---

## 1. Prinsip Dasar

| Jenis State | Tool | Contoh |
|-------------|------|--------|
| Server state (data dari API) | **React Query** | list projects, scenes, job status |
| UI state (lokal, ephemeral) | **Zustand** | modal open, selected scene, WS events |
| Form state | **React Hook Form** | form buat project, edit scene |
| URL state | **React Router** | project ID aktif, halaman aktif |

**Aturan:** Jangan duplikasi server state ke Zustand. Jika data berasal dari API, gunakan React Query.

---

## 2. React Query — Query Keys

Semua query key didefinisikan terpusat:

```typescript
// src/api/queryKeys.ts

export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
    progress: (id: string) => ['projects', id, 'progress'] as const,
  },
  scenes: {
    list: (projectId: string) => ['scenes', projectId] as const,
    detail: (projectId: string, sceneId: string) => ['scenes', projectId, sceneId] as const,
  },
  visualBible: {
    detail: (projectId: string) => ['visual-bible', projectId] as const,
  },
  jobs: {
    detail: (jobId: string) => ['jobs', jobId] as const,
    byProject: (projectId: string) => ['jobs', 'project', projectId] as const,
  },
  styleSuggestions: {
    byProject: (projectId: string) => ['style-suggestions', projectId] as const,
  },
}
```

---

## 3. React Query — Hooks per Fitur

### 3.1 Projects
```typescript
// src/api/hooks/useProjects.ts

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => api.get<ProjectListResponse>('/projects').then(r => r.data),
    staleTime: 30_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => api.get<Project>(`/projects/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      api.post<Project>('/projects', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}
```

### 3.2 Scenes
```typescript
// src/api/hooks/useScenes.ts

export function useScenes(projectId: string) {
  return useQuery({
    queryKey: queryKeys.scenes.list(projectId),
    queryFn: () => api.get<ScenesResponse>(`/projects/${projectId}/scenes`).then(r => r.data),
    enabled: !!projectId,
  })
}

export function useUpdateScene(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sceneId, data }: { sceneId: string; data: UpdateSceneInput }) =>
      api.put(`/projects/${projectId}/scenes/${sceneId}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenes.list(projectId) })
    },
  })
}

export function useReorderScenes(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sceneIds: string[]) =>
      api.put(`/projects/${projectId}/scenes/reorder`, { scene_ids: sceneIds }),
    // Optimistic update
    onMutate: async (sceneIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.scenes.list(projectId) })
      const prev = queryClient.getQueryData(queryKeys.scenes.list(projectId))
      queryClient.setQueryData(queryKeys.scenes.list(projectId), (old: ScenesResponse) => ({
        scenes: sceneIds.map(id => old.scenes.find(s => s.id === id)!),
      }))
      return { prev }
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKeys.scenes.list(projectId), ctx.prev)
      }
    },
  })
}
```

### 3.3 Voice & Image Generation
```typescript
// src/api/hooks/useGeneration.ts

export function useGenerateVoices(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (opts: { skipExisting: boolean }) =>
      api.post(`/projects/${projectId}/generate-voices`, {
        skip_existing: opts.skipExisting,
      }).then(r => r.data),
    onSuccess: (data) => {
      // Job ID tersimpan di WS store untuk tracking
      useWsStore.getState().setActiveJob(data.job_id)
    },
  })
}

export function useGenerateImages(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (opts: { skipExisting: boolean }) =>
      api.post(`/projects/${projectId}/generate-images`, {
        skip_existing: opts.skipExisting,
      }).then(r => r.data),
    onSuccess: (data) => {
      useWsStore.getState().setActiveJob(data.job_id)
    },
  })
}

export function useGenerateSingleVoice(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sceneId: string) =>
      api.post(`/projects/${projectId}/scenes/${sceneId}/generate-voice`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenes.list(projectId) })
    },
  })
}
```

### 3.4 Render
```typescript
// src/api/hooks/useRender.ts

export function useStartRender(projectId: string) {
  return useMutation({
    mutationFn: (opts: RenderOptions) =>
      api.post(`/projects/${projectId}/render`, opts).then(r => r.data),
    onSuccess: (data) => {
      useWsStore.getState().setActiveJob(data.job_id)
    },
  })
}

export function useValidateManifest(projectId: string) {
  return useQuery({
    queryKey: ['manifest-validation', projectId],
    queryFn: () =>
      api.post<ValidationResult>(`/projects/${projectId}/validate`).then(r => r.data),
    enabled: false, // hanya jalan saat dipanggil manual
  })
}
```

---

## 4. Zustand Stores

### 4.1 WebSocket Store
```typescript
// src/store/wsStore.ts

interface WsState {
  // Connection
  socket: WebSocket | null
  connected: boolean
  projectId: string | null

  // Active job tracking
  activeJobId: string | null

  // Per-scene progress
  sceneProgress: Record<string, SceneProgress>

  // Render progress
  renderProgress: RenderProgress | null

  // Actions
  connect: (projectId: string) => void
  disconnect: () => void
  setActiveJob: (jobId: string) => void
  handleMessage: (msg: WsMessage) => void
}

interface SceneProgress {
  status: 'pending' | 'generating' | 'done' | 'error'
  voiceLength?: number
  error?: string
}

interface RenderProgress {
  progressPct: number
  currentFrame: number
  logLine: string
  status: 'running' | 'done' | 'error'
}

export const useWsStore = create<WsState>((set, get) => ({
  socket: null,
  connected: false,
  projectId: null,
  activeJobId: null,
  sceneProgress: {},
  renderProgress: null,

  connect: (projectId) => {
    const { socket } = get()
    if (socket) socket.close()

    const ws = new WebSocket(`ws://localhost:8080/ws/projects/${projectId}`)

    ws.onopen = () => set({ connected: true })
    ws.onclose = () => set({ connected: false, socket: null })
    ws.onmessage = (e) => get().handleMessage(JSON.parse(e.data))

    set({ socket: ws, projectId })
  },

  disconnect: () => {
    get().socket?.close()
    set({ socket: null, connected: false, projectId: null })
  },

  setActiveJob: (jobId) => set({ activeJobId: jobId }),

  handleMessage: (msg) => {
    const queryClient = getQueryClient()

    switch (msg.event) {
      case 'voice_progress':
        set(state => ({
          sceneProgress: {
            ...state.sceneProgress,
            [msg.scene_id]: {
              status: msg.status,
              voiceLength: msg.voice_length,
            },
          },
        }))
        // Invalidate scenes query agar UI terupdate
        queryClient.invalidateQueries({ queryKey: ['scenes', get().projectId!] })
        break

      case 'image_progress':
        set(state => ({
          sceneProgress: {
            ...state.sceneProgress,
            [msg.scene_id]: { status: msg.status },
          },
        }))
        queryClient.invalidateQueries({ queryKey: ['scenes', get().projectId!] })
        break

      case 'render_progress':
        set({
          renderProgress: {
            progressPct: msg.progress_pct,
            currentFrame: msg.current_frame,
            logLine: msg.log_line,
            status: 'running',
          },
        })
        break

      case 'job_complete':
        if (msg.type === 'render') {
          set(state => ({
            renderProgress: state.renderProgress
              ? { ...state.renderProgress, status: 'done', progressPct: 100 }
              : null,
          }))
        }
        queryClient.invalidateQueries({ queryKey: ['projects', get().projectId!] })
        break

      case 'job_error':
        set(state => ({
          sceneProgress: msg.scene_id
            ? {
                ...state.sceneProgress,
                [msg.scene_id]: { status: 'error', error: msg.error },
              }
            : state.sceneProgress,
        }))
        break
    }
  },
}))
```

### 4.2 UI Store
```typescript
// src/store/uiStore.ts

interface UiState {
  // Modals
  isNewProjectModalOpen: boolean
  isStyleSelectionModalOpen: boolean
  isConfirmDeleteOpen: boolean
  deleteTargetId: string | null

  // Script editor
  isScriptGenerating: boolean
  scriptStreamBuffer: string

  // Actions
  openNewProjectModal: () => void
  closeNewProjectModal: () => void
  openStyleSelection: () => void
  closeStyleSelection: () => void
  openConfirmDelete: (id: string) => void
  closeConfirmDelete: () => void
  appendScriptChunk: (chunk: string) => void
  clearScriptBuffer: () => void
  setScriptGenerating: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isNewProjectModalOpen: false,
  isStyleSelectionModalOpen: false,
  isConfirmDeleteOpen: false,
  deleteTargetId: null,
  isScriptGenerating: false,
  scriptStreamBuffer: '',

  openNewProjectModal: () => set({ isNewProjectModalOpen: true }),
  closeNewProjectModal: () => set({ isNewProjectModalOpen: false }),
  openStyleSelection: () => set({ isStyleSelectionModalOpen: true }),
  closeStyleSelection: () => set({ isStyleSelectionModalOpen: false }),
  openConfirmDelete: (id) => set({ isConfirmDeleteOpen: true, deleteTargetId: id }),
  closeConfirmDelete: () => set({ isConfirmDeleteOpen: false, deleteTargetId: null }),
  appendScriptChunk: (chunk) =>
    set(state => ({ scriptStreamBuffer: state.scriptStreamBuffer + chunk })),
  clearScriptBuffer: () => set({ scriptStreamBuffer: '' }),
  setScriptGenerating: (v) => set({ isScriptGenerating: v }),
}))
```

---

## 5. Axios Client Setup

```typescript
// src/api/client.ts

import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Response interceptor — handle error global
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? 'Terjadi kesalahan. Coba lagi.'
    // Bisa dispatch ke toast store di sini
    console.error(`[API Error] ${err.response?.status}: ${message}`)
    return Promise.reject(err)
  }
)
```

---

## 6. React Query Provider Setup

```typescript
// src/main.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let queryClientInstance: QueryClient

export function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: 2,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 0,
        },
      },
    })
  }
  return queryClientInstance
}

// main.tsx
const queryClient = getQueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
```

---

## 7. Pola Invalidasi setelah WebSocket Event

WebSocket events memicu invalidasi React Query secara otomatis via `wsStore.handleMessage`.

| WS Event | Query yang diinvalidasi |
|----------|------------------------|
| `voice_progress` (done) | `scenes.list(projectId)` |
| `image_progress` (done) | `scenes.list(projectId)` |
| `job_complete` (render) | `projects.detail(projectId)` |
| `job_complete` (any) | `projects.detail(projectId)` |
| `voice_progress` (error) | — (hanya update sceneProgress di WS store) |

---

## 8. Optimistic Updates

Optimistic update diterapkan **hanya** untuk reorder scenes (drag-and-drop) karena user mengharapkan perubahan urutan langsung terlihat tanpa menunggu server.

Semua operasi lain (generate voice, generate image, render) menampilkan loading state dan menunggu konfirmasi dari server sebelum update UI, karena hasilnya bergantung pada proses async server-side yang bisa gagal.

---

## 9. Environment Variables Frontend

```env
# .env.local
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_BASE_URL=ws://localhost:8080/ws
```
