# Product Requirements Document (PRD)
## YouTube Story Video Automation — Web Application

**Version:** 1.0.0  
**Tanggal:** 2026-04-11  
**Status:** Draft  
**Owner:** Engineering Team

---

## 1. Ringkasan Produk

Sebuah aplikasi web yang mengotomasi proses produksi video YouTube gaya faceless/narrated story. Pengguna cukup memasukkan judul video, memilih gaya visual, dan sistem akan menghasilkan skrip, suara, gambar, hingga video akhir secara otomatis dari satu sumber kebenaran: `scene_manifest.json`.

---

## 2. Tujuan & Target

### 2.1 Tujuan Bisnis
- Mempercepat produksi konten YouTube faceless dari hitungan hari menjadi hitungan jam.
- Menurunkan kebutuhan sumber daya manusia untuk editing dan produksi voice-over.
- Menyediakan sistem yang dapat diulang (repeatable) untuk batch produksi konten.

### 2.2 Target Pengguna
- Content creator YouTube yang memproduksi konten faceless Indonesia.
- Tim media edukasi yang memproduksi video explainer.
- Solo creator yang ingin otomasi narasi video tanpa keahlian teknis.

### 2.3 Definisi Sukses
- Pengguna dapat menghasilkan video 8–12 menit hanya dari input judul, tanpa menulis skrip manual.
- Seluruh pipeline (skrip → voice → gambar → video) selesai dalam ≤ 30 menit.
- Konsistensi visual karakter & environment terjaga antar scene.

---

## 3. Ruang Lingkup

### 3.1 Dalam Lingkup (In Scope)
- Manajemen project (buat, lihat, edit, hapus)
- Penulisan & edit skrip berbantuan AI (Claude)
- Saran gaya visual otomatis berdasarkan judul
- Pembuatan & manajemen `scene_manifest.json`
- Generate voice menggunakan **SumoPod API** (model: `minimax/speech-2.8-hd`)
- Generate image menggunakan **Runware API**
- Render video akhir menggunakan FFmpeg (server-side)
- Real-time progress tracking via WebSocket
- Download video hasil render
- Visual Bible per project (konsistensi karakter & environment)

### 3.2 Di Luar Lingkup (Out of Scope — v1)
- Upload langsung ke YouTube
- Background music auto-sync
- Multi-bahasa selain Indonesia
- Mobile native app
- Kolaborasi multi-user per project

---

## 4. Fitur & User Stories

### 4.1 Project Management

| ID | User Story | Prioritas |
|----|-----------|-----------|
| PM-01 | Sebagai pengguna, saya bisa membuat project baru dengan mengisi judul video. | P0 |
| PM-02 | Sebagai pengguna, saya bisa melihat daftar semua project beserta statusnya. | P0 |
| PM-03 | Sebagai pengguna, saya bisa menghapus project yang tidak dibutuhkan. | P1 |
| PM-04 | Sebagai pengguna, saya bisa menduplikasi project sebagai template. | P2 |

### 4.2 Script Generation

| ID | User Story | Prioritas |
|----|-----------|-----------|
| SG-01 | Sebagai pengguna, saya bisa meminta AI generate skrip lengkap dari judul video. | P0 |
| SG-02 | Sebagai pengguna, saya bisa mengedit skrip yang dihasilkan AI sebelum melanjutkan. | P0 |
| SG-03 | Sebagai pengguna, saya bisa memilih pola narasi (historical, medical, productivity). | P1 |
| SG-04 | Sebagai pengguna, saya bisa regenerate bagian tertentu dari skrip tanpa mengubah yang lain. | P1 |

### 4.3 Scene Manifest

| ID | User Story | Prioritas |
|----|-----------|-----------|
| SC-01 | Sebagai pengguna, saya bisa meminta AI konversi skrip menjadi scene manifest JSON. | P0 |
| SC-02 | Sebagai pengguna, saya bisa melihat, mengedit, menambah, dan menghapus scene. | P0 |
| SC-03 | Sebagai pengguna, saya bisa melihat preview teks narasi tiap scene. | P0 |
| SC-04 | Sebagai pengguna, saya bisa reorder scene dengan drag-and-drop. | P1 |
| SC-05 | Sistem otomatis memvalidasi manifest sebelum generate asset. | P0 |

