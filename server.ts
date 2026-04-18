import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import { getHistory, addHistoryItem, deleteHistoryItem } from './historyStore';

dotenv.config();

const app  = express();
const PORT = 3000;

// ─── Multer: disk storage so video never lives in RAM ────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename:    (_req, file,  cb) => {
      const ext  = path.extname(file.originalname) || '.mp4';
      const name = `televibe-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
});

const TIKTOK_REDIRECT_URI  = process.env.TIKTOK_REDIRECT_URI || 'https://teleprompter.producinghollywood.com/auth/tiktok/callback';
const TIKTOK_CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const GEMINI_API_KEY       = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] SESSION_SECRET environment variable is not set.');
  } else {
    console.warn('[WARNING] SESSION_SECRET not set — using insecure dev default.');
  }
}
const EFFECTIVE_SECRET = SESSION_SECRET || 'televibe-dev-only-do-not-use-in-production';

const AES_KEY = crypto.createHash('sha256').update(EFFECTIVE_SECRET).digest();
const AES_ALG = 'aes-256-gcm' as const;

// ─── Singleton AI client — created once at startup, not per request ──────────
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://teleprompter.producinghollywood.com',
  'http://localhost:3000',
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── Rate limiting ────────────────────────────────────────────────────────────
const scriptRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a minute and try again.' },
});

// ─── CSRF guard ───────────────────────────────────────────────────────────────
function csrfGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin  = req.headers['origin']  as string | undefined;
  const referer = req.headers['referer'] as string | undefined;
  const source  = origin || (referer ? new URL(referer).origin : null);
  if (!source && process.env.NODE_ENV !== 'production') return next();
  if (!source || !ALLOWED_ORIGINS.includes(source)) {
    console.warn('[CSRF] Blocked request from origin:', source);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── AES-256-GCM session cookie ───────────────────────────────────────────────
const COOKIE_NAME = 'televibe_session';

function encryptSession(data: object): string {
  const iv        = crypto.randomBytes(12);
  const cipher    = crypto.createCipheriv(AES_ALG, AES_KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(data));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag       = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

function decryptSession(encoded: string): Record<string, any> | null {
  try {
    const [ivB64, tagB64, dataB64] = encoded.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv        = Buffer.from(ivB64,   'base64');
    const tag       = Buffer.from(tagB64,  'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher  = crypto.createDecipheriv(AES_ALG, AES_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch {
    return null;
  }
}

function getSession(req: express.Request): Record<string, any> {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return {};
  return decryptSession(raw) || {};
}

function setSession(res: express.Response, data: Record<string, any>) {
  const encrypted    = encryptSession(data);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/',
  });
}

function clearSession(res: express.Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// ─── Token refresh ────────────────────────────────────────────────────────────
async function refreshTikTokToken(
  req: express.Request,
  res: express.Response,
): Promise<string | null> {
  const session       = getSession(req);
  const refresh_token = session.tiktokRefreshToken;
  if (!refresh_token) {
    console.warn('[TikTok] No refresh token — user must re-authenticate');
    return null;
  }
  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key:    TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, refresh_token: new_refresh_token } = response.data;
    if (!access_token) { console.error('[TikTok] Refresh missing access_token'); return null; }
    setSession(res, { ...session, tiktokToken: access_token, tiktokRefreshToken: new_refresh_token || refresh_token });
    return access_token;
  } catch (err: any) {
    const safe = err.response?.data
      ? { error: err.response.data.error, description: err.response.data.error_description, status: err.response.status }
      : err.message;
    console.error('[TikTok] Token refresh failed:', safe);
    return null;
  }
}

// ─── TikTok post helper — streams from disk, never buffers in RAM ─────────────
async function attemptTikTokPost(
  token: string,
  videoPath: string,
  videoSize: number,
  mimeType: string,
  caption: string,
): Promise<string> {
  console.log('[TikTok Post] File size:', videoSize, 'MIME:', mimeType);

  const initResponse = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: {
        title:                    caption.slice(0, 2200) || 'Created with TeleVibe',
        privacy_level:            'SELF_ONLY',
        disable_duet:             false,
        disable_comment:          false,
        disable_stitch:           false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source:            'FILE_UPLOAD',
        video_size:        videoSize,
        chunk_size:        videoSize,
        total_chunk_count: 1,
      },
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  );

  console.log('[TikTok Post] Init response:', JSON.stringify(initResponse.data));

  const { upload_url, publish_id } = initResponse.data.data;

  await axios.put(upload_url, fs.createReadStream(videoPath), {
    headers: {
      'Content-Type':   mimeType,
      'Content-Range':  `bytes 0-${videoSize - 1}/${videoSize}`,
      'Content-Length': videoSize,
    },
    maxBodyLength:    Infinity,
    maxContentLength: Infinity,
  });

  console.log('[TikTok Post] Upload complete, publish_id:', publish_id);
  return publish_id;
}

// ─── Health endpoint ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    memory: {
      rss:      `${Math.round(mem.rss      / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
      heapTotal:`${Math.round(mem.heapTotal/ 1024 / 1024)} MB`,
    },
  });
});

