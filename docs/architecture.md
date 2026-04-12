# Technical Architecture & Integration Guide
## YouTube Story Video Automation

---

## 1. Overview Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOCKER NETWORK                          │
│                                                                 │
│  ┌────────────┐   ┌──────────────────────────────────────────┐  │
│  │  NGINX     │   │        NEXT.JS 15 APP (App Router)       │  │
│  │  :80/:443  ├──►│  :3000                                   │  │
│  │            │   │  ┌─────────────────┐  ┌───────────────┐  │  │
│  │  /         │   │  │  React (Pages + │  │  Route        │  │  │
│  │  /api/*    │   │  │  Components)    │  │  Handlers     │  │  │
│  │            │   │  │                 │  │  /api/**      │  │  │
│  └────────────┘   │  └─────────────────┘  └───────┬───────┘  │  │
│                   │                               │           │  │
│                   │  ┌──────────────────────────────────────┐ │  │
│                   │  │         Service Layer                │ │  │
│                   │  │  ClaudeService  VoiceService         │ │  │
│                   │  │  ImageService   RenderService        │ │  │
│                   │  └──────────────────────────────────────┘ │  │
│                   └──────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        BULLMQ WORKER PROCESS (terpisah dari Next.js)       │ │
│  │  voice.worker  image.worker  render.worker                 │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────┐  ┌────────▼────────┐                        │
│  │  PostgreSQL   │  │     Redis       │                        │
│  │  (Prisma ORM) │  │  (BullMQ Jobs)  │                        │
│  └───────────────┘  └─────────────────┘                        │
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │  Volume: /data/stories   │                                   │
│  │  voices/, images/,       │                                   │
│  │  final/                  │                                   │
│  └──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
   ┌─────▼─────┐       ┌──────▼──────┐     ┌──────▼──────┐
   │  Anthropic │       │   SumoPod   │     │   Runware   │
   │  Claude API│       │  Voice API  │     │  Image API  │
   └────────────┘       └─────────────┘     └─────────────┘
```

---

## 2. Integrasi SumoPod Voice API

### 2.1 Voice Service
```typescript
// src/services/voice.service.ts

export class VoiceService {
  private readonly apiKey = process.env.SUMOPOD_API_KEY!
  private readonly baseURL = process.env.SUMOPOD_API_BASE_URL!
  private readonly model = 'minimax/speech-2.8-hd'
  private readonly voiceId = process.env.SUMOPOD_VOICE_ID!

  async generateVoice(text: string, outputPath: string): Promise<number> {
    const response = await fetch(`${this.baseURL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: this.voiceId,
      }),
    })

    if (!response.ok) {
      throw new Error(`SumoPod API error: ${response.status} ${await response.text()}`)
    }

    const buffer = await response.arrayBuffer()
    await fs.writeFile(outputPath, Buffer.from(buffer))

    // Probe durasi dengan ffprobe
    return await this.probeDuration(outputPath)
  }

  private async probeDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ])
      let output = ''
      proc.stdout.on('data', (d) => (output += d))
      proc.on('close', (code) => {
        if (code !== 0) return reject(new Error('ffprobe failed'))
        resolve(parseFloat(output.trim()))
      })
    })
  }
}
```

### 2.2 Env Variables
```env
SUMOPOD_API_KEY=sk-...
SUMOPOD_API_BASE_URL=https://api.sumopod.com/v1
SUMOPOD_VOICE_ID=Wise_Woman
```

---

## 3. Integrasi Runware Image API

### 3.1 Image Service
```typescript
// src/services/image.service.ts

export class ImageService {
  private readonly apiKey = process.env.RUNWARE_API_KEY!
  private readonly baseURL = process.env.RUNWARE_API_BASE_URL!

  buildPrompt(scenePrompt: string, bible: VisualBible, characterIds: string[]): string {
    const parts: string[] = []

    for (const id of characterIds) {
      const char = bible.mainCharacters.find(c => c.id === id)
      if (char) parts.push(this.characterToAnchor(char))
    }

    parts.push(scenePrompt)
    parts.push(bible.styleAnchorTokens)

    return parts.join(', ')
  }

  readonly negativePrompt =
    'no text, no typography, no letters, no watermark, no logo, no labels, no writing, no captions'

  async generateImage(prompt: string, outputPath: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/images/inferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.RUNWARE_DEFAULT_MODEL ?? 'runware:100@1',
        positivePrompt: prompt,
        negativePrompt: this.negativePrompt,
        width: Number(process.env.RUNWARE_IMAGE_WIDTH ?? 1024),
        height: Number(process.env.RUNWARE_IMAGE_HEIGHT ?? 576),
        steps: Number(process.env.RUNWARE_DEFAULT_STEPS ?? 30),
        numberResults: 1,
        outputFormat: 'PNG',
      }),
    })

    if (!response.ok) {
      throw new Error(`Runware API error: ${response.status}`)
    }

    const data = await response.json()
    const imageUrl = data.data[0].imageURL
    const imgBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())
    await fs.writeFile(outputPath, Buffer.from(imgBuffer))
  }

  private characterToAnchor(char: Character): string {
    return [char.faceFeatures, char.hair, char.wardrobe, char.accessories].filter(Boolean).join(', ')
  }
}
```

### 3.2 Env Variables
```env
RUNWARE_API_KEY=...
RUNWARE_API_BASE_URL=https://api.runware.ai/v1
RUNWARE_DEFAULT_MODEL=runware:100@1
RUNWARE_IMAGE_WIDTH=1024
RUNWARE_IMAGE_HEIGHT=576
RUNWARE_DEFAULT_STEPS=30
```

---

## 4. Integrasi Anthropic Claude API

### 4.1 Claude Service (Streaming)
```typescript
// src/services/claude.service.ts
import Anthropic from '@anthropic-ai/sdk'

export class ClaudeService {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  private model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514'

  async *streamScript(title: string, style: string, durationMin: number) {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      stream: true,
      system: SCRIPT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildScriptPrompt(title, style, durationMin) }],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }

  async suggestStyles(title: string): Promise<StyleSuggestion[]> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.2,
      system: STYLE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildStylePrompt(title) }],
    })
    return JSON.parse((msg.content[0] as Anthropic.TextBlock).text)
  }

  async scriptToScenes(script: string, bible: VisualBible): Promise<SceneInput[]> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      system: MANIFEST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildManifestPrompt(script, bible) }],
    })
    const text = (msg.content[0] as Anthropic.TextBlock).text
    try {
      return JSON.parse(text)
    } catch {
      // Repair fallback
      return await this.repairJson(text)
    }
  }
}
```

### 4.2 SSE Route Handler (Streaming Script)
```typescript
// app/api/projects/[id]/generate-script/route.ts

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { narrativeStyle, targetDurationMin } = await req.json()
  const project = await prisma.project.findUniqueOrThrow({ where: { id: params.id } })

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  // Run async, don't await
  ;(async () => {
    let fullScript = ''
    for await (const chunk of claudeService.streamScript(
      project.title, narrativeStyle, targetDurationMin
    )) {
      fullScript += chunk
      await writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
    }
    // Simpan script ke DB
    await prisma.project.update({ where: { id: params.id }, data: { script: fullScript } })
    await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
    await writer.close()
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## 5. BullMQ Job Queue

### 5.1 Queue Definitions
```typescript
// src/lib/queue.ts
import { Queue } from 'bullmq'
import { redis } from './redis'

export const voiceQueue = new Queue('voice', { connection: redis })
export const imageQueue = new Queue('image', { connection: redis })
export const renderQueue = new Queue('render', { connection: redis })
```

### 5.2 Voice Worker
```typescript
// src/workers/voice.worker.ts
import { Worker, Job } from 'bullmq'

const worker = new Worker('voice', async (job: Job) => {
  if (job.name === 'voice:all') {
    const scenes = await prisma.scene.findMany({
      where: { projectId: job.data.projectId, voicefilePath: null },
      orderBy: { sceneIndex: 'asc' },
    })
    for (const scene of scenes) {
      await voiceQueue.add('voice:single', {
        projectId: job.data.projectId,
        sceneId: scene.id,
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
    }
    return
  }

  if (job.name === 'voice:single') {
    const scene = await prisma.scene.findUniqueOrThrow({ where: { id: job.data.sceneId } })
    const outputPath = path.join(DATA_DIR, scene.project.slug, 'voices', `scene-${pad(scene.sceneIndex)}.wav`)

    const duration = await voiceService.generateVoice(scene.text, outputPath)

    await prisma.scene.update({
      where: { id: scene.id },
      data: {
        voicefilePath: `voices/scene-${pad(scene.sceneIndex)}.wav`,
        voiceLength: duration,
        status: 'voice_done',
      },
    })

    // Broadcast SSE progress
    sseHub.broadcast(job.data.projectId, {
      event: 'voice_progress',
      sceneId: scene.id,
      sceneIndex: scene.sceneIndex,
      status: 'done',
      voiceLength: duration,
    })
  }
}, { connection: redis })
```

---

## 6. SSE Progress Hub

```typescript
// src/lib/sse-hub.ts

type Controller = ReadableStreamDefaultController<Uint8Array>

class SseHub {
  private rooms = new Map<string, Set<Controller>>()
  private encoder = new TextEncoder()

  subscribe(projectId: string, controller: Controller) {
    if (!this.rooms.has(projectId)) this.rooms.set(projectId, new Set())
    this.rooms.get(projectId)!.add(controller)
  }

  unsubscribe(projectId: string, controller: Controller) {
    this.rooms.get(projectId)?.delete(controller)
  }

  broadcast(projectId: string, event: object) {
    const data = this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
    this.rooms.get(projectId)?.forEach(controller => {
      try { controller.enqueue(data) } catch { /* client disconnected */ }
    })
  }
}

