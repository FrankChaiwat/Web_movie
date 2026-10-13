import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:3001';

interface Movie {
  id: number;
  title: string;
  description: string;
  genre: string;
  releaseYear: number | null;
  posterUrl: string;
  videoUrl: string;
  isPublished: boolean;
  sortOrder: number;
}

interface AdminLogin {
  token: string;
  username: string;
}

function mediaUrl(url: string) {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'
    : 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function getFavorites(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('reeltime-favorites') || '[]');
    return Array.isArray(stored) ? stored.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

function getPlaybackProgress(): Record<string, number> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('reeltime-progress') || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter((entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
      )
    );
  } catch {
    return {};
  }
}

function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }
  if (window.location.pathname === '/team') {
    return <DevTeamPage />;
  }
  const moviePath = window.location.pathname.match(/^\/movie\/(\d+)\/?$/);
  if (moviePath) {
    return <MovieDetailsPage movieId={Number(moviePath[1])} />;
  }
  return <MovieHome />;
}

const teamMembers = [
  {
    number: '01',
    initials: 'MC',
    name: 'Mira Chen',
    role: 'Creative Director',
    focus: 'กำหนดทิศทางของ REELTIME และคัดสรรประสบการณ์การค้นพบหนัง',
    color: 'rose',
  },
  {
    number: '02',
    initials: 'AK',
    name: 'Arun Kapoor',
    role: 'Product Designer',
    focus: 'ออกแบบหน้าจอและประสบการณ์การรับชมให้ใช้งานง่ายในทุกอุปกรณ์',
    color: 'gold',
  },
  {
    number: '03',
    initials: 'JL',
    name: 'Jamie Lee',
    role: 'Full-stack Developer',
    focus: 'พัฒนาเว็บ ระบบจัดการหนัง และแพลตฟอร์มสำหรับการรับชม',
    color: 'blue',
  },
];

