# Frontend UI Flow & Component Structure
## YouTube Story Video Automation

---

## 1. Halaman & Routing

```
/                         → ProjectListPage
/projects/new             → NewProjectPage (modal or page)
/projects/:id             → ProjectDetailPage
/projects/:id/script      → ScriptEditorPage
/projects/:id/scenes      → SceneManagerPage
/projects/:id/visual-bible → VisualBiblePage
/projects/:id/assets      → AssetsPage (voice + image management)
/projects/:id/render      → RenderPage
```

---

## 2. Project List Page

```
┌─────────────────────────────────────────────────────┐
│  🎬 YouTube Story Automation          [+ New Project]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📽 Ibnu Sina dan Kesabarannya          [Open]│   │
│  │    Status: ████████░░ Images Done            │   │
│  │    24 scenes · 10m 42s · 2026-04-10          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📽 Cara Fokus 90 Menit               [Open]  │   │
│  │    Status: ██████████ Complete               │   │
│  │    18 scenes · 8m 15s · 2026-04-09           │   │
│  │    [⬇ Download]                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Project Detail Page (Pipeline Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Ibnu Sina dan Kesabarannya          [⋮ More]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pipeline Progress:                                             │
│  [1. Script ✓] → [2. Style ✓] → [3. Scenes ✓] →              │
│  [4. Visual Bible ✓] → [5. Voices ⏳ 18/24] →                 │
│  [6. Images ✓] → [7. Render ○]                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [✏ Script]   [🎬 Scenes]   [🎨 Visual Bible]                  │
│  [🔊 Voices]  [🖼 Images]   [▶ Render]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Script Editor Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Script Editor                                                  │
├──────────────────────────┬──────────────────────────────────────┤
│  Narasi Style:           │                                      │
│  [Historical ▼]          │  [▶ Generate with AI]               │
│                          │                                      │
│  Target Duration:        │  ┌──────────────────────────────┐   │
│  [10 minutes ▼]          │  │ Di tahun 980 Masehi, seorang │   │
│                          │  │ anak laki-laki berusia 10     │   │
│                          │  │ tahun duduk di pojok perpus- │   │
│  ── AI Streaming ──      │  │ takaan kota Bukhara...        │   │
│  ████████░░░░ 67%        │  │                              │   │
│                          │  │ [lanjutan script...]          │   │
│                          │  │                              │   │
│                          │  └──────────────────────────────┘   │
│                          │                                      │
│                          │  [💬 Regenerate Section]             │
│                          │  [→ Convert to Scenes]              │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## 5. Style Selection (Modal setelah buat project)

```
┌──────────────────────────────────────────────────────────────┐
│  Pilih Gaya Visual                                     [✕]   │
│  untuk: "Ibnu Sina dan Kesabarannya"                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │ ★ REKOMENDASI      │  │                    │             │
│  │                    │  │                    │             │
│  │ Classic            │  │ Watercolor         │             │
│  │ Illustration       │  │ Historical         │             │
│  │                    │  │                    │             │
│  │ Monochrome sketch, │  │ Soft watercolor,   │             │
│  │ etching texture,   │  │ warm earth tones,  │             │
│  │ chiaroscuro        │  │ painterly style    │             │
│  │                    │  │                    │             │
│  │ Cocok untuk sejarah│  │ Lebih hangat untuk │             │
│  │ dan intelektual    │  │ audiens lebih muda │             │
│  │                    │  │                    │             │
│  │  [✓ Pilih Ini]     │  │  [  Pilih Ini  ]   │             │
│  └────────────────────┘  └────────────────────┘             │
│                                                              │
│  ┌────────────────────┐                                      │
│  │ Cinematic Dark     │                                      │
│  │ High contrast,     │                                      │
│  │ dramatic lighting  │                                      │
│  │  [  Pilih Ini  ]   │                                      │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Scene Manager Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Scenes (24)          [+ Add Scene]  [✓ Validate]  [🔊 Gen All] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ≡  #1  🔊✓  🖼✓                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Text: Di tahun 980 Masehi, seorang anak laki-laki...     │   │
│  │ Image: [pencil drawing of young scholar in ancient...]    │   │
│  │ Voice: 7.42s  [▶]                         [↻ Regen Voice]│   │
│  │ [Thumbnail]                               [↻ Regen Image]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ≡  #2  🔊✓  🖼⏳                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Text: Ibnu Sina kecil sudah hafal Al-Quran...            │   │
│  │ Image: [young Ibnu Sina reading, candlelight...]          │   │
│  │ Voice: 6.18s  [▶]                         [↻ Regen Voice]│   │
│  │ [Generating... ████░░░░]                  [↻ Regen Image]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ≡  #3  🔊○  🖼○                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Text: [editable textarea]                                │   │
│  │ Image: [editable textarea]                               │   │
│  │ Voice: —                              [🔊 Generate Voice]│   │
│  │ Image: —                              [🖼 Generate Image]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Keterangan ikon status:
- 🔊✓ = voice selesai
- 🔊⏳ = voice sedang generate
- 🔊○ = voice belum ada
- 🖼✓ = gambar selesai
- 🖼⏳ = gambar sedang generate
- 🖼○ = gambar belum ada

