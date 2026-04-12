# Implementation Plan
## YouTube Story Video Automation — Web Application

**Version:** 1.0.0  
**Tech Stack:** Next.js 15 (App Router, full-stack)  
**Estimasi Total:** ~6 minggu (1 developer)

---

## Fase 0: Setup & Fondasi (Minggu 1)

### 0.1 Repository & Tooling
- [ ] Init Git repository
- [ ] Setup `.env.local` dengan semua required env vars
- [ ] Setup `docker-compose.yml` (PostgreSQL, Redis, app)
- [ ] Setup ESLint + Prettier + TypeScript strict mode

### 0.2 Next.js Project Init
- [ ] `npx create-next-app@latest` — App Router, TypeScript, Tailwind
- [ ] Setup shadcn/ui (`npx shadcn-ui@latest init`)
- [ ] Setup path alias `@/*` di tsconfig
- [ ] Setup Prisma: `npx prisma init`
- [ ] Setup BullMQ worker process (terpisah dari Next.js server)
- [ ] Setup Redis connection (ioredis)
- [ ] Setup structured logging (pino)

### 0.3 Prisma Schema & Migrations
```
prisma/
├── schema.prisma       ← semua model
└── migrations/         ← auto-generated
```
Jalankan: `npx prisma migrate dev --name init`

### 0.4 Folder Struktur
```
src/
├── app/
│   ├── (dashboard)/        ← frontend pages
│   └── api/                ← Route Handlers
├── components/
├── lib/
│   ├── db.ts               ← Prisma client singleton
│   ├── redis.ts            ← ioredis client
│   └── queue.ts            ← BullMQ queues
├── services/               ← business logic
└── workers/                ← BullMQ worker handlers
```

---

## Fase 1: Project & Scene Management (Minggu 2)

### 1.1 Backend — Project Route Handlers
- [ ] `POST /api/projects` — create project + init folder
- [ ] `GET /api/projects` — list projects
- [ ] `GET /api/projects/[id]` — detail project
- [ ] `DELETE /api/projects/[id]` — hapus project + cleanup files
- [ ] Buat folder `data/stories/<slug>/{voices,images,final}` saat create

### 1.2 Backend — Scene Route Handlers
- [ ] `GET /api/projects/[id]/scenes`
- [ ] `POST /api/projects/[id]/scenes`
- [ ] `PUT /api/projects/[id]/scenes/[sceneId]`
- [ ] `DELETE /api/projects/[id]/scenes/[sceneId]`
- [ ] `PUT /api/projects/[id]/scenes/reorder`
- [ ] `POST /api/projects/[id]/validate`

### 1.3 Backend — Visual Bible Route Handlers
- [ ] `GET /api/projects/[id]/visual-bible`
- [ ] `PUT /api/projects/[id]/visual-bible`

### 1.4 Frontend — Project Dashboard
- [ ] `app/(dashboard)/page.tsx` — list projects
- [ ] `components/project/ProjectCard.tsx`
- [ ] `components/project/NewProjectModal.tsx`

### 1.5 Frontend — Scene Manager
- [ ] `app/(dashboard)/projects/[id]/scenes/page.tsx`
- [ ] `components/scene/SceneList.tsx` — dnd-kit sortable
- [ ] `components/scene/SceneCard.tsx` — inline edit
- [ ] `components/scene/SceneStatusBadge.tsx`

---

## Fase 2: AI Script & Manifest Generation (Minggu 2–3)

### 2.1 Backend — Claude Service
- [ ] `src/services/claude.service.ts`
  - `generateScript()` — stream ke SSE
  - `suggestStyles()` — return 3 style options
  - `scriptToScenes()` — return scene array JSON
  - `assistVisualBible()` — return visual bible draft

### 2.2 Backend — AI Route Handlers
- [ ] `POST /api/projects/[id]/generate-script` — SSE streaming
- [ ] `POST /api/projects/[id]/suggest-styles`
- [ ] `POST /api/projects/[id]/select-style`
- [ ] `POST /api/projects/[id]/script-to-scenes`
- [ ] `POST /api/projects/[id]/assist-visual-bible`

### 2.3 SSE Streaming Setup
```typescript
// app/api/projects/[id]/generate-script/route.ts
export async function POST(req: Request) {
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // Run Claude stream in background
  claudeService.streamScript(..., async (chunk) => {
    await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ chunk })}\n\n`))
  })
  
  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