### 4.4 Gaya Visual & Visual Bible

| ID | User Story | Prioritas |
|----|-----------|-----------|
| VB-01 | Sebagai pengguna, saya menerima 2-3 saran gaya visual setelah memasukkan judul. | P0 |
| VB-02 | Sebagai pengguna, saya memilih gaya visual dan sistem mengunci style untuk semua scene. | P0 |
| VB-03 | Sebagai pengguna, saya bisa mengisi karakter utama di Visual Bible (wajah, pakaian, aksesori). | P1 |
| VB-04 | Sebagai pengguna, saya bisa mengisi environment anchors (lokasi, era, pencahayaan). | P1 |
| VB-05 | Sistem menyertakan character & environment anchor otomatis ke setiap image prompt. | P0 |

### 4.5 Voice Generation (SumoPod / MiniMax)

| ID | User Story | Prioritas |
|----|-----------|-----------|
| VG-01 | Sebagai pengguna, saya bisa men-generate voice untuk seluruh scene sekaligus. | P0 |
| VG-02 | Sebagai pengguna, saya bisa melihat progress generate voice per scene secara real-time. | P0 |
| VG-03 | Sebagai pengguna, saya bisa play preview audio tiap scene. | P0 |
| VG-04 | Sebagai pengguna, saya bisa regenerate voice untuk scene tertentu saja. | P1 |
| VG-05 | Sistem otomatis mengisi `voice_length` dari durasi audio yang dihasilkan. | P0 |

### 4.6 Image Generation (Runware)

| ID | User Story | Prioritas |
|----|-----------|-----------|
| IG-01 | Sebagai pengguna, saya bisa men-generate gambar untuk seluruh scene sekaligus. | P0 |
| IG-02 | Sebagai pengguna, saya bisa melihat preview gambar tiap scene. | P0 |
| IG-03 | Sebagai pengguna, saya bisa regenerate gambar untuk scene tertentu. | P1 |
| IG-04 | Sistem memblokir gambar yang mengandung teks terlihat (QA check). | P1 |

### 4.7 Video Render

| ID | User Story | Prioritas |
|----|-----------|-----------|
| VR-01 | Sebagai pengguna, saya bisa memulai render video akhir setelah semua asset siap. | P0 |
| VR-02 | Sebagai pengguna, saya bisa melihat progress render secara real-time. | P0 |
| VR-03 | Sebagai pengguna, saya bisa mengunduh video hasil render. | P0 |
| VR-04 | Render menghasilkan video MP4 H.264 + AAC, 1920×1080, 30fps, dengan subtitle burned-in. | P0 |
| VR-05 | Sebagai pengguna, saya dapat melihat estimasi durasi total video sebelum render. | P1 |

---

## 5. Arsitektur Teknis

### 5.1 Teknologi Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | **Next.js 15** — App Router, full-stack (frontend + backend) |
| API Layer | **Next.js Route Handlers** — REST API di `app/api/` |
| Database | **PostgreSQL** — project, scenes, assets |
| ORM | **Prisma** — schema, migrations, query builder |
| File Storage | **Local filesystem** (v1) / S3-compatible (v2) |
| Queue/Job | **BullMQ + Redis** — async job processing |
| WebSocket | **Server-Sent Events (SSE)** — real-time progress |
| Video Render | **FFmpeg** — server-side via `child_process.spawn` |
| AI Script | **Anthropic Claude API** — script & manifest gen |
| Voice | **SumoPod API** — model: `minimax/speech-2.8-hd` |
| Image | **Runware API** — image generation |
| Styling | **Tailwind CSS + shadcn/ui** |
| Containerisasi | **Docker + docker-compose** |

### 5.2 Komponen Utama