---

## 7. Visual Bible Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Visual Bible                                    [💾 Save]      │
├──────────────────────────────┬──────────────────────────────────┤
│  Style Terpilih:             │  Karakter Utama          [+ Add] │
│  Classic Illustration        │                                  │
│  Tokens:                     │  ┌──────────────────────────┐   │
│  pencil drawing, monochrome  │  │ Ibnu Sina                │   │
│  sketch, etching texture,    │  │ Wajah: oval, janggut...  │   │
│  chiaroscuro                 │  │ Pakaian: jubah krem...   │   │
│                              │  │ Aksesori: pena, tas...   │   │
│  Negative Rules:             │  │              [✏ Edit]    │   │
│  □ no text                   │  └──────────────────────────┘   │
│  □ no watermark              │                                  │
│  □ no modern elements        │  Environment          [+ Add]    │
│  [+ Add Rule]                │                                  │
│                              │  ┌──────────────────────────┐   │
│  Color Palette:              │  │ Ancient Library          │   │
│  ●#C4A882  ●#2C1810          │  │ Abad 10 M, perpustakaan  │   │
│  ●#F5F0E8  [+ Add]           │  │ Islam, cahaya lilin      │   │
│                              │  │              [✏ Edit]    │   │
│  Camera Language:            │  └──────────────────────────┘   │
│  [medium shot, slight...]    │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## 8. Render Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Render Video                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pre-render Checklist:                                          │
│  ✅ 24/24 voices siap (total: 10m 42s)                          │
│  ✅ 24/24 images siap                                           │
│  ✅ Manifest valid                                              │
│  ✅ FFmpeg tersedia                                             │
│                                                                 │
│  Estimasi durasi video: 10 menit 42 detik                       │
│  Output: 1920×1080 · H.264 · AAC · 30fps · Subtitle burned-in  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   [▶ Mulai Render]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  --- Sedang Render ---                                          │
│  ████████████████░░░░░░░░  72%                                 │
│  Frame: 12960 / 19260  ·  Elapsed: 1m 32s  ·  ETA: ~35s       │
│                                                                 │
│  ▼ FFmpeg Log                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ frame=12960 fps=140 q=28.0 size=  92160kB time=...     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  --- Selesai ---                                                │
│  ✅ Video berhasil dibuat!  (final_video.mp4 · 284 MB)          │
│  [⬇ Download Video]  [▶ Preview]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Komponen Utama (React)

```
src/
├── pages/
│   ├── ProjectListPage.tsx
│   ├── ProjectDetailPage.tsx
│   ├── ScriptEditorPage.tsx
│   ├── SceneManagerPage.tsx
│   ├── VisualBiblePage.tsx
│   ├── AssetsPage.tsx
│   └── RenderPage.tsx
├── components/
│   ├── project/
│   │   ├── ProjectCard.tsx
│   │   ├── NewProjectModal.tsx
│   │   ├── PipelineStatusBar.tsx
│   │   └── StyleSelectionModal.tsx
│   ├── scene/
│   │   ├── SceneList.tsx        ← dnd-kit sortable
│   │   ├── SceneCard.tsx
│   │   ├── SceneEditor.tsx      ← inline edit
│   │   └── SceneStatusBadge.tsx
│   ├── visual-bible/
│   │   ├── CharacterForm.tsx
│   │   ├── EnvironmentForm.tsx
│   │   └── ColorPalettePicker.tsx
│   ├── asset/
│   │   ├── AudioPlayer.tsx      ← wavesurfer.js
│   │   ├── ImagePreview.tsx
│   │   └── AssetProgressBar.tsx
│   ├── render/
│   │   ├── PreRenderChecklist.tsx
│   │   ├── RenderProgressBar.tsx
│   │   └── FFmpegLog.tsx
│   └── common/
│       ├── PageHeader.tsx
│       ├── LoadingSpinner.tsx
│       ├── ConfirmDialog.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useWebSocket.ts     ← WebSocket connection per project
│   ├── useProjectProgress.ts
│   └── useJobStatus.ts
├── api/
│   ├── client.ts           ← Axios instance
│   ├── projects.ts
│   ├── scenes.ts
│   ├── voice.ts
│   ├── image.ts
│   └── render.ts
└── store/
    ├── projectStore.ts     ← Zustand
    └── wsStore.ts
```

---

## 10. WebSocket Hook

```typescript
// hooks/useWebSocket.ts

export function useProjectWebSocket(projectId: string) {
  const [events, setEvents] = useState<WsEvent[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/ws/projects/${projectId}`);
    
    ws.onmessage = (e) => {
      const event: WsEvent = JSON.parse(e.data);
      
      switch (event.event) {
        case 'voice_progress':
          queryClient.invalidateQueries(['scenes', projectId]);
          break;
        case 'image_progress':
          queryClient.invalidateQueries(['scenes', projectId]);
          break;
        case 'render_progress':
          // Update render progress state
          break;
        case 'job_complete':
          queryClient.invalidateQueries(['project', projectId]);
          break;
      }
      
      setEvents(prev => [...prev, event]);
    };
    
    return () => ws.close();
  }, [projectId]);
  
  return { events };
}
```
