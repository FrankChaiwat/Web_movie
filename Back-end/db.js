const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'chat_app',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

const connectDB = async () => {
  if (!process.env.PGPASSWORD || process.env.PGPASSWORD === 'change_me') {
    throw new Error('Set PGPASSWORD in Back-end/.env to your PostgreSQL password.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT '',
      release_year INTEGER,
      poster_url TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS sort_order BIGINT NOT NULL DEFAULT 0;

    WITH ranked_movies AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS position
      FROM movies
      WHERE sort_order = 0
    )
    UPDATE movies
    SET sort_order = ranked_movies.position
    FROM ranked_movies
    WHERE movies.id = ranked_movies.id;
  `);

  console.log('PostgreSQL connected; movie catalog is ready.');
};

module.exports = { connectDB, pool };