```
┌─────────────────────────────────────────────────┐
│             NEXT.JS 15 (App Router)              │
│                                                 │
│  app/                                           │
│  ├── (frontend) — React Server Components +     │
│  │    Client Components                         │
│  │    - Project Dashboard                       │
│  │    - Script Editor                           │
│  │    - Scene Manager (drag-drop)               │
│  │    - Asset Preview (audio/image)             │
│  │    - Render Progress                         │
│  │                                              │
│  └── api/ — Route Handlers                      │
│       - REST endpoints                          │
│       - SSE streams (real-time progress)        │
│       - BullMQ job dispatcher                   │
└──────────────────┬──────────────────────────────┘
                   │ HTTP REST + SSE
          ┌────────┴────────┐
     ┌────▼───┐  ┌───▼───┐  ┌──▼──────┐
     │Claude  │  │SumoPod│  │Runware  │
     │API     │  │TTS API│  │Image API│
     └────────┘  └───────┘  └─────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              PostgreSQL + Redis                  │
│  (Prisma ORM)   - Projects, Scenes, Jobs        │
└─────────────────────┬───────────────────────────┘
                      │
              ┌───────▼───────┐
              │  Local Files  │
              │ /data/stories │
              │  voices/      │
              │  images/      │
              │  final/       │
              └───────────────┘
```

---

## 6. Integrasi API Eksternal

### 6.1 SumoPod Voice API
- **Endpoint:** `POST https://api.sumopod.com/v1/audio/speech` *(konfirmasi endpoint aktual)*
- **Model:** `minimax/speech-2.8-hd`
- **Input:** teks narasi per scene
- **Output:** file audio (WAV/MP3)
- **Voice style:** adult male, calm, clear articulation, YouTube narration

### 6.2 Runware Image API
- **Model:** dikonfigurasi per project (default: `runware:100@1`)
- **Input:** image prompt per scene
- **Output:** PNG 1024×576 (16:9)
- **Enforcement:** negative prompt wajib include `no text, no typography, no watermark`

### 6.3 Anthropic Claude API
- **Digunakan untuk:** generate skrip, konversi skrip ke scene manifest, saran gaya visual, validasi narasi
- **Model:** `claude-sonnet-4-20250514`

---

## 7. Data Model (Ringkasan)

```
projects
  id, slug, title, status, style_choice, created_at, updated_at

visual_bibles
  id, project_id, characters (JSON), environments (JSON), 
  color_palette, camera_language, negative_rules, style_anchor_tokens

scenes
  id, project_id, scene_index, text, image_prompt,
  voicefile_path, voice_length, imagefile_path, status

jobs
  id, project_id, type (voice_gen|image_gen|render), status,
  progress_pct, error_msg, started_at, finished_at

render_outputs
  id, project_id, filepath, duration_sec, filesize_bytes, created_at
```

---

## 8. Alur Kerja Pengguna (Happy Path)

```
1. Buat Project → masukkan judul
2. Terima saran gaya visual → pilih salah satu
3. Isi Visual Bible → karakter & environment
4. AI generate skrip → review & edit skrip
5. AI konversi skrip → scene manifest (JSON)
6. Review scenes → edit/tambah/hapus jika perlu
7. Generate Voice (semua scenes) → progress bar
8. Generate Images (semua scenes) → preview
9. Validasi manifest (otomatis)
10. Render Video → progress bar
11. Download MP4
```

---

## 9. Non-Functional Requirements

| Kategori | Requirement |
|----------|-------------|
| Performa | Voice generation: ≤ 5 detik per scene |
| Performa | Image generation: ≤ 15 detik per scene |
| Performa | Render: ≤ 5 menit untuk video 10 menit |
| Keandalan | Retry otomatis 3x untuk API calls yang gagal |
| Keandalan | Lanjutkan job yang terputus (skip-existing) |
| Skalabilitas | Mendukung concurrent jobs via Redis queue |
| Keamanan | API keys disimpan di env vars, tidak di database |
| Keamanan | Semua file diakses via project-scoped path |

---

## 10. Pembatasan & Asumsi

- Server harus memiliki FFmpeg yang terinstal.
- SumoPod API endpoint dikonfirmasi sebelum implementasi.
- Image generation diasumsikan menghasilkan format PNG.
- v1 tidak mendukung background music.
- Satu pengguna per instance (tidak ada autentikasi multi-user di v1).
