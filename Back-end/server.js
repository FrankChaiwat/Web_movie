const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { connectDB, pool } = require('./db');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to Back-end/.env.');
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${require('crypto').randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => {
    const isPoster = file.fieldname === 'poster' &&
      /^image\/(jpeg|png|webp)$/.test(file.mimetype);
    const isVideo = file.fieldname === 'video' &&
      /^video\/(mp4|webm)$/.test(file.mimetype);

    if (isPoster || isVideo) {
      callback(null, true);
    } else {
      callback(new Error('Use JPG, PNG, or WebP posters and MP4 or WebM videos.'));
    }
  },
});

const movieUpload = upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

function parseMovieInput(body) {
  const { title, description = '', genre = '', releaseYear = '', posterUrl = '', videoUrl = '' } = body;
  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'กรุณากรอกชื่อหนัง' };
  }

  const validUrl = (value) => {
    if (!value) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };
  if (typeof posterUrl !== 'string' || typeof videoUrl !== 'string' ||
      !validUrl(posterUrl) || !validUrl(videoUrl)) {
    return { error: 'ลิงก์รูปปกและวิดีโอต้องเป็น URL ที่ถูกต้อง' };
  }

  const parsedYear = releaseYear ? Number(releaseYear) : null;
  if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100)) {
    return { error: 'ปีที่ฉายไม่ถูกต้อง' };
  }

  if (typeof description !== 'string' || typeof genre !== 'string') {
    return { error: 'รายละเอียดหนังไม่ถูกต้อง' };
  }

  return {
    value: {
      title: title.trim(),
      description: description.trim(),
      genre: genre.trim(),
      releaseYear: parsedYear,
      posterUrl: posterUrl.trim(),
      videoUrl: videoUrl.trim(),
    },
  };
}

async function cleanupUploads(files) {
  await Promise.all(files.filter(Boolean).map((file) =>
    fs.promises.unlink(file.path).catch((error) => {
      if (error.code !== 'ENOENT') console.error('Could not remove an unreferenced upload:', error);
    })
  ));
}

async function removeUploadedMedia(urls) {
  for (const url of new Set(urls)) {
    if (url?.startsWith('/uploads/')) {
      const filename = path.basename(url);
      await fs.promises.unlink(path.join(uploadsDir, filename)).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Could not remove uploaded movie media:', error);
      });
    }
  }
}

const requireAdmin = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload !== 'object' || payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Please sign in as an administrator.' });
  }
};

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ message: 'Set ADMIN_USERNAME and ADMIN_PASSWORD in Back-end/.env.' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, username });
});

const movieSelect = `SELECT id::int AS id, title, description, genre, release_year AS "releaseYear",
                            poster_url AS "posterUrl", video_url AS "videoUrl",
                            is_published AS "isPublished", sort_order AS "sortOrder",
                            created_at AS "createdAt"
                     FROM movies`;