// ─── AI Script Generation ─────────────────────────────────────────────────────
app.post('/api/generate-script', scriptRateLimit, async (req, res) => {
  if (!ai) {
    console.error('[Gemini] No API key found.');
    return res.status(500).json({ error: 'AI service not configured.' });
  }

  const { topic } = req.body;

  // Rotating hook styles — the opening line must stop the scroll in under 3 seconds
  const hookStyles = [
    'a bold, specific claim that most people in the industry would argue with',
    'a shocking or counterintuitive stat that reframes how the viewer sees the topic',
    'a direct question fired straight at the viewer that they genuinely cannot answer without watching',
    'a short provocative statement that sounds almost too controversial to be true — but is',
    'an "I just found out" opener about something that genuinely surprised you',
    'a "nobody talks about this but..." reveal about something hiding in plain sight',
    'a rapid prediction: one sentence that tells them exactly what is about to change and why it matters to them',
    'a myth-bust opener: name the thing everyone believes, then immediately say it is wrong',
  ];

  const angles = [
    'a hot take or unpopular opinion',
    "a surprising industry stat or fun fact most people don't know",
    "something that's been buzzing in the news this week",
    'a behind-the-scenes reality that audiences never see',
    'a prediction about where things are heading',
    'a comparison between how things used to be vs now',
    'something that genuinely surprised you recently',
    "a question you've been curious about and want your audience's thoughts on",
  ];

  const hookStyle = hookStyles[Math.floor(Math.random() * hookStyles.length)];
  const angle     = angles[Math.floor(Math.random() * angles.length)];

  const topicContext = topic
    ? `The topic is: "${topic}".`
    : `Pick a genuinely interesting, specific angle on the film, TV, or entertainment industry — streaming, documentaries, music films, reality TV, Hollywood business, or content creation. Be specific, not generic.`;

  const prompt = `
You are writing a short TikTok script for a film and TV industry professional talking directly to camera to their followers.

${topicContext}

Angle to explore: ${angle}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL — THE HOOK (first 1–2 sentences):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The very first sentence must be a PATTERN INTERRUPT that stops the scroll dead within 3 seconds.
Hook style to use: ${hookStyle}

Hook rules:
- Maximum 15 words for the opening sentence.
- Must work as a standalone grabber BEFORE any context or explanation is given.
- Do NOT start with "So", "Hey", "OK so", "Welcome" or any warm-up filler.
- Do NOT start by introducing yourself or the topic gently.
- The viewer must feel an immediate need to know what comes next.
- Think: if someone saw only this first sentence as a subtitle while scrolling, would they stop? If not, rewrite it.

Good hook examples (style, not to copy verbatim):
- "Netflix just quietly killed the one metric that made or broke careers."
- "Every streaming deal you've signed in the last two years has the same hidden clause."
- "The documentary that took three years to make got buried because of one algorithm tweak."
- "Most producers are pitching to the wrong room and don't even know it."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE REST OF THE SCRIPT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- After the hook, shift to a completely conversational tone — like you're catching up with a friend.
- Deliver on the promise of the hook. Don't bait-and-switch.
- Include one specific detail, stat, name, or real example to make it feel credible and current.
- End with a genuine question for the audience — something you actually want their opinion on.
- NO bullet points, NO headers, NO lists. Flowing spoken sentences only.
- Total length: 45–65 seconds when spoken aloud (roughly 120–160 words including the hook).
- Sound like a real industry insider, not a press release.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- First line must mirror the energy of the hook — punchy, no emoji at the start.
- Conversational, not corporate.
- 5–8 relevant hashtags at the end.

Return ONLY valid JSON: { "script": "...", "caption": "..." }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { script: { type: Type.STRING }, caption: { type: Type.STRING } },
          required: ['script', 'caption'],
        },
      },
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result  = JSON.parse(rawText || '{}');
    console.log('[Gemini] Script generated successfully');
    res.json({
      script:  result.script  || 'Failed to generate script.',
      caption: result.caption || 'Failed to generate caption.',
    });
  } catch (error: any) {
    console.error('[Gemini] Error:', error?.message ?? String(error));
    res.status(500).json({ error: 'Failed to generate script: ' + (error.message || String(error)) });
  }
});

// ─── Topic Similarity Check ───────────────────────────────────────────────────
app.post('/api/check-topic-similarity', async (req, res) => {
  if (!ai) return res.json({ similar: false });

  const { newTopic, pastTopics } = req.body;
  if (!newTopic || !pastTopics) return res.json({ similar: false });

  const prompt = `You are checking if a new video topic overlaps with previously covered topics.

New topic: "${newTopic}"

Past topics already covered:
- ${pastTopics}

Answer with JSON only: { "similar": true/false, "matchedTopic": "the closest past topic if similar, else null" }
Be strict — only flag as similar if the core subject is genuinely the same. Different angles on the same broad subject count as similar.`;

  try {
    const response = await ai.models.generateContent({
      model:    'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            similar:      { type: Type.BOOLEAN },
            matchedTopic: { type: Type.STRING },
          },
          required: ['similar'],
        },
      },
    });
    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result  = JSON.parse(rawText || '{}');
    console.log('[Gemini] Topic similarity check:', result);
    res.json({ similar: result.similar || false, matchedTopic: result.matchedTopic || null });
  } catch (err: any) {
    console.error('[Gemini] Similarity check error:', err.message);
    res.json({ similar: false });
  }
});

// ─── History Routes ───────────────────────────────────────────────────────────
app.get('/api/history', (req, res) => {
  const session = getSession(req);
  const openId  = session.tiktokUser?.open_id;
  if (!openId) return res.status(401).json({ error: 'Not authenticated' });
  res.json(getHistory(openId));
});

app.post('/api/history', csrfGuard, (req, res) => {
  const session = getSession(req);
  const openId  = session.tiktokUser?.open_id;
  if (!openId) return res.status(401).json({ error: 'Not authenticated' });
  const { script, caption, topic, id, timestamp } = req.body;
  if (!script || !caption) return res.status(400).json({ error: 'script and caption are required' });
  const updated = addHistoryItem(openId, { script, caption, topic, id, timestamp });
  res.json(updated);
});

app.delete('/api/history/:id', csrfGuard, (req, res) => {
  const session = getSession(req);
  const openId  = session.tiktokUser?.open_id;
  if (!openId) return res.status(401).json({ error: 'Not authenticated' });
  const updated = deleteHistoryItem(openId, req.params.id);
  res.json(updated);
});

// ─── TikTok Auth Routes ───────────────────────────────────────────────────────
app.get('/auth/tiktok', (req, res) => {
  if (!TIKTOK_CLIENT_KEY) return res.status(500).send('TikTok Client Key not configured');
  const userAgent = req.headers['user-agent'] || '';
  const isMobile  = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const params = new URLSearchParams({
    client_key:    TIKTOK_CLIENT_KEY!,
    scope:         'user.info.basic,video.upload,video.publish',
    response_type: 'code',
    redirect_uri:  TIKTOK_REDIRECT_URI,
    state:         'televibe_' + crypto.randomBytes(20).toString('hex'),
  });
  if (isMobile) params.append('disable_auto_login', '1');
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    console.error('[TikTok Callback] error:', error, error_description);
    return res.send(`<html><body style="font-family:sans-serif;padding:40px;color:#aaa;background:#0a0a0a;text-align:center"><p>Authorization cancelled. Returning to app...</p><script>setTimeout(function(){ window.location.replace('/'); }, 2000);</script></body></html>`);
  }
  if (!code) return res.send(`<html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#0a0a0a;text-align:center"><p>No authorization code received.</p><script>setTimeout(function(){ window.location.replace('/'); }, 3000);</script></body></html>`);

  try {
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key:    TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code:          code as string,
        grant_type:    'authorization_code',
        redirect_uri:  TIKTOK_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token, refresh_token, open_id } = tokenResponse.data;
    if (!access_token) throw new Error('No access_token in response');

    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    const user = userResponse.data.data?.user;

    setSession(res, {
      tiktokToken:        access_token,
      tiktokRefreshToken: refresh_token || null,
      tiktokUser: {
        display_name: user?.display_name || 'TikTok User',
        avatar_url:   user?.avatar_url   || '',
        open_id:      open_id            || '',
      },
    });
    res.redirect('/auth/tiktok/success');
  } catch (err: any) {
    const safe = err.response?.data
      ? { error: err.response.data.error, description: err.response.data.error_description, status: err.response.status }
      : String(err.message);
    console.error('[TikTok Callback] FAILED:', JSON.stringify(safe));
    res.send(`<html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#0a0a0a;text-align:center"><h3>Authentication failed</h3><p style="font-size:13px;color:#888">${JSON.stringify(safe)}</p><p style="font-size:12px;color:#555;margin-top:20px">Returning in 8 seconds...</p><script>setTimeout(function(){ window.location.replace('/'); }, 8000);</script></body></html>`);
  }
});

