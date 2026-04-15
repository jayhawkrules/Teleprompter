import express from 'express';
import path from 'path';
import axios from 'axios';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI ||
  'https://teleprompter.producinghollywood.com/auth/tiktok/callback';
const TIKTOK_CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const SESSION_SECRET       = process.env.SESSION_SECRET || 'televibe-secret-change-me-in-production';
const GEMINI_API_KEY       = process.env.GEMINI_API_KEY;

// Derive a 32-byte AES key from SESSION_SECRET so we never store it raw
const AES_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest(); // Buffer, 32 bytes
const AES_ALG = 'aes-256-gcm' as const;

app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://teleprompter.producinghollywood.com',
  'http://localhost:3000'
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── #8 Rate limiting ────────────────────────────────────────────────────────
// 10 requests / minute per IP on the Gemini endpoint
const scriptRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a minute and try again.' }
});

// ─── #9 CSRF — Origin / Referer check for state-mutating routes ─────────────
function csrfGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin  = req.headers['origin']  as string | undefined;
  const referer = req.headers['referer'] as string | undefined;
  const source  = origin || (referer ? new URL(referer).origin : null);

  // Allow server-side / same-origin requests (no origin header) in non-production
  if (!source && process.env.NODE_ENV !== 'production') return next();

  if (!source || !ALLOWED_ORIGINS.includes(source)) {
    console.warn('[CSRF] Blocked request from origin:', source);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── #7 AES-256-GCM cookie encryption ───────────────────────────────────────
const COOKIE_NAME = 'televibe_session';

function encryptSession(data: object): string {
  const iv         = crypto.randomBytes(12);                         // 96-bit IV for GCM
  const cipher     = crypto.createCipheriv(AES_ALG, AES_KEY, iv);
  const plaintext  = Buffer.from(JSON.stringify(data));
  const encrypted  = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag        = cipher.getAuthTag();                            // 16-byte auth tag
  // Format: base64(iv):base64(tag):base64(ciphertext)
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64')
  ].join(':');
}

function decryptSession(encoded: string): Record<string, any> | null {
  try {
    const [ivB64, tagB64, dataB64] = encoded.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv        = Buffer.from(ivB64,  'base64');
    const tag       = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64,'base64');
    const decipher  = crypto.createDecipheriv(AES_ALG, AES_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch {
    return null; // Tampered or wrong key — treat as no session
  }
}

function getSession(req: express.Request): Record<string, any> {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return {};
  return decryptSession(raw) || {};
}

function setSession(res: express.Response, data: Record<string, any>) {
  const encrypted   = encryptSession(data);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSession(res: express.Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// ─── Token Refresh Helper ────────────────────────────────────────────────────

async function refreshTikTokToken(
  req: express.Request,
  res: express.Response
): Promise<string | null> {
  const session = getSession(req);
  const refresh_token = session.tiktokRefreshToken;

  if (!refresh_token) {
    console.warn('[TikTok] No refresh token in session — user must re-authenticate');
    return null;
  }

  try {
    console.log('[TikTok] Refreshing access token...');
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key:    TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token: new_refresh_token } = response.data;
    if (!access_token) {
      console.error('[TikTok] Refresh response missing access_token');
      return null;
    }

    setSession(res, {
      ...session,
      tiktokToken:        access_token,
      tiktokRefreshToken: new_refresh_token || refresh_token,
    });

    console.log('[TikTok] Token refreshed successfully');
    return access_token;
  } catch (err: any) {
    // #10 — only log safe fields, never echo request params
    const safe = err.response?.data
      ? { error: err.response.data.error, description: err.response.data.error_description, status: err.response.status }
      : err.message;
    console.error('[TikTok] Token refresh failed:', safe);
    return null;
  }
}

// ─── AI Script Generation ────────────────────────────────────────────────────

app.post('/api/generate-script', scriptRateLimit, async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] GEMINI_API_KEY not set');
    return res.status(500).json({ error: 'AI service not configured. Please add GEMINI_API_KEY to Render environment variables.' });
  }

  const { topic } = req.body;
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const topicContext = topic
    ? `The topic is: "${topic}".`
    : `The topic is current trends in the film and TV industry — music documentaries, concert films, reality TV, streaming wars.`;

  const prompt = `
You are a social media content writer for a film and TV industry professional.

${topicContext}

Write two things:

1. A 30-60 second teleprompter script for a vertical TikTok video.
   - Tone: extremely conversational, casual, like talking to a friend or your followers.
   - NOT a news anchor voice. Use natural phrasing like "So I was just thinking...", "Honestly, it's kind of wild that...", "Here's the thing though..."
   - Keep it grounded, opinionated, and real. A genuine hot take or interesting observation.
   - No bullet points, no headers — just flowing spoken-word sentences.

2. A TikTok caption for this video.
   - Punchy first line (no emoji at the start).
   - Include 5-8 relevant hashtags at the end.
   - Max 150 characters before the hashtags.

Return ONLY a JSON object with "script" and "caption" fields. No markdown, no extra text.
  `;

  try {
    console.log('[Gemini] Generating script for topic:', topic || 'general industry trends');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script:  { type: Type.STRING },
            caption: { type: Type.STRING },
          },
          required: ['script', 'caption'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    console.log('[Gemini] Script generated successfully');
    res.json({
      script:  result.script  || 'Failed to generate script.',
      caption: result.caption || 'Failed to generate caption.',
    });
  } catch (error: any) {
    console.error('[Gemini] Error:', error.message || error);
    res.status(500).json({ error: 'Failed to generate script: ' + (error.message || 'Unknown error') });
  }
});