app.get('/api/movies', async (_req, res) => {
  try {
    const result = await pool.query(
      `${movieSelect}
       WHERE is_published = TRUE
       ORDER BY sort_order ASC, created_at DESC, id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ message: 'โหลดรายการหนังไม่สำเร็จ' });
  }
});

app.get('/api/admin/movies', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `${movieSelect}
       ORDER BY sort_order ASC, created_at DESC, id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin movies:', error);
    res.status(500).json({ message: 'โหลดรายการหนังไม่สำเร็จ' });
  }
});

app.post(
  '/api/admin/movies',
  requireAdmin,
  movieUpload,
  async (req, res) => {
    const posterFile = req.files?.poster?.[0];
    const videoFile = req.files?.video?.[0];
    const parsed = parseMovieInput(req.body);
    if (parsed.error) {
      await cleanupUploads([posterFile, videoFile]);
      return res.status(400).json({ message: parsed.error });
    }
    const { title, description, genre, releaseYear, posterUrl, videoUrl } = parsed.value;

    try {
      const result = await pool.query(
        `INSERT INTO movies (title, description, genre, release_year, poster_url, video_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(sort_order) + 1 FROM movies), 1))
         RETURNING id::int AS id, title, description, genre, release_year AS "releaseYear",
                   poster_url AS "posterUrl", video_url AS "videoUrl",
                   is_published AS "isPublished", sort_order AS "sortOrder",
                   created_at AS "createdAt"`,
        [
          title,
          description,
          genre,
          releaseYear,
          posterFile ? `/uploads/${posterFile.filename}` : posterUrl,
          videoFile ? `/uploads/${videoFile.filename}` : videoUrl,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await cleanupUploads([posterFile, videoFile]);
      console.error('Error adding movie:', error);
      res.status(500).json({ message: 'เพิ่มหนังไม่สำเร็จ' });
    }
  }
);

app.put(
  '/api/admin/movies/:id',
  requireAdmin,
  (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: 'รหัสหนังไม่ถูกต้อง' });
    }
    next();
  },
  movieUpload,
  async (req, res) => {
    const posterFile = req.files?.poster?.[0];
    const videoFile = req.files?.video?.[0];
    const parsed = parseMovieInput(req.body);
    if (parsed.error) {
      await cleanupUploads([posterFile, videoFile]);
      return res.status(400).json({ message: parsed.error });
    }

    try {
      const existingResult = await pool.query(
        'SELECT poster_url, video_url FROM movies WHERE id = $1',
        [req.params.id]
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await cleanupUploads([posterFile, videoFile]);
        return res.status(404).json({ message: 'ไม่พบหนังที่ต้องการแก้ไข' });
      }

      const { title, description, genre, releaseYear, posterUrl, videoUrl } = parsed.value;
      const nextPoster = posterFile
        ? `/uploads/${posterFile.filename}`
        : posterUrl || (req.body.clearPoster === 'true' ? '' : existing.poster_url);
      const nextVideo = videoFile
        ? `/uploads/${videoFile.filename}`
        : videoUrl || (req.body.clearVideo === 'true' ? '' : existing.video_url);

      const result = await pool.query(
        `UPDATE movies
         SET title = $1, description = $2, genre = $3, release_year = $4,
             poster_url = $5, video_url = $6
         WHERE id = $7
         RETURNING id::int AS id, title, description, genre, release_year AS "releaseYear",
                   poster_url AS "posterUrl", video_url AS "videoUrl",
                   is_published AS "isPublished", sort_order AS "sortOrder",
                   created_at AS "createdAt"`,
        [title, description, genre, releaseYear, nextPoster, nextVideo, req.params.id]
      );

      const oldMedia = [];
      if (existing.poster_url !== nextPoster) oldMedia.push(existing.poster_url);
      if (existing.video_url !== nextVideo) oldMedia.push(existing.video_url);
      await removeUploadedMedia(oldMedia);
      res.json(result.rows[0]);
    } catch (error) {
      await cleanupUploads([posterFile, videoFile]);
      console.error('Error updating movie:', error);
      res.status(500).json({ message: 'แก้ไขหนังไม่สำเร็จ' });
    }
  }
);

app.patch('/api/admin/movies/:id', requireAdmin, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: 'รหัสหนังไม่ถูกต้อง' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE movies IN SHARE ROW EXCLUSIVE MODE');
    const current = await client.query(
      'SELECT id, is_published AS "isPublished", sort_order AS "sortOrder" FROM movies ORDER BY sort_order, id'
    );
    const movieIndex = current.rows.findIndex((movie) => String(movie.id) === req.params.id);
    if (movieIndex < 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบหนังที่ต้องการแก้ไข' });
    }

    if (typeof req.body.isPublished === 'boolean') {
      await client.query(
        'UPDATE movies SET is_published = $1 WHERE id = $2',
        [req.body.isPublished, req.params.id]
      );
    }

    if (req.body.move === 'up' || req.body.move === 'down') {
      const neighborIndex = req.body.move === 'up' ? movieIndex - 1 : movieIndex + 1;
      if (neighborIndex >= 0 && neighborIndex < current.rows.length) {
        const movie = current.rows[movieIndex];
        const neighbor = current.rows[neighborIndex];
        await client.query(
          `UPDATE movies
           SET sort_order = CASE id
             WHEN $1 THEN $3::bigint
             WHEN $2 THEN $4::bigint
           END
           WHERE id IN ($1, $2)`,
          [movie.id, neighbor.id, neighbor.sortOrder, movie.sortOrder]
        );
      }
    }

    await client.query('COMMIT');
    const result = await pool.query(
      `${movieSelect} WHERE id = $1`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating movie settings:', error);
    res.status(500).json({ message: 'ปรับการเผยแพร่หรือลำดับหนังไม่สำเร็จ' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/movies/:id', requireAdmin, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: 'รหัสหนังไม่ถูกต้อง' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM movies WHERE id = $1 RETURNING poster_url AS "posterUrl", video_url AS "videoUrl"',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: 'ไม่พบหนังที่ต้องการลบ' });
    }

    await removeUploadedMedia([result.rows[0].posterUrl, result.rows[0].videoUrl]);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ message: 'ลบหนังไม่สำเร็จ' });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE'
      ? 'ไฟล์วิดีโอมีขนาดเกิน 1 GB'
      : 'ไฟล์ที่อัปโหลดไม่ถูกต้อง' });
  }
  if (error) {
    console.error('Request error:', error);
    return res.status(400).json({ message: error.message || 'คำขอไม่ถูกต้อง' });
  }
});

const PORT = Number(process.env.PORT || 3001);
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Movie server running on port ${PORT}`));
  })
  .catch(async (error) => {
    console.error('PostgreSQL connection error:', error.message);
    await pool.end();
    process.exitCode = 1;
  });
