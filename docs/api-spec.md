# API Specification
## YouTube Story Video Automation

**Base URL:** `http://localhost:8080/api`  
**WebSocket:** `ws://localhost:8080/ws`  
**Content-Type:** `application/json`

---

## Projects

### POST /api/projects
Buat project baru.

**Request:**
```json
{
  "title": "Ibnu Sina dan Kesabarannya"
}
```

**Response 201:**
```json
{
  "id": "01J2XKPM...",
  "slug": "ibnu-sina-dan-kesabarannya",
  "title": "Ibnu Sina dan Kesabarannya",
  "status": "draft",
  "style_choice": null,
  "created_at": "2026-04-11T10:00:00Z"
}
```

---

### GET /api/projects
List semua projects.

**Response 200:**
```json
{
  "projects": [
    {
      "id": "01J2XKPM...",
      "slug": "ibnu-sina-dan-kesabarannya",
      "title": "Ibnu Sina dan Kesabarannya",
      "status": "rendering",
      "scene_count": 24,
      "voices_done": 24,
      "images_done": 24,
      "created_at": "2026-04-11T10:00:00Z"
    }
  ]
}
```

---

### GET /api/projects/:id
Detail project.

**Response 200:**
```json
{
  "id": "...",
  "slug": "...",
  "title": "...",
  "status": "...",
  "style_choice": "classic_illustration",
  "script": "...",
  "scene_count": 24,
  "voices_done": 20,
  "images_done": 24,
  "render_output": null
}
```

---

### DELETE /api/projects/:id
Hapus project beserta semua file.

**Response 204:** (no content)

---

## Scenes

### GET /api/projects/:id/scenes
List scenes sesuai urutan.

**Response 200:**
```json
{
  "scenes": [
    {
      "id": "...",
      "scene_index": 1,
      "text": "Hari ini kita belajar fokus saat keadaan sulit.",
      "image_prompt": "pencil drawing of a thinker...",
      "voicefile_path": "voices/scene-001.wav",
      "voice_length": 7.42,
      "imagefile_path": "images/scene-001.png",
      "status": "complete"
    }
  ]
}
```

---

### POST /api/projects/:id/scenes
Tambah scene baru.

**Request:**
```json
{
  "text": "Narasi scene baru.",
  "image_prompt": "image prompt di sini",
  "insert_after": 3
}
```

---

### PUT /api/projects/:id/scenes/:scene_id
Update scene.

**Request:**
```json
{
  "text": "Updated narration.",
  "image_prompt": "Updated image prompt."
}
```

---

### DELETE /api/projects/:id/scenes/:scene_id
Hapus scene.

---

### PUT /api/projects/:id/scenes/reorder
Reorder scenes.

**Request:**
```json
{
  "scene_ids": ["id1", "id2", "id3", "..."]
}
```

---

### POST /api/projects/:id/validate
Validasi manifest sebelum render.

**Response 200:**
```json
{
  "valid": true,
  "errors": [],
  "scene_count": 24,
  "total_duration_sec": 642.5
}
```

**Response 422 (validation failed):**
```json
{
  "valid": false,
  "errors": [
    "scene[3]: voice_length is null",
    "scene[7]: imagefile_path missing"
  ]
}
```

---

## Script & AI

### POST /api/projects/:id/generate-script
Generate skrip dari judul. Streaming response (SSE).

**Request:**
```json
{
  "narrative_style": "historical",
  "target_duration_min": 10
}
```

**Response:** `text/event-stream`
```
data: {"chunk": "Di tahun 980 Masehi, "}
data: {"chunk": "seorang anak berusia 10 tahun..."}
data: {"done": true, "script": "<full script text>"}
```

---

### POST /api/projects/:id/suggest-styles
Dapatkan saran gaya visual.

**Response 200:**
```json
{
  "suggestions": [
    {
      "id": "classic_illustration",
      "name": "Classic Illustration",
      "description": "Monochrome sketch, etching texture, chiaroscuro lighting",
      "recommended": true,
      "reason": "Cocok untuk konten sejarah, memberikan nuansa klasik dan intelektual"
    },
    {
      "id": "watercolor_historical",
      "name": "Watercolor Historical",
      "description": "Soft watercolor, warm earth tones, painterly style",
      "recommended": false,
      "reason": "Visual lebih hangat, cocok jika target audiens lebih muda"
    },
    {
      "id": "cinematic_dark",
      "name": "Cinematic Dark",
      "description": "High contrast, dark moody, dramatic lighting",
      "recommended": false,
      "reason": "Lebih dramatis, cocok untuk narasi konflik atau krisis"
    }
  ]
}
```

---

### POST /api/projects/:id/select-style
Konfirmasi pilihan gaya visual.

**Request:**
```json
{
  "style_id": "classic_illustration"
}
```

---

### POST /api/projects/:id/script-to-scenes
Konversi skrip menjadi scene manifest.

**Request:**
```json
{
  "script": "Hari ini kita bicara tentang..."
}
```

**Response 200:**
```json
{
  "scenes_created": 24,
  "message": "Script berhasil dikonversi menjadi 24 scenes"
}
```

---

## Visual Bible

### GET /api/projects/:id/visual-bible

