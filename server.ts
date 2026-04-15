import express from 'express';
import path from 'path';
import axios from 'axios';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI ||
  'https://teleprompter.producinghollywood.com/auth/tiktok/callback';
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'televibe-secret-change-me-in-production';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'https://teleprompter.producinghollywood.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

const COOKIE_NAME = 'televibe_session';

function signData(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyData(signed: string): object | null {
  try {
    const [payload, sig] = signed.split('.');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

function getSession(req: express.Request): Record<string, any> {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return {};
  return (verifyData(raw) as Record<string, any>) || {};
}

function setSession(res: express.Response, data: Record<string, any>) {
  const signed = signData(data);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, signed, {
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

import cookieParser from 'cookie-parser';
app.use(cookieParser());

// ─── AI Script Generation ────────────────────────────────────────────────────

app.post('/api/generate-script', async (req, res) => {
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
            script: { type: Type.STRING },
            caption: { type: Type.STRING },
          },
          required: ['script', 'caption'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    console.log('[Gemini] Script generated successfully');
    res.json({
      script: result.script || 'Failed to generate script.',
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
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY!,
    scope: 'user.info.basic,video.upload,video.publish',
    response_type: 'code',
    redirect_uri: TIKTOK_REDIRECT_URI,
    state: 'televibe_' + crypto.randomBytes(20).toString('hex'),
  });

  if (isMobile) {
    params.append('disable_auto_login', '1');
  }

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  console.log('[TikTok Auth] isMobile:', isMobile, '| URL:', authUrl);
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
        client_key: TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('[TikTok Callback] Token response:', JSON.stringify(tokenResponse.data));
    const { access_token, open_id } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access_token in response: ' + JSON.stringify(tokenResponse.data));
    }

    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const user = userResponse.data.data?.user;
    console.log('[TikTok Callback] User fetched:', user?.display_name);

    setSession(res, {
      tiktokToken: access_token,
      tiktokUser: {
        display_name: user?.display_name || 'TikTok User',
        avatar_url: user?.avatar_url || '',
        open_id: open_id || ''
      }
    });

    console.log('[TikTok Callback] Session cookie set. Redirecting to success.');
    res.redirect('/auth/tiktok/success');

  } catch (err: any) {
    const errData = err.response?.data || err.message;
    console.error('[TikTok Callback] FAILED:', JSON.stringify(errData));
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#0a0a0a;text-align:center">
        <h3>Authentication failed</h3>
        <p style="font-size:13px;color:#888">${JSON.stringify(errData)}</p>
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
  const user = session.tiktokUser;
  console.log('[/api/tiktok/me] session user:', user ? user.display_name : 'none');
  if (!user) return res.status(401).json({ error: 'Not connected' });
  return res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

app.post('/api/tiktok/post', upload.single('video'), async (req, res) => {
  const session = getSession(req);
  const access_token = session.tiktokToken;
  if (!access_token) return res.status(401).json({ error: 'Not authenticated' });

  const { caption } = req.body;
  const videoFile = req.file;
  if (!videoFile) return res.status(400).json({ error: 'No video provided' });

  try {
    const initResponse = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: {
          title: caption || 'Created with TeleVibe',
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoFile.size,
          chunk_size: videoFile.size,
          total_chunk_count: 1
        }
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { upload_url, publish_id } = initResponse.data.data;

    await axios.put(upload_url, videoFile.buffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Range': `bytes 0-${videoFile.size - 1}/${videoFile.size}`
      }
    });

    res.json({ success: true, publish_id });
  } catch (error: any) {
    console.error('TikTok Post Error:', error.response?.data || error.message);
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
