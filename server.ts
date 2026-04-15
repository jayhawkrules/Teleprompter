import express from 'express';
import session from 'express-session';
import path from 'path';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

dotenv.config();

declare module 'express-session' {
  interface SessionData {
    tiktokState?: string;
    tiktokToken?: string;
    tiktokUser?: {
      display_name: string;
      avatar_url: string;
      open_id: string;
    };
  }
}

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 
  'https://teleprompter.producinghollywood.com/auth/tiktok/callback';
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'televibe-session-secret-change-me';

// Trust reverse proxy (CRITICAL for secure cookies behind nginx/caddy)
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'https://teleprompter.producinghollywood.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Server-side session — stores state on the SERVER, not in the URL
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    httpOnly: true
  }
}));

// ─── TikTok Auth Routes ──────────────────────────────────────────────────────

app.get('/auth/tiktok', (req, res) => {
  if (!TIKTOK_CLIENT_KEY) {
    return res.status(500).send('TikTok Client Key not configured');
  }

  // Generate state and store it SERVER-SIDE in the session
  // This is exactly what TikTok's own docs recommend
  const csrfState = crypto.randomBytes(16).toString('hex');
  req.session.tiktokState = csrfState;

  // Force session save before redirect to ensure it's written
  req.session.save((err) => {
    if (err) {
      console.error('[TikTok Auth] Session save error:', err);
      return res.status(500).send('Session error');
    }

    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY!,
      scope: 'user.info.basic,video.upload,video.publish',
      response_type: 'code',
      redirect_uri: TIKTOK_REDIRECT_URI,
      state: csrfState,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    console.log('[TikTok Auth] Redirecting to TikTok. State:', csrfState);
    res.redirect(authUrl);
  });
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Full debug logging
  console.log('[TikTok Callback] Received:', {
    hasCode: !!code,
    state: state,
    storedState: req.session.tiktokState,
    stateMatch: state === req.session.tiktokState,
    error: error || 'none',
    sessionID: req.sessionID
  });

  if (error) {
    console.error('[TikTok Callback] TikTok returned error:', error, error_description);
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#aaa;
        background:#0a0a0a;text-align:center">
        <p>Authorization cancelled.</p>
        <script>
          try { window.opener && window.opener.postMessage({tiktokCancelled:true},'*'); } catch(e){}
          setTimeout(()=>window.close(),1500);
        </script>
      </body></html>`);
  }

  // State validation — compare what TikTok sent back vs what we stored
  const storedState = req.session.tiktokState;
  if (!storedState || !state || state !== storedState) {
    console.error('[TikTok Callback] State mismatch!', {
      received: state,
      stored: storedState,
      sessionID: req.sessionID
    });
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;
        background:#0a0a0a;text-align:center">
        <h3>Session mismatch</h3>
        <p>Please close this window and click Connect Account again.</p>
        <p style="font-size:11px;color:#555;margin-top:20px">
          Debug: received="${state}" stored="${storedState}"
        </p>
        <script>setTimeout(()=>window.close(),6000)</script>
      </body></html>`);
  }

  // Clear the state now that it's been used
  delete req.session.tiktokState;

  if (!code) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;
        background:#0a0a0a;text-align:center">
        <p>No authorization code received. Please try again.</p>
        <script>setTimeout(()=>window.close(),3000)</script>
      </body></html>`);
  }

  try {
    // Exchange code for access token
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

    console.log('[TikTok Callback] Token exchange success');
    const { access_token, open_id } = tokenResponse.data;

    // Fetch user profile
    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const user = userResponse.data.data.user;
    console.log('[TikTok Callback] Got user:', user.display_name);

    // Store in session (server-side — no cookie exposure)
    req.session.tiktokToken = access_token;
    req.session.tiktokUser = {
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      open_id
    };

    req.session.save((err) => {
      if (err) console.error('[TikTok Callback] Session save error:', err);
      res.redirect('/auth/tiktok/success');
    });

  } catch (err: any) {
    const errData = err.response?.data || err.message;
    console.error('[TikTok Callback] Token exchange error:', errData);
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;
        background:#0a0a0a;text-align:center">
        <p>Authentication failed. Please close this window and try again.</p>
        <p style="font-size:11px;color:#555;margin-top:20px">${JSON.stringify(errData)}</p>
        <script>setTimeout(()=>window.close(),5000)</script>
      </body></html>`);
  }
});

app.get('/auth/tiktok/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Connected!</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;
                   background:#0a0a0a;color:#fff">
        <h2 style="color:#4ade80">✓ TikTok Connected!</h2>
        <p style="color:#666;font-size:14px">Returning to TeleVibe...</p>
        <script>
          setTimeout(function() {
            window.location.replace('/');
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

// ─── TikTok API Routes ───────────────────────────────────────────────────────

app.get('/api/tiktok/me', (req, res) => {
  const user = req.session.tiktokUser;
  if (!user) return res.status(401).json({ error: 'Not connected' });
  return res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.json({ success: true });
  });
});

app.post('/api/tiktok/post', upload.single('video'), async (req, res) => {
  const access_token = req.session.tiktokToken;
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