export const sseHub = new SseHub()
```

```typescript
// app/api/projects/[id]/progress/route.ts — SSE endpoint

export async function GET(req: Request, { params }: { params: { id: string } }) {
  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      sseHub.subscribe(params.id, ctrl)
    },
    cancel() {
      sseHub.unsubscribe(params.id, controller)
    },
  })

  req.signal.addEventListener('abort', () => {
    sseHub.unsubscribe(params.id, controller)
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## 7. FFmpeg Render Service

```typescript
// src/services/render.service.ts

export class RenderService {
  buildSRT(scenes: Scene[]): string {
    let srt = ''
    let cumulative = 0
    scenes.forEach((scene, i) => {
      const start = toSrtTime(cumulative)
      cumulative += scene.voiceLength!
      const end = toSrtTime(cumulative)
      srt += `${i + 1}\n${start} --> ${end}\n${scene.text}\n\n`
    })
    return srt
  }

  buildCommand(scenes: Scene[], outputPath: string, srtPath: string, fps = 30): string[] {
    const cmd: string[] = ['ffmpeg', '-y']

    for (const scene of scenes) {
      cmd.push(
        '-loop', '1', '-t', scene.voiceLength!.toFixed(3),
        '-i', scene.imagefilePath!,
        '-i', scene.voicefilePath!,
      )
    }

    const n = scenes.length
    const vLabels: string[] = []
    const aLabels: string[] = []
    const filters: string[] = []

    scenes.forEach((_, i) => {
      filters.push(`[${2*i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v${i}]`)
      filters.push(`[${2*i+1}:a]aresample=async=1[a${i}]`)
      vLabels.push(`[v${i}]`)
      aLabels.push(`[a${i}]`)
    })

    filters.push(`${vLabels.join('')}concat=n=${n}:v=1:a=0[vconcat]`)
    filters.push(`${aLabels.join('')}concat=n=${n}:v=0:a=1[aconcat]`)
    filters.push(
      `[vconcat]subtitles=${srtPath}:force_style='FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2'[vfinal]`
    )

    return [
      ...cmd,
      '-filter_complex', filters.join(';'),
      '-map', '[vfinal]', '-map', '[aconcat]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-c:a', 'aac', '-b:a', '192k',
      outputPath,
    ]
  }

  async runFFmpeg(cmd: string[], onProgress: (pct: number, line: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd[0], cmd.slice(1))
      proc.stderr.on('data', (chunk: Buffer) => {
        const line = chunk.toString()
        const frameMatch = line.match(/frame=\s*(\d+)/)
        if (frameMatch) {
          onProgress(-1, line) // pct dihitung dari total frames jika diketahui
        }
      })
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`)))
    })
  }
}
```

---

## 8. Environment Variables Reference

```env
# === Server ===
NODE_ENV=development