app.get('/auth/tiktok/success', (_req, res) => {
  res.send(`<html><head><title>Connected!</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff"><h2 style="color:#4ade80">&#10003; TikTok Connected!</h2><p style="color:#666;font-size:14px">Returning to TeleVibe...</p><script>setTimeout(function(){ window.location.replace('/?tiktok=connected'); }, 800);</script></body></html>`);
});

// ─── TikTok API Routes ────────────────────────────────────────────────────────
app.get('/api/tiktok/me', (req, res) => {
  const session = getSession(req);
  const user    = session.tiktokUser;
  if (!user) return res.status(401).json({ error: 'Not connected' });
  return res.json({ user });
});

app.post('/api/auth/logout', csrfGuard, (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

app.post('/api/tiktok/post', csrfGuard, upload.single('video'), async (req, res) => {
  const session    = getSession(req);
  let access_token = session.tiktokToken;
  if (!access_token) return res.status(401).json({ error: 'Not authenticated' });

  const { caption } = req.body;
  const videoFile   = req.file;
  if (!videoFile) return res.status(400).json({ error: 'No video provided' });

  try {
    const publish_id = await attemptTikTokPost(
      access_token,
      videoFile.path,
      videoFile.size,
      videoFile.mimetype || 'video/mp4',
      caption,
    );
    res.json({ success: true, publish_id });
  } catch (error: any) {
    const tikTokError = error.response?.data;
    console.error('[TikTok Post] Error status:', error.response?.status);
    console.error('[TikTok Post] Error body:', JSON.stringify(tikTokError));

    if (error.response?.status === 401) {
      const newToken = await refreshTikTokToken(req, res);
      if (newToken) {
        try {
          const publish_id = await attemptTikTokPost(
            newToken,
            videoFile.path,
            videoFile.size,
            videoFile.mimetype || 'video/mp4',
            caption,
          );
          return res.json({ success: true, publish_id });
        } catch (e: any) {
          const retryError = e.response?.data;
          console.error('[TikTok Post] Retry error:', JSON.stringify(retryError));
          return res.status(500).json({
            error:  'Post failed after token refresh. Please reconnect TikTok.',
            detail: retryError,
          });
        }
      }
      return res.status(401).json({ error: 'Session expired. Please reconnect your TikTok account.' });
    }

    const message = tikTokError?.error?.message || tikTokError?.error || error.message || 'Unknown error';
    res.status(500).json({ error: `TikTok API error: ${message}`, detail: tikTokError });
  } finally {
    fs.unlink(videoFile.path, (err) => {
      if (err) console.warn('[TikTok Post] Failed to delete temp file:', videoFile.path, err.message);
      else console.log('[TikTok Post] Temp file deleted:', videoFile.path);
    });
  }
});

// ─── Vite / Static ────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`TeleVibe server running on http://0.0.0.0:${PORT}`));
}

startServer();