**Response 200:**
```json
{
  "main_characters": [
    {
      "id": "char_hero",
      "name": "Ibnu Sina",
      "age_range": "middle-aged",
      "face_features": "oval face, full short beard, calm eyes",
      "hair": "dark, shoulder length",
      "wardrobe": "cream robe, dark outer cloak, leather belt",
      "accessories": "ink pen, manuscript bag",
      "expression_default": "focused and contemplative"
    }
  ],
  "environments": [
    {
      "id": "env_library",
      "name": "Ancient Library",
      "description": "10th century Islamic library, candlelight, manuscripts",
      "lighting": "warm candlelight, chiaroscuro"
    }
  ],
  "color_palette": ["#C4A882", "#2C1810", "#F5F0E8"],
  "camera_language": "medium shot, slight low angle, 16:9",
  "negative_rules": ["no text", "no watermark", "no modern elements"],
  "style_anchor_tokens": "pencil drawing, monochrome sketch, etching texture, chiaroscuro",
  "style_id": "classic_illustration"
}
```

### PUT /api/projects/:id/visual-bible
Update visual bible (body sama dengan GET response).

---

## Voice Generation

### POST /api/projects/:id/generate-voices
Mulai job generate voice untuk semua scenes.

**Request:**
```json
{
  "skip_existing": true,
  "voice_style": "adult_male_calm"
}
```

**Response 202:**
```json
{
  "job_id": "...",
  "message": "Voice generation job started for 24 scenes"
}
```

---

### POST /api/projects/:id/scenes/:scene_id/generate-voice
Generate voice untuk satu scene.

**Response 202:**
```json
{
  "job_id": "...",
  "scene_id": "..."
}
```

---

### GET /api/projects/:id/voices/:scene_id
Serve file audio (binary).

**Response:** `audio/wav` file

---

## Image Generation

### POST /api/projects/:id/generate-images
Mulai job generate image untuk semua scenes.

**Request:**
```json
{
  "skip_existing": true,
  "model": "runware:100@1",
  "steps": 30
}
```

**Response 202:**
```json
{
  "job_id": "...",
  "message": "Image generation job started for 24 scenes"
}
```

---

### POST /api/projects/:id/scenes/:scene_id/generate-image
Generate image ulang untuk satu scene.

---

### GET /api/projects/:id/images/:scene_id
Serve file gambar (binary).

**Response:** `image/png` file

---

## Video Render

### POST /api/projects/:id/render
Mulai render video akhir.

**Request:**
```json
{
  "fps": 30,
  "burn_subtitles": true,
  "subtitle_style": "default"
}
```

**Response 202:**
```json
{
  "job_id": "...",
  "message": "Render job started"
}
```

---

### GET /api/projects/:id/render-status

**Response 200:**
```json
{
  "status": "rendering",
  "progress_pct": 67,
  "current_frame": 4020,
  "total_frames": 6000,
  "elapsed_sec": 45,
  "estimated_remaining_sec": 22
}
```

---

### GET /api/projects/:id/download
Download video akhir.

**Response:** `video/mp4` file (Content-Disposition: attachment)

---

## Jobs

### GET /api/jobs/:job_id
Status job.

**Response 200:**
```json
{
  "id": "...",
  "type": "voice_gen",
  "status": "running",
  "progress_pct": 45,
  "error_msg": null,
  "started_at": "2026-04-11T10:05:00Z",
  "finished_at": null
}
```

---

## WebSocket Events

**Connect:** `ws://localhost:8080/ws/projects/:id`

### Events dari Server → Client

**voice_progress**
```json
{
  "event": "voice_progress",
  "scene_id": "...",
  "scene_index": 3,
  "status": "done",
  "voice_length": 7.42
}
```

**image_progress**
```json
{
  "event": "image_progress",
  "scene_id": "...",
  "scene_index": 5,
  "status": "done"
}
```

**render_progress**
```json
{
  "event": "render_progress",
  "progress_pct": 67,
  "current_frame": 4020,
  "log_line": "frame= 4020 fps=134 q=28.0 size=   45056kB time=00:02:14.00"
}
```

**job_complete**
```json
{
  "event": "job_complete",
  "job_id": "...",
  "type": "render",
  "status": "done"
}
```

**job_error**
```json
{
  "event": "job_error",
  "job_id": "...",
  "type": "voice_gen",
  "scene_id": "...",
  "error": "SumoPod API timeout"
}
```

---

## Error Response Format

Semua error menggunakan format:

```json
{
  "error": "project not found",
  "code": "PROJECT_NOT_FOUND",
  "status": 404
}
```

### Error Codes

| Code | HTTP Status | Deskripsi |
|------|-------------|-----------|
| `PROJECT_NOT_FOUND` | 404 | Project tidak ditemukan |
| `SCENE_NOT_FOUND` | 404 | Scene tidak ditemukan |
| `VALIDATION_FAILED` | 422 | Manifest tidak valid |
| `JOB_IN_PROGRESS` | 409 | Job sudah berjalan |
| `ASSET_MISSING` | 422 | File asset belum ada |
| `SUMOPOD_ERROR` | 502 | Error dari SumoPod API |
| `RUNWARE_ERROR` | 502 | Error dari Runware API |
| `CLAUDE_ERROR` | 502 | Error dari Claude API |
| `RENDER_FAILED` | 500 | FFmpeg render gagal |