function MovieHome() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(getFavorites);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    axios.get<Movie[]>(`${API_URL}/api/movies`)
      .then((response) => setMovies(response.data))
      .catch((error: unknown) => setLoadError(errorMessage(error)));
  }, []);

  const visibleMovies = useMemo(() => movies.filter((movie) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || `${movie.title} ${movie.genre} ${movie.releaseYear ?? ''}`
      .toLocaleLowerCase().includes(query);
    return matchesSearch &&
      (!genreFilter || movie.genre === genreFilter) &&
      (!yearFilter || String(movie.releaseYear ?? '') === yearFilter) &&
      (!favoritesOnly || favoriteIds.includes(movie.id));
  }), [movies, search, genreFilter, yearFilter, favoritesOnly, favoriteIds]);

  const featuredMovie = movies[0];
  const genres = useMemo(
    () => [...new Set(movies.map((movie) => movie.genre.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [movies]
  );
  const years = useMemo(
    () => [...new Set(movies.map((movie) => movie.releaseYear).filter((year): year is number => year !== null))]
      .sort((a, b) => b - a),
    [movies]
  );

  function toggleFavorite(movieId: number) {
    setFavoriteIds((current) => {
      const next = current.includes(movieId)
        ? current.filter((id) => id !== movieId)
        : [...current, movieId];
      localStorage.setItem('reeltime-favorites', JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className="movie-site">
      <header className="site-header">
        <a className="brand" href="/" aria-label="ReelTime หน้าหลัก">
          <span className="brand-mark">R</span>
          <span>REEL<span className="brand-accent">TIME</span></span>
        </a>
        <nav className="main-nav" aria-label="เมนูหลัก">
          <a className="active" href="/">หน้าแรก</a>
          <a href="#catalog">หนังทั้งหมด</a>
          <a href="/team">ทีมของเรา</a>
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="ค้นหาหนัง"
              placeholder="ค้นหาหนัง..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <a className="admin-link" href="/admin">ADMIN <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className={`hero${featuredMovie?.posterUrl ? ' has-image' : ''}`}>
        {featuredMovie?.posterUrl && (
          <img className="hero-image" src={mediaUrl(featuredMovie.posterUrl)} alt="" />
        )}
        <div className="hero-content">
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT FAVORITE</span>
          {featuredMovie ? (
            <>
              <h1>{featuredMovie.title}</h1>
              <div className="hero-meta">
                {featuredMovie.releaseYear && <span>{featuredMovie.releaseYear}</span>}
                {featuredMovie.genre && <span>{featuredMovie.genre}</span>}
                <span className="quality-tag">HD</span>
              </div>
              <p>{featuredMovie.description || 'เรื่องโปรดเรื่องใหม่ของคุณ เริ่มดูได้เลย'}</p>
              <a className="primary-button" href={`/movie/${featuredMovie.id}`}>
                <span aria-hidden="true">▶</span> ดูรายละเอียด
              </a>
            </>
          ) : (
            <>
              <h1>เรื่องโปรด<br />เรื่องต่อไปของคุณ</h1>
              <p>เติมค่ำคืนนี้ด้วยหนังเรื่องเยี่ยม<br />เลือกดูจากคอลเลกชันของเรา</p>
              <a className="primary-button" href="#catalog">เลือกดูหนัง <span aria-hidden="true">↓</span></a>
            </>
          )}
        </div>
        <div className="hero-bottom">
          <span>เรื่องดี ๆ รอให้คุณค้นพบ</span>
          <span className="hero-index">{featuredMovie ? `01 / ${String(movies.length).padStart(2, '0')}` : '01 / 01'}</span>
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading">
          <div>
            <span className="section-kicker">คัดสรรมาเพื่อคุณ</span>
            <h2>{search ? 'ผลการค้นหา' : 'หนังทั้งหมด'} <span>{visibleMovies.length}</span></h2>
          </div>
          <span className="section-note">เลือกเรื่องที่ใช่ แล้วกดรับชมได้เลย</span>
        </div>
        <div className="catalog-toolbar">
          <label className="filter-select">
            <span>หมวดหมู่</span>
            <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
              <option value="">ทุกหมวดหมู่</option>
              {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </label>
          <label className="filter-select">
            <span>ปีที่ฉาย</span>
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option value="">ทุกปี</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <button
            className={`favorites-filter${favoritesOnly ? ' selected' : ''}`}
            type="button"
            onClick={() => setFavoritesOnly((current) => !current)}
          >
            <span aria-hidden="true">{favoritesOnly ? '♥' : '♡'}</span> รายการโปรด
          </button>
          {(genreFilter || yearFilter || favoritesOnly || search) && (
            <button
              className="clear-filters"
              type="button"
              onClick={() => {
                setGenreFilter('');
                setYearFilter('');
                setFavoritesOnly(false);
                setSearch('');
              }}
            >ล้างตัวกรอง</button>
          )}
        </div>

        {loadError ? (
          <div className="empty-state error-state">
            <span className="empty-icon">!</span>
            <h3>โหลดรายการหนังไม่สำเร็จ</h3>
            <p>{loadError}</p>
          </div>
        ) : visibleMovies.length ? (
          <div className="movie-grid">
            {visibleMovies.map((movie) => (
              <article className="movie-card" key={movie.id}>
                <a className="movie-card-link" href={`/movie/${movie.id}`} aria-label={`ดูรายละเอียด ${movie.title}`}>
                  <span className="poster-wrap">
                    {movie.posterUrl
                      ? <img src={mediaUrl(movie.posterUrl)} alt={`โปสเตอร์ ${movie.title}`} />
                      : <span className="poster-placeholder"><span>R</span>REELTIME</span>}
                    <span className="poster-play" aria-hidden="true">↗</span>
                    {!movie.videoUrl && <span className="unavailable-tag">ยังไม่มีวิดีโอ</span>}
                  </span>
                  <span className="movie-card-info">
                    <span className="movie-card-title">{movie.title}</span>
                    <span className="movie-card-meta">
                      <span>{movie.releaseYear || 'หนังใหม่'}</span>
                      {movie.genre && <><span className="meta-separator">·</span><span>{movie.genre}</span></>}
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  className={`favorite-button${favoriteIds.includes(movie.id) ? ' is-favorite' : ''}`}
                  aria-label={favoriteIds.includes(movie.id) ? `นำ ${movie.title} ออกจากรายการโปรด` : `เพิ่ม ${movie.title} ในรายการโปรด`}
                  aria-pressed={favoriteIds.includes(movie.id)}
                  onClick={() => toggleFavorite(movie.id)}
                >{favoriteIds.includes(movie.id) ? '♥' : '♡'}</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">✳</span>
            <h3>{movies.length ? favoritesOnly ? 'ยังไม่มีหนังในรายการโปรด' : 'ไม่พบหนังที่ตรงกับตัวกรอง' : 'คอลเลกชันกำลังรอหนังเรื่องแรก'}</h3>
            <p>{movies.length ? 'ลองเปลี่ยนคำค้นหา หมวดหมู่ หรือปีที่ฉาย' : 'แอดมินสามารถเพิ่มหนังและรูปปกได้จากหน้า ADMIN'}</p>
            {!movies.length && <a className="text-link" href="/admin">ไปหน้าแอดมิน <span aria-hidden="true">↗</span></a>}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="/"><span className="brand-mark">R</span><span>REEL<span className="brand-accent">TIME</span></span></a>
        <span>สร้างช่วงเวลาดูหนังดี ๆ ให้เป็นของคุณ</span>
        <a className="footer-team-link" href="/team">ทีมของเรา <span aria-hidden="true">↗</span></a>
        <span>© {new Date().getFullYear()} REELTIME</span>
      </footer>

    </main>
  );
}

function MovieDetailsPage({ movieId }: { movieId: number }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadError, setLoadError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<number[]>(getFavorites);
  const [resumePosition, setResumePosition] = useState(() => getPlaybackProgress()[String(movieId)] ?? 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedTime = useRef(0);

  useEffect(() => {
    axios.get<Movie[]>(`${API_URL}/api/movies`)
      .then((response) => setMovies(response.data))
      .catch((error: unknown) => setLoadError(errorMessage(error)));
  }, []);

  const movie = movies.find((item) => item.id === movieId);
  const savedTime = resumePosition;
  const recommendations = movies
    .filter((item) => item.id !== movieId)
    .sort((first, second) => {
      const firstSameGenre = Boolean(movie?.genre && first.genre === movie.genre);
      const secondSameGenre = Boolean(movie?.genre && second.genre === movie.genre);
      return Number(secondSameGenre) - Number(firstSameGenre) ||
        first.sortOrder - second.sortOrder;
    })
    .slice(0, 4);

  function toggleFavorite() {
    if (!movie) return;
    setFavoriteIds((current) => {
      const next = current.includes(movie.id)
        ? current.filter((id) => id !== movie.id)
        : [...current, movie.id];
      localStorage.setItem('reeltime-favorites', JSON.stringify(next));
      return next;
    });
  }

  function saveProgress(video: HTMLVideoElement) {
    if (!movie || !Number.isFinite(video.currentTime)) return;
    const key = String(movie.id);
    const currentProgress = getPlaybackProgress();
    if (video.ended || (video.duration && video.duration - video.currentTime < 10)) {
      delete currentProgress[key];
    } else if (video.currentTime >= 1) {
      currentProgress[key] = video.currentTime;
    }
    localStorage.setItem('reeltime-progress', JSON.stringify(currentProgress));
    lastSavedTime.current = video.currentTime;
    setResumePosition(currentProgress[key] ?? 0);
  }

  function resumePlayback() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    const currentProgress = getPlaybackProgress();
    delete currentProgress[String(movieId)];
    localStorage.setItem('reeltime-progress', JSON.stringify(currentProgress));
    lastSavedTime.current = 0;
    setResumePosition(0);
  }

  return (
    <main className="movie-site details-site">
      <header className="site-header">
        <a className="brand" href="/" aria-label="ReelTime หน้าหลัก"><span className="brand-mark">R</span><span>REEL<span className="brand-accent">TIME</span></span></a>
        <nav className="main-nav" aria-label="เมนูหลัก">
          <a href="/">หน้าแรก</a>
          <a className="active" href="/#catalog">หนังทั้งหมด</a>
          <a href="/team">ทีมของเรา</a>
        </nav>
        <a className="admin-link" href="/admin">ADMIN <span aria-hidden="true">↗</span></a>
      </header>

      <div className="details-content">
        <a className="back-link" href="/#catalog"><span aria-hidden="true">←</span> กลับไปเลือกหนัง</a>
        {loadError ? (
          <div className="empty-state error-state"><span className="empty-icon">!</span><h3>โหลดข้อมูลหนังไม่สำเร็จ</h3><p>{loadError}</p></div>
        ) : movie ? (
          <>
            <section className="movie-detail">
              <div className="detail-poster">
                {movie.posterUrl
                  ? <img src={mediaUrl(movie.posterUrl)} alt={`โปสเตอร์ ${movie.title}`} />
                  : <span className="poster-placeholder"><span>R</span>REELTIME</span>}
              </div>
              <div className="detail-info">
                <span className="eyebrow"><span className="eyebrow-dot" /> REELTIME SELECTION</span>
                <h1>{movie.title}</h1>
                <div className="detail-meta">
                  {movie.releaseYear && <span>{movie.releaseYear}</span>}
                  {movie.genre && <span>{movie.genre}</span>}
                  <span className="quality-tag">HD</span>
                </div>
                <p className="detail-description">{movie.description || 'ไม่มีเรื่องย่อสำหรับหนังเรื่องนี้'}</p>
                <div className="detail-actions">
                  {movie.videoUrl && <a className="primary-button" href="#watch"><span aria-hidden="true">▶</span> รับชมเลย</a>}
                  <button className={`detail-favorite${favoriteIds.includes(movie.id) ? ' is-favorite' : ''}`} type="button" onClick={toggleFavorite}>
                    <span aria-hidden="true">{favoriteIds.includes(movie.id) ? '♥' : '♡'}</span>
                    {favoriteIds.includes(movie.id) ? 'อยู่ในรายการโปรด' : 'เพิ่มในรายการโปรด'}
                  </button>
                </div>
              </div>
            </section>

            {movie.videoUrl && (
              <section className="watch-section" id="watch">
                <div className="section-heading">
                  <div><span className="section-kicker">พร้อมแล้วสำหรับคุณ</span><h2>รับชมหนัง</h2></div>
                  {savedTime > 5 && <span className="resume-note">บันทึกตำแหน่งรับชมไว้ที่ {formatTime(savedTime)}</span>}
                </div>
                <div className="detail-player">
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    preload="metadata"
                    src={mediaUrl(movie.videoUrl)}
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      const resumeAt = resumePosition;
                      if (resumeAt > 5 && video.duration - resumeAt > 10) {
                        video.currentTime = resumeAt;
                        lastSavedTime.current = resumeAt;
                      }
                    }}
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget;
                      if (Math.abs(video.currentTime - lastSavedTime.current) >= 5) saveProgress(video);
                    }}
                    onPause={(event) => saveProgress(event.currentTarget)}
                    onEnded={(event) => saveProgress(event.currentTarget)}
                  />
                </div>
                {savedTime > 5 && <button className="restart-button" type="button" onClick={resumePlayback}>เริ่มดูตั้งแต่ต้น</button>}
              </section>
            )}

            {!!recommendations.length && (
              <section className="recommendations-section">
                <div className="section-heading"><div><span className="section-kicker">ดูเรื่องต่อไป</span><h2>หนังที่คุณอาจชอบ</h2></div><span className="section-note">{movie.genre ? `คัดจากหมวด ${movie.genre} และเรื่องแนะนำ` : 'คัดสรรมาเพื่อคุณ'}</span></div>
                <div className="movie-grid">
                  {recommendations.map((recommendation) => (
                    <a className="movie-card movie-card-link" key={recommendation.id} href={`/movie/${recommendation.id}`}>
                      <span className="poster-wrap">
                        {recommendation.posterUrl
                          ? <img src={mediaUrl(recommendation.posterUrl)} alt={`โปสเตอร์ ${recommendation.title}`} />
                          : <span className="poster-placeholder"><span>R</span>REELTIME</span>}
                        <span className="poster-play" aria-hidden="true">↗</span>
                      </span>
                      <span className="movie-card-info">
                        <span className="movie-card-title">{recommendation.title}</span>
                        <span className="movie-card-meta">{recommendation.releaseYear || 'หนังใหม่'}{recommendation.genre && <> <span className="meta-separator">·</span> {recommendation.genre}</>}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="empty-state"><span className="empty-icon">?</span><h3>ไม่พบหนังเรื่องนี้</h3><p>หนังอาจถูกซ่อนหรือนำออกจากคอลเลกชันแล้ว</p><a className="text-link" href="/">กลับหน้าแรก</a></div>
        )}
      </div>
      <footer className="site-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">R</span><span>REEL<span className="brand-accent">TIME</span></span></a><span>สร้างช่วงเวลาดูหนังดี ๆ ให้เป็นของคุณ</span><a className="footer-team-link" href="/team">ทีมของเรา <span aria-hidden="true">↗</span></a><span>© {new Date().getFullYear()} REELTIME</span></footer>
    </main>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function DevTeamPage() {
  return (
    <main className="movie-site team-site">
      <header className="site-header">
        <a className="brand" href="/" aria-label="ReelTime หน้าหลัก">
          <span className="brand-mark">R</span>
          <span>REEL<span className="brand-accent">TIME</span></span>
        </a>
        <nav className="main-nav" aria-label="เมนูหลัก">
          <a href="/">หน้าแรก</a>
          <a href="/#catalog">หนังทั้งหมด</a>
          <a className="active" href="/team">ทีมของเรา</a>
        </nav>
        <a className="admin-link" href="/admin">ADMIN <span aria-hidden="true">↗</span></a>
      </header>

      <section className="team-hero">
        <span className="eyebrow"><span className="eyebrow-dot" /> THE PEOPLE BEHIND REELTIME</span>
        <h1>ทีมเล็ก ๆ<br /><span>กับเรื่องราวที่ยิ่งใหญ่</span></h1>
        <p>พบกับโปรไฟล์ตัวอย่างของทีม REELTIME<br />ตั้งแต่ไอเดียแรก ไปจนถึงประสบการณ์บนหน้าจอของคุณ</p>
        <span className="team-member-count"><span>03</span> TEAM MEMBERS</span>
      </section>

      <section className="team-section">
        <div className="section-heading">
          <div><span className="section-kicker">ผู้สร้างประสบการณ์</span><h2>ทีมพัฒนาของเรา <span>03</span></h2></div>
          <span className="section-note">สามความถนัด หนึ่งเป้าหมายเดียวกัน</span>
        </div>
        <div className="team-grid">
          {teamMembers.map((member) => (
            <article className="team-card" key={member.number}>
              <div className={`team-portrait portrait-${member.color}`}>
                <span className="portrait-orbit orbit-one" />
                <span className="portrait-orbit orbit-two" />
                <span className="portrait-initials">{member.initials}</span>
                <span className="portrait-number">{member.number}</span>
                <span className="portrait-spark">✳</span>
              </div>
              <div className="team-card-content">
                <span className="team-role">{member.role}</span>
                <h3>{member.name}</h3>
                <p>{member.focus}</p>
                <span className="team-card-rule" />
              </div>
            </article>
          ))}
        </div>
        <div className="team-note">
          <span className="team-note-mark">✳</span>
          <p>REELTIME สร้างขึ้นจากความเชื่อที่ว่า <strong>การค้นพบหนังดี ๆ ควรเป็นเรื่องง่ายและน่าจดจำ</strong></p>
          <a href="/">ไปค้นพบหนังเรื่องโปรด <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="/"><span className="brand-mark">R</span><span>REEL<span className="brand-accent">TIME</span></span></a>
        <span>สร้างช่วงเวลาดูหนังดี ๆ ให้เป็นของคุณ</span>
        <a className="footer-team-link" href="/team">ทีมของเรา <span aria-hidden="true">↗</span></a>
        <span>© {new Date().getFullYear()} REELTIME</span>
      </footer>
    </main>
  );
}

function AdminPage() {
  const [admin, setAdmin] = useState<AdminLogin | null>(() => {
    const saved = sessionStorage.getItem('reeltime-admin');
    return saved ? JSON.parse(saved) as AdminLogin : null;
  });
  const [movies, setMovies] = useState<Movie[]>([]);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [clearPoster, setClearPoster] = useState(false);
  const [clearVideo, setClearVideo] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadMovies() {
    if (!admin) return;
    const response = await axios.get<Movie[]>(`${API_URL}/api/admin/movies`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    setMovies(response.data);
  }

  useEffect(() => {
    if (admin) {
      loadMovies().catch((error: unknown) => {
        setFeedback(errorMessage(error));
        setIsError(true);
      });
    }
  }, [admin]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    try {
      const response = await axios.post<AdminLogin>(`${API_URL}/api/admin/login`, { username, password });
      setAdmin(response.data);
      sessionStorage.setItem('reeltime-admin', JSON.stringify(response.data));
      setPassword('');
    } catch (error) {
      setFeedback(errorMessage(error));
      setIsError(true);
    }
  }

  function resetMovieForm(form?: HTMLFormElement) {
    setEditingMovie(null);
    setTitle('');
    setDescription('');
    setGenre('');
    setReleaseYear('');
    setPosterFile(null);
    setVideoFile(null);
    setPosterUrl('');
    setVideoUrl('');
    setClearPoster(false);
    setClearVideo(false);
    form?.reset();
  }

  function handleEdit(movie: Movie) {
    setEditingMovie(movie);
    setTitle(movie.title);
    setDescription(movie.description);
    setGenre(movie.genre);
    setReleaseYear(movie.releaseYear ? String(movie.releaseYear) : '');
    setPosterFile(null);
    setVideoFile(null);
    setPosterUrl('');
    setVideoUrl('');
    setClearPoster(false);
    setClearVideo(false);
    setFeedback('');
    document.querySelector('.admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSaveMovie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin) return;
    const form = event.currentTarget;
    setIsSaving(true);
    setFeedback('');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('genre', genre);
    formData.append('releaseYear', releaseYear);
    formData.append('posterUrl', posterUrl);
    formData.append('videoUrl', videoUrl);
    formData.append('clearPoster', String(clearPoster));
    formData.append('clearVideo', String(clearVideo));
    if (posterFile) formData.append('poster', posterFile);
    if (videoFile) formData.append('video', videoFile);

    try {
      const request = editingMovie
        ? axios.put(`${API_URL}/api/admin/movies/${editingMovie.id}`, formData, {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
        : axios.post(`${API_URL}/api/admin/movies`, formData, {
          headers: { Authorization: `Bearer ${admin.token}` },
        });
      await request;
      resetMovieForm(form);
      await loadMovies();
      setFeedback(editingMovie ? 'บันทึกการแก้ไขหนังแล้ว' : 'เพิ่มหนังลงในคอลเลกชันแล้ว');
      setIsError(false);
    } catch (error) {
      setFeedback(errorMessage(error));
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(movie: Movie) {
    if (!admin || !window.confirm(`ต้องการลบเรื่อง "${movie.title}" ใช่หรือไม่?`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/movies/${movie.id}`, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      setMovies((current) => current.filter((item) => item.id !== movie.id));
      if (editingMovie?.id === movie.id) resetMovieForm();
      setFeedback('ลบหนังออกจากคอลเลกชันแล้ว');
      setIsError(false);
    } catch (error) {
      setFeedback(errorMessage(error));
      setIsError(true);
    }
  }

  async function updateMovieSetting(
    movie: Movie,
    change: { isPublished: boolean } | { move: 'up' | 'down' }
  ) {
    if (!admin) return;
    try {
      await axios.patch(`${API_URL}/api/admin/movies/${movie.id}`, change, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      await loadMovies();
      setFeedback('อัปเดตการตั้งค่าหนังแล้ว');
      setIsError(false);
    } catch (error) {
      setFeedback(errorMessage(error));
      setIsError(true);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('reeltime-admin');
    setAdmin(null);
    setMovies([]);
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="brand" href="/"><span className="brand-mark">R</span><span>REEL<span className="brand-accent">TIME</span></span></a>
        <div className="admin-header-right">
          {admin && <span className="admin-identity"><span className="online-dot" /> {admin.username}</span>}
          <a className="admin-back-link" href="/">← กลับหน้าเว็บ</a>
          {admin && <button className="logout-button" onClick={handleLogout}>ออกจากระบบ</button>}
        </div>
      </header>

      {!admin ? (
        <section className="admin-login-wrap">
          <form className="admin-login-card" onSubmit={handleLogin}>
            <span className="section-kicker">REELTIME STUDIO</span>
            <h1>เข้าสู่ระบบแอดมิน</h1>
            <p>จัดการหนังและคอลเลกชันของคุณ</p>
            <label>ชื่อผู้ใช้<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label>รหัสผ่าน<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {feedback && <p className="form-feedback error-feedback">{feedback}</p>}
            <button className="primary-button" type="submit">เข้าสู่ระบบ <span aria-hidden="true">→</span></button>
          </form>
        </section>
      ) : (
        <div className="admin-content">
          <div className="admin-title-row">
            <div><span className="section-kicker">จัดการคอนเทนต์</span><h1>หลังบ้านแอดมิน</h1></div>
            <span className="admin-count">{movies.length} เรื่องในคอลเลกชัน</span>
          </div>

          <section className="admin-panel">
            <div className="panel-heading"><span className="panel-icon">{editingMovie ? '✎' : '＋'}</span><div><h2>{editingMovie ? `แก้ไข ${editingMovie.title}` : 'เพิ่มหนังเรื่องใหม่'}</h2><p>{editingMovie ? 'เปลี่ยนรายละเอียด รูปปก หรือไฟล์วิดีโอได้ตามต้องการ' : 'กรอกชื่อและเลือกรูปปกหรือวิดีโอที่จะเพิ่ม'}</p></div></div>
            <form className="movie-form" onSubmit={handleSaveMovie}>
              <label className="field-wide">ชื่อหนัง <span>*</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น คืนแห่งดวงดาว" required /></label>
              <label>หมวดหมู่<input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="แอ็กชัน, ดราม่า..." /></label>
              <label>ปีที่ฉาย<input type="number" min="1888" max="2100" value={releaseYear} onChange={(event) => setReleaseYear(event.target.value)} placeholder="2025" /></label>
              <label className="field-wide">เรื่องย่อ<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="เล่าเรื่องย่อสั้น ๆ ให้คนดูรู้จักหนังเรื่องนี้" /></label>

              <label className="upload-field">รูปปกหนัง <span className="optional-label">ไม่บังคับ</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  setPosterFile(event.target.files?.[0] ?? null);
                  setPosterUrl('');
                  setClearPoster(false);
                }} />
                <span className="upload-hint">{posterFile ? posterFile.name : editingMovie?.posterUrl && !clearPoster ? 'รูปปกปัจจุบัน — เลือกไฟล์เพื่อเปลี่ยน' : 'เลือกรูป JPG, PNG หรือ WebP'}</span>
                {editingMovie?.posterUrl && <span className="current-media-control">
                  <a href={mediaUrl(editingMovie.posterUrl)} target="_blank" rel="noreferrer">ดูรูปปกปัจจุบัน ↗</a>
                  <button type="button" onClick={() => setClearPoster((value) => !value)}>{clearPoster ? 'เก็บรูปปกเดิม' : 'เอารูปปกออก'}</button>
                </span>}
              </label>
              <label>หรือใส่ลิงก์รูปปก<input type="url" value={posterUrl} onChange={(event) => {
                setPosterUrl(event.target.value);
                if (event.target.value) {
                  setPosterFile(null);
                  setClearPoster(false);
                }
              }} placeholder="https://..." /></label>
              <label className="upload-field">ไฟล์วิดีโอ <span className="optional-label">ไม่บังคับ · ไม่เกิน 1 GB</span>
                <input type="file" accept="video/mp4,video/webm" onChange={(event) => {
                  setVideoFile(event.target.files?.[0] ?? null);
                  setVideoUrl('');
                  setClearVideo(false);
                }} />
                <span className="upload-hint">{videoFile ? videoFile.name : editingMovie?.videoUrl && !clearVideo ? 'มีวิดีโอเดิม — เลือกไฟล์เพื่อเปลี่ยน' : 'เลือกไฟล์ MP4 หรือ WebM'}</span>
                {editingMovie?.videoUrl && <span className="current-media-control">
                  <a href={mediaUrl(editingMovie.videoUrl)} target="_blank" rel="noreferrer">เปิดวิดีโอเดิม ↗</a>
                  <button type="button" onClick={() => setClearVideo((value) => !value)}>{clearVideo ? 'เก็บวิดีโอเดิม' : 'เอาวิดีโอออก'}</button>
                </span>}
              </label>
              <label>หรือใส่ลิงก์วิดีโอตรง<input type="url" value={videoUrl} onChange={(event) => {
                setVideoUrl(event.target.value);
                if (event.target.value) {
                  setVideoFile(null);
                  setClearVideo(false);
                }
              }} placeholder="ลิงก์ไฟล์ MP4 / WebM" /></label>

              {feedback && <p className={`form-feedback ${isError ? 'error-feedback' : 'success-feedback'}`}>{feedback}</p>}
              <div className="form-actions">
                <span>รองรับลิงก์วิดีโอแบบไฟล์โดยตรง ไม่ใช่ลิงก์หน้า YouTube</span>
                <div className="form-action-buttons">
                  {editingMovie && <button className="cancel-edit-button" type="button" onClick={() => resetMovieForm()}>ยกเลิก</button>}
                  <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : editingMovie ? 'บันทึกการแก้ไข' : 'เพิ่มหนัง'} <span aria-hidden="true">{editingMovie ? '✓' : '＋'}</span></button>
                </div>
              </div>
            </form>
          </section>

          <section className="admin-library">
            <div className="section-heading"><div><span className="section-kicker">คลังหนัง</span><h2>หนังในระบบ <span>{movies.length}</span></h2></div></div>
            {movies.length ? (
              <div className="admin-movie-list">
                {movies.map((movie) => (
                  <article className={`admin-movie-row${movie.isPublished ? '' : ' is-unpublished'}`} key={movie.id}>
                    {movie.posterUrl ? <img src={mediaUrl(movie.posterUrl)} alt="" /> : <span className="admin-poster-placeholder">R</span>}
                    <div className="admin-movie-details"><h3>{movie.title}</h3><span>{movie.releaseYear || 'ไม่ระบุปี'}{movie.genre && ` · ${movie.genre}`}</span></div>
                    <span className={`media-status publish-status${movie.isPublished ? ' is-live' : ''}`}>{movie.isPublished ? 'เผยแพร่' : 'ซ่อนอยู่'}</span>
                    <span className={`media-status ${movie.videoUrl ? 'has-video' : ''}`}>{movie.videoUrl ? 'มีวิดีโอ' : 'ยังไม่มีวิดีโอ'}</span>
                    <div className="admin-row-actions">
                      <button
                        className="order-button"
                        type="button"
                        aria-label={`เลื่อน ${movie.title} ขึ้น`}
                        disabled={movies[0]?.id === movie.id}
                        onClick={() => updateMovieSetting(movie, { move: 'up' })}
                      >↑</button>
                      <button
                        className="order-button"
                        type="button"
                        aria-label={`เลื่อน ${movie.title} ลง`}
                        disabled={movies[movies.length - 1]?.id === movie.id}
                        onClick={() => updateMovieSetting(movie, { move: 'down' })}
                      >↓</button>
                      <button
                        className={`publish-button${movie.isPublished ? ' is-live' : ''}`}
                        type="button"
                        onClick={() => updateMovieSetting(movie, { isPublished: !movie.isPublished })}
                      >{movie.isPublished ? 'ซ่อน' : 'เผยแพร่'}</button>
                      <button className="edit-button" type="button" onClick={() => handleEdit(movie)}>แก้ไข</button>
                      <button className="delete-button" type="button" onClick={() => handleDelete(movie)}>ลบ</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="admin-empty">ยังไม่มีหนังในระบบ หนังที่เพิ่มจะแสดงในหน้านี้</div>}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
