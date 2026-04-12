# Database Schema
## YouTube Story Video Automation

**Database:** PostgreSQL 15+  
**ORM & Migration:** Prisma

---

## Prisma Model Overview

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id             String    @id @default(cuid())
  slug           String    @unique
  title          String
  status         String    @default("draft")
  styleChoice    String?
  styleTokens    String?
  script         String?
  narrativeStyle String?
  baseDir        String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  scenes           Scene[]
  visualBible      VisualBible?
  jobs             Job[]
  renderOutputs    RenderOutput[]
  styleSuggestions StyleSuggestion?

  @@index([status])
  @@index([createdAt(sort: Desc)])
}

model VisualBible {
  id                 String   @id @default(cuid())
  projectId          String   @unique
  mainCharacters     Json     @default("[]")
  environments       Json     @default("[]")
  colorPalette       Json     @default("[]")
  cameraLanguage     String?
  negativeRules      Json     @default("[]")
  styleAnchorTokens  String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Scene {
  id             String   @id @default(cuid())
  projectId      String
  sceneIndex     Int
  text           String   @default("")
  imagePrompt    String   @default("")
  voicefilePath  String?
  voiceLength    Decimal? @db.Decimal(8, 3)
  imagefilePath  String?
  imageMetadata  Json?
  status         String   @default("pending")
  errorMsg       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  jobs    Job[]

  @@unique([projectId, sceneIndex])
  @@index([projectId])
  @@index([projectId, status])
}

model Job {
  id          String    @id @default(cuid())
  projectId   String
  sceneId     String?
  type        String
  status      String    @default("queued")
  progressPct Int       @default(0)
  errorMsg    String?
  result      Json?
  queuedAt    DateTime  @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scene   Scene?  @relation(fields: [sceneId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([status])
  @@index([type, status])
}

model RenderOutput {
  id            String   @id @default(cuid())
  projectId     String
  filepath      String
  durationSec   Decimal? @db.Decimal(10, 3)
  filesizeBytes BigInt?
  fps           Int      @default(30)
  resolution    String   @default("1920x1080")
  hasSubtitles  Boolean  @default(true)
  createdAt     DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model StyleSuggestion {
  id          String   @id @default(cuid())
  projectId   String   @unique
  suggestions Json     @default("[]")
  createdAt   DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

---

---

## Tabel: `projects`

```sql
CREATE TABLE projects (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug          TEXT NOT NULL UNIQUE,
    title         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'draft',
                  -- draft | scripting | scenes_ready | voices_done | images_done | rendering | complete | error
    style_choice  TEXT,           -- ID gaya visual yang dipilih
    style_tokens  TEXT,           -- style anchor tokens yang dikunci
    script        TEXT,           -- isi skrip lengkap
    narrative_style TEXT,         -- historical | medical | productivity
    base_dir      TEXT NOT NULL,  -- path: data/stories/<slug>
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

---

## Tabel: `visual_bibles`

```sql
CREATE TABLE visual_bibles (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    main_characters     JSONB NOT NULL DEFAULT '[]',
    environments        JSONB NOT NULL DEFAULT '[]',
    color_palette       JSONB NOT NULL DEFAULT '[]',
    camera_language     TEXT,
    negative_rules      JSONB NOT NULL DEFAULT '[]',
    style_anchor_tokens TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Contoh struktur JSONB main_characters:
-- [
--   {
--     "id": "char_hero",
--     "name": "Ibnu Sina",
--     "age_range": "middle-aged",
--     "face_features": "oval face, full short beard, calm eyes",
--     "hair": "dark, shoulder length",
--     "wardrobe": "cream robe, dark outer cloak, leather belt",
--     "accessories": "ink pen, manuscript bag",
--     "expression_default": "focused and contemplative"
--   }
-- ]

-- Contoh struktur JSONB environments:
-- [
--   {
--     "id": "env_library",
--     "name": "Ancient Library",
--     "description": "10th century Islamic library, warm candlelight, dusty manuscripts",
--     "lighting": "warm candlelight, chiaroscuro shadows",
--     "era": "10th century Islamic Golden Age"
--   }
-- ]
```

---

## Tabel: `scenes`

```sql
CREATE TABLE scenes (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_index     INTEGER NOT NULL,       -- urutan 1-based
    text            TEXT NOT NULL DEFAULT '',
    image_prompt    TEXT NOT NULL DEFAULT '',
    voicefile_path  TEXT,                  -- relative: voices/scene-001.wav
    voice_length    NUMERIC(8,3),          -- durasi detik (ex: 7.420)
    imagefile_path  TEXT,                  -- relative: images/scene-001.png
    image_metadata  JSONB,                 -- {model, seed, steps, cost}
    status          TEXT NOT NULL DEFAULT 'pending',
                    -- pending | voice_generating | voice_done | image_generating | image_done | complete | error
    error_msg       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, scene_index)
);

CREATE INDEX idx_scenes_project_id ON scenes(project_id);
CREATE INDEX idx_scenes_status ON scenes(project_id, status);
```

---

## Tabel: `jobs`

```sql
CREATE TABLE jobs (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_id     TEXT REFERENCES scenes(id) ON DELETE SET NULL,
    type         TEXT NOT NULL,
                 -- script_gen | style_suggest | manifest_convert
                 -- voice_gen | voice_gen_all
                 -- image_gen | image_gen_all
                 -- render
    status       TEXT NOT NULL DEFAULT 'queued',
                 -- queued | running | done | failed | cancelled
    progress_pct INTEGER NOT NULL DEFAULT 0,  -- 0-100
    error_msg    TEXT,
    result       JSONB,
    queued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ
);

CREATE INDEX idx_jobs_project_id ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type_status ON jobs(type, status);
```

---

## Tabel: `render_outputs`

```sql
CREATE TABLE render_outputs (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filepath       TEXT NOT NULL,           -- absolute path ke final_video.mp4
    duration_sec   NUMERIC(10,3),
    filesize_bytes BIGINT,
    fps            INTEGER NOT NULL DEFAULT 30,
    resolution     TEXT NOT NULL DEFAULT '1920x1080',
    has_subtitles  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_render_outputs_project_id ON render_outputs(project_id);
```

---

## Tabel: `style_suggestions`

```sql
-- Cache saran style per project agar tidak hit AI berulang kali
CREATE TABLE style_suggestions (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suggestions JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id)
);
```

---

## Prisma Schema (`prisma/schema.prisma`)

Semua tabel didefinisikan dalam satu file `schema.prisma`. Jalankan:

```bash
npx prisma migrate dev --name init   # development
npx prisma migrate deploy            # production
```

Migrasi otomatis dibuat oleh Prisma di folder `prisma/migrations/`.

```
prisma/
├── schema.prisma
└── migrations/
    ├── 20260411000001_init/migration.sql
    ├── 20260411000002_add_style_suggestions/migration.sql
    └── ...
```

---

## Auto-update `updated_at`

Dengan Prisma, `updated_at` dihandle otomatis via annotation `@updatedAt` di schema, sehingga trigger SQL di bawah **tidak diperlukan**. Namun bisa tetap ditambahkan sebagai safety net:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_bibles_updated_at
    BEFORE UPDATE ON visual_bibles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Contoh Query Penting

### Progress project (voice & image)
```sql
SELECT
    p.id,
    p.title,
    p.status,
    COUNT(s.id) AS total_scenes,
    COUNT(s.id) FILTER (WHERE s.voicefile_path IS NOT NULL AND s.voice_length IS NOT NULL) AS voices_done,
    COUNT(s.id) FILTER (WHERE s.imagefile_path IS NOT NULL) AS images_done
FROM projects p
LEFT JOIN scenes s ON s.project_id = p.id
WHERE p.id = $1
GROUP BY p.id;
```

### Scenes untuk render (semua field terisi)
```sql
SELECT
    scene_index, text, voicefile_path, voice_length, imagefile_path
FROM scenes
WHERE project_id = $1
  AND voicefile_path IS NOT NULL
  AND voice_length IS NOT NULL
  AND imagefile_path IS NOT NULL
ORDER BY scene_index ASC;
```

### Scenes yang belum ada voice
```sql
SELECT id, scene_index, text
FROM scenes
WHERE project_id = $1
  AND voicefile_path IS NULL
ORDER BY scene_index ASC;
```