// ─── TikTok Auth Routes ──────────────────────────────────────────────────────

app.get('/auth/tiktok', (req, res) => {
  if (!TIKTOK_CLIENT_KEY) {
    return res.status(500).send('TikTok Client Key not configured');
  }

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

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  console.log('[TikTok Auth] isMobile:', isMobile);
  res.redirect(authUrl);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  console.log('[TikTok Callback]', { hasCode: !!code, error: error || 'none' });

  if (error) {
    console.error('[TikTok Callback] TikTok error:', error, error_description);
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#aaa;background:#0a0a0a;text-align:center">
        <p>Authorization cancelled. Returning to app...</p>
        <script>setTimeout(function(){ window.location.replace('/'); }, 2000);</script>
      </body></html>`);
  }

  if (!code) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#0a0a0a;text-align:center">
        <p>No authorization code received. Please try again.</p>
        <script>setTimeout(function(){ window.location.replace('/'); }, 3000);</script>
      </body></html>`);
  }

  try {
    console.log('[TikTok Callback] Exchanging code for token...');
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key:    TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code:          code as string,
        grant_type:    'authorization_code',
        redirect_uri:  TIKTOK_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('[TikTok Callback] Token response status:', tokenResponse.status);
    const { access_token, refresh_token, open_id } = tokenResponse.data;

    if (!access_token) throw new Error('No access_token in response');

    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const user = userResponse.data.data?.user;
    console.log('[TikTok Callback] User fetched:', user?.display_name);

    setSession(res, {
      tiktokToken:        access_token,
      tiktokRefreshToken: refresh_token || null,
      tiktokUser: {
        display_name: user?.display_name || 'TikTok User',
        avatar_url:   user?.avatar_url   || '',
        open_id:      open_id            || ''
      }
    });

    console.log('[TikTok Callback] Session set. Redirecting to success.');
    res.redirect('/auth/tiktok/success');

  } catch (err: any) {
    // #10 — never echo request params; only log safe response fields
    const safe = err.response?.data
      ? { error: err.response.data.error, description: err.response.data.error_description, status: err.response.status }
      : String(err.message);
    console.error('[TikTok Callback] FAILED:', JSON.stringify(safe));
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#0a0a0a;text-align:center">
        <h3>Authentication failed</h3>
        <p style="font-size:13px;color:#888">${JSON.stringify(safe)}</p>
        <p style="font-size:12px;color:#555;margin-top:20px">Returning to app in 8 seconds...</p>
        <script>setTimeout(function(){ window.location.replace('/'); }, 8000);</script>
      </body></html>`);
  }
});

app.get('/auth/tiktok/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Connected!</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
        <h2 style="color:#4ade80">&#10003; TikTok Connected!</h2>
        <p style="color:#666;font-size:14px">Returning to TeleVibe...</p>
        <script>setTimeout(function(){ window.location.replace('/?tiktok=connected'); }, 800);</script>
      </body>
    </html>
  `);
});

// ─── TikTok API Routes ───────────────────────────────────────────────────────

app.get('/api/tiktok/me', (req, res) => {
  const session = getSession(req);
  const user    = session.tiktokUser;
  console.log('[/api/tiktok/me] session user:', user ? user.display_name : 'none');
  if (!user) return res.status(401).json({ error: 'Not connected' });
  return res.json({ user });
});

app.post('/api/auth/logout', csrfGuard, (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

app.post('/api/tiktok/post', csrfGuard, upload.single('video'), async (req, res) => {
  const session = getSession(req);
  let access_token = session.tiktokToken;
  if (!access_token) return res.status(401).json({ error: 'Not authenticated' });

  const { caption } = req.body;
  const videoFile   = req.file;
  if (!videoFile) return res.status(400).json({ error: 'No video provided' });

  const mimeType = videoFile.mimetype || 'video/webm';

  const attemptPost = async (token: string) => {
    const initResponse = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: {
          title:           caption || 'Created with TeleVibe',
          privacy_level:   'PUBLIC_TO_EVERYONE',
          disable_duet:    false,
          disable_comment: false,
          disable_stitch:  false
        },
        source_info: {
          source:            'FILE_UPLOAD',
          video_size:        videoFile.size,
          chunk_size:        videoFile.size,
          total_chunk_count: 1
        }
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { upload_url, publish_id } = initResponse.data.data;

    await axios.put(upload_url, videoFile.buffer, {
      headers: {
        'Content-Type':  mimeType,
        'Content-Range': `bytes 0-${videoFile.size - 1}/${videoFile.size}`
      }
    });

    return publish_id;
  };

  try {
    const publish_id = await attemptPost(access_token);
    res.json({ success: true, publish_id });
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401) {
      console.warn('[TikTok Post] 401 — attempting token refresh...');
      const newToken = await refreshTikTokToken(req, res);
      if (newToken) {
        try {
          const publish_id = await attemptPost(newToken);
          return res.json({ success: true, publish_id });
        } catch (retryErr: any) {
          const safe = retryErr.response?.data
            ? { error: retryErr.response.data.error, status: retryErr.response.status }
            : retryErr.message;
          console.error('[TikTok Post] Retry after refresh failed:', safe);
          return res.status(500).json({ error: 'Post failed after token refresh. Please reconnect TikTok.' });
        }
      } else {
        return res.status(401).json({ error: 'Session expired. Please reconnect your TikTok account.' });
      }
    }
    const safe = error.response?.data
      ? { error: error.response.data.error, status: error.response.status }
      : error.message;
    console.error('[TikTok Post] Error:', safe);
    res.status(500).json({ error: 'Failed to post to TikTok' });
  }
});

// ─── Vite / Static ───────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeleVibe server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