# === Database ===
DATABASE_URL=postgresql://postgres:password@postgres:5432/youtube_automation

# === Redis ===
REDIS_URL=redis://redis:6379

# === File Storage ===
DATA_BASE_DIR=/data/stories

# === Anthropic Claude ===
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# === SumoPod Voice ===
SUMOPOD_API_KEY=...
SUMOPOD_API_BASE_URL=https://api.sumopod.com/v1
SUMOPOD_VOICE_ID=Wise_Woman

# === Runware Image ===
RUNWARE_API_KEY=...
RUNWARE_API_BASE_URL=https://api.runware.ai/v1
RUNWARE_DEFAULT_MODEL=runware:100@1
RUNWARE_IMAGE_WIDTH=1024
RUNWARE_IMAGE_HEIGHT=576
RUNWARE_DEFAULT_STEPS=30
```

---

## 9. Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: youtube_automation
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build:
      context: .
      target: nextjs
    env_file: .env.local
    volumes:
      - stories_data:/data/stories
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      target: worker
    env_file: .env.local
    volumes:
      - stories_data:/data/stories
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  stories_data:
```

### Dockerfile (multi-stage)
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# Next.js build
FROM base AS nextjs
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# BullMQ worker
FROM base AS worker
CMD ["npx", "ts-node", "workers/index.ts"]
```

---

## 10. Makefile

```makefile
.PHONY: dev migrate build test

dev:
	docker-compose up

dev-app:
	npm run dev

dev-worker:
	npm run worker

dev-all:
	npm run dev:all

migrate:
	npx prisma migrate dev

migrate-deploy:
	npx prisma migrate deploy

studio:
	npx prisma studio

build:
	npm run build

test:
	npm test

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
```