### 2.4 Frontend — Script Editor Page
- [ ] `app/(dashboard)/projects/[id]/script/page.tsx`
- [ ] SSE consumer hook `useSSEStream`
- [ ] Streaming text display
- [ ] Tombol "Convert to Scenes"

### 2.5 Frontend — Style Selection Modal
- [ ] `components/project/StyleSelectionModal.tsx`
- [ ] 3 style cards dengan recommended badge

---

## Fase 3: Voice Generation (Minggu 3)

### 3.1 Backend — SumoPod Voice Service
- [ ] `src/services/voice.service.ts`
  - `generateVoice(text, outputPath)` → durasi detik
  - Hitung `voice_length` via `ffprobe` (child_process)
  - Update scene di database setelah generate

### 3.2 Backend — BullMQ Voice Queue
- [ ] `src/lib/queues/voice.queue.ts` — definisi queue
- [ ] `src/workers/voice.worker.ts` — processor
  - `voice:single` — generate satu scene
  - `voice:all` — enqueue semua scenes
  - Skip-existing logic
  - Retry 3x exponential backoff
  - Progress update via SSE broadcast

### 3.3 Backend — Voice Route Handlers
- [ ] `POST /api/projects/[id]/generate-voices`
- [ ] `POST /api/projects/[id]/scenes/[sceneId]/generate-voice`
- [ ] `GET /api/projects/[id]/voices/[sceneId]` — serve audio file
- [ ] `GET /api/projects/[id]/progress` — SSE stream progress

### 3.4 SSE Progress Hub
```typescript
// src/lib/sse-hub.ts
// Map projectId → Set<ReadableStreamController>
// Broadcast event ke semua subscriber project
export const sseHub = {
  subscribe(projectId: string, controller: ReadableStreamController) { ... },
  broadcast(projectId: string, event: ProgressEvent) { ... },
  unsubscribe(projectId: string, controller: ReadableStreamController) { ... },
}
```

### 3.5 Frontend — Voice Generation UI
- [ ] Progress bar per scene (via SSE `useProjectSSE` hook)
- [ ] Audio player inline per scene (wavesurfer.js)
- [ ] Tombol regenerate individual scene
- [ ] Status badge per scene

---

## Fase 4: Image Generation (Minggu 4)

### 4.1 Backend — Runware Image Service
- [ ] `src/services/image.service.ts`
  - `buildPrompt(scenePrompt, visualBible)` — inject anchors
  - `generateImage(prompt, outputPath)` → path
  - Simpan metadata sidecar (model, seed, cost)

### 4.2 Backend — BullMQ Image Queue
- [ ] `src/lib/queues/image.queue.ts`
- [ ] `src/workers/image.worker.ts`
  - `image:single` dan `image:all`
  - Skip-existing, retry 3x
  - SSE progress broadcast

### 4.3 Backend — Image Route Handlers
- [ ] `POST /api/projects/[id]/generate-images`
- [ ] `POST /api/projects/[id]/scenes/[sceneId]/generate-image`
- [ ] `GET /api/projects/[id]/images/[sceneId]` — serve image

### 4.4 Frontend — Image Generation UI
- [ ] Grid thumbnail preview per scene
- [ ] Progress overlay saat generating
- [ ] Tombol regenerate per scene

---

## Fase 5: Video Render (Minggu 4–5)

### 5.1 Backend — FFmpeg Render Service
- [ ] `src/services/render.service.ts`
  - `buildCommand(scenes, outputPath, srtPath)` → string[]
  - `buildSRT(scenes)` → SRT string
  - `runFFmpeg(cmd, onProgress)` — spawn + parse stderr

### 5.2 Backend — BullMQ Render Queue
- [ ] `src/workers/render.worker.ts`
  - Validasi manifest sebelum render
  - Generate SRT file
  - Run FFmpeg dengan progress parsing
  - SSE broadcast frame progress
  - Simpan output metadata ke DB

### 5.3 Backend — Render Route Handlers
- [ ] `POST /api/projects/[id]/render`
- [ ] `GET /api/projects/[id]/render-status`
- [ ] `GET /api/projects/[id]/download` — stream file MP4

### 5.4 Frontend — Render Page
- [ ] `app/(dashboard)/projects/[id]/render/page.tsx`
- [ ] Pre-render checklist component
- [ ] Progress bar + FFmpeg log (collapsible)
- [ ] Video player preview setelah selesai
- [ ] Tombol download

---

## Fase 6: Polish & Deployment (Minggu 5–6)

### 6.1 Error Handling & UX
- [ ] Error boundary React
- [ ] Toast notifikasi (sonner)
- [ ] Confirm dialog untuk aksi destruktif
- [ ] Loading skeleton di semua halaman

### 6.2 Pipeline Status
- [ ] Status bar per project (Script → Scenes → Voices → Images → Render)
- [ ] Persentase progress keseluruhan

### 6.3 Settings Page
- [ ] `app/(dashboard)/settings/page.tsx`
- [ ] Form API keys (disimpan ke `.env.local` atau DB terenkripsi)
- [ ] Default voice style, default resolution

### 6.4 Testing
- [ ] Unit tests: service layer (Jest)
- [ ] Integration tests: Route Handlers (supertest / next-test-api-route-handler)
- [ ] E2E: Playwright untuk happy path

### 6.5 Deployment
- [ ] `Dockerfile` multi-stage (Next.js build + BullMQ worker)
- [ ] `docker-compose.yml` production (app, worker, postgres, redis)
- [ ] Persistent volume untuk `/data/stories`
- [ ] Health check: `GET /api/health`

---

## Dependensi NPM

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0",
    "wavesurfer.js": "^7.0.0",
    "sonner": "^1.5.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^15.0.0",
    "playwright": "^1.43.0"
  }
}
```

---

## Struktur Direktori Next.js

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                    ← project list
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── page.tsx            ← project detail
│   │   │       ├── script/page.tsx
│   │   │       ├── scenes/page.tsx
│   │   │       ├── visual-bible/page.tsx
│   │   │       ├── assets/page.tsx
│   │   │       └── render/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── health/route.ts
│       └── projects/
│           ├── route.ts                ← GET list, POST create
│           └── [id]/
│               ├── route.ts            ← GET, DELETE
│               ├── scenes/
│               │   ├── route.ts
│               │   ├── reorder/route.ts
│               │   └── [sceneId]/
│               │       ├── route.ts
│               │       ├── generate-voice/route.ts
│               │       └── generate-image/route.ts
│               ├── visual-bible/route.ts
│               ├── generate-script/route.ts   ← SSE
│               ├── suggest-styles/route.ts
│               ├── select-style/route.ts
│               ├── script-to-scenes/route.ts
│               ├── generate-voices/route.ts
│               ├── generate-images/route.ts
│               ├── validate/route.ts
│               ├── render/route.ts
│               ├── render-status/route.ts
│               ├── progress/route.ts          ← SSE
│               ├── voices/[sceneId]/route.ts  ← serve audio
│               ├── images/[sceneId]/route.ts  ← serve image
│               └── download/route.ts          ← serve video
├── components/
│   ├── project/
│   ├── scene/
│   ├── visual-bible/
│   ├── asset/
│   ├── render/
│   └── common/
├── services/
│   ├── claude.service.ts
│   ├── voice.service.ts
│   ├── image.service.ts
│   └── render.service.ts
├── workers/
│   ├── voice.worker.ts
│   ├── image.worker.ts
│   └── render.worker.ts
├── lib/
│   ├── db.ts               ← Prisma singleton
│   ├── redis.ts            ← ioredis singleton
│   ├── queue.ts            ← BullMQ queue definitions
│   ├── sse-hub.ts          ← SSE broadcast hub
│   └── ffmpeg.ts           ← FFmpeg helpers
├── hooks/
│   ├── useProjectSSE.ts    ← SSE consumer
│   ├── useProjects.ts
│   └── useScenes.ts
├── store/
│   ├── wsStore.ts          ← SSE + progress state (Zustand)
│   └── uiStore.ts
└── prisma/
    └── schema.prisma

workers/
└── index.ts    ← entry point BullMQ worker (process terpisah)

data/stories/   ← runtime file storage
```

---

## Catatan Penting: BullMQ Worker Process

BullMQ worker **harus dijalankan sebagai process terpisah** dari Next.js server, karena Next.js adalah request-response server, bukan long-running daemon.

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "worker": "ts-node workers/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run worker\""
  }
}
```

Di Docker, jalankan dua container: satu untuk Next.js, satu untuk worker.

---

## Milestone Summary

| Minggu | Deliverable |
|--------|-------------|
| 1 | Foundation: Prisma DB, Redis, Next.js + BullMQ worker berjalan |
| 2 | CRUD Project + Scene + Visual Bible + Style Suggestion |
| 3 | Script Gen (Claude SSE) + Voice Gen (SumoPod + BullMQ) |
| 4 | Image Gen (Runware + BullMQ) + SSE progress tracking |
| 5 | FFmpeg Render + Download + SRT subtitle burned-in |
| 6 | Testing, polish, Docker deployment |
