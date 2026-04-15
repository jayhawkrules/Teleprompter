import express from 'express';
import path from 'path';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'https://teleprompter.producinghollywood.com/auth/tiktok/callback';
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = TIKTOK_REDIRECT_URI;
const STATE_SECRET = process.env.SESSION_SECRET || 'televibe-state-secret-2024';

const createSignedState = (): string => {
  // 20 bytes = 40 hex chars for random
  const random = crypto.randomBytes(20).toString('hex');      // 40 chars
  const timestamp = Date.now().toString(36).padStart(9, '0'); // 9 chars
  const payload = random + timestamp;                          // 49 chars
  const sig = crypto.createHmac('sha256', STATE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 20);                                         // 20 chars
  return payload + sig;                                        // 69 chars total — safely within 43-128
};

const verifySignedState = (state: string): boolean => {
  try {
    if (!state || state.length !== 69) return false;
    const random    = state.substring(0, 40);
    const timestamp = state.substring(40, 49);
    const sig       = state.substring(49, 69);
    const createdAt = parseInt(timestamp, 36);
    if (isNaN(createdAt)) return false;
    if (Date.now() - createdAt > 600000) return false; // 10 min expiry
    const payload  = random + timestamp;
    const expected = crypto.createHmac('sha256', STATE_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 20);
    if (sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(sig,      'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: [
    'https://teleprompter.producinghollywood.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// TikTok Routes
app.get('/auth/tiktok', (req, res) => {
  if (!TIKTOK_CLIENT_KEY) {
    return res.status(500).send('TikTok Client Key not configured');
  }

  const state = createSignedState();
  // NO cookie needed — state is self-verifying via HMAC signature

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic,video.upload,video.publish',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
  });

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // DEBUG — remove after confirming auth works
  console.log('[TikTok Callback] state received:', state);
  console.log('[TikTok Callback] state length:', state ? (state as string).length : 0);
  console.log('[TikTok Callback] code present:', !!code);
  console.log('[TikTok Callback] error:', error || 'none');

  if (error) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#666;background:#111;text-align:center">
        <p>Authorization cancelled. Closing window...</p>
        <script>setTimeout(()=>window.close(),2000)</script>
      </body></html>`);
  }

  // Verify the signed state — no cookie lookup needed
  if (!state || !verifySignedState(state as string)) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#111;text-align:center">
        <h3>Link expired</h3>
        <p>This authorization link has expired. Please close this window and click "Connect Account" again.</p>
        <script>setTimeout(()=>window.close(),4000)</script>
      </body></html>`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, open_id } = tokenResponse.data;

    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const user = userResponse.data.data.user;

    // Set auth cookies on the RESPONSE — these go to whichever context
    // (popup or same tab) made the callback request
    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 86400000
    };

    res.cookie('tiktok_token', access_token, cookieOpts);
    res.cookie('tiktok_user', JSON.stringify({
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      open_id
    }), { ...cookieOpts, httpOnly: false });

    // Redirect to success page
    res.redirect('/auth/tiktok/success');

  } catch (err: any) {
    console.error('TikTok Callback Error:', err.response?.data || err.message);
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;color:#c00;background:#111;text-align:center">
        <p>Authentication failed. Please close this window and try again.</p>
        <script>setTimeout(()=>window.close(),3000)</script>
      </body></html>`);
  }
});

app.get('/auth/tiktok/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Connected!</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;
                   background:#0a0a0a;color:#fff">
        <h2>✓ TikTok Connected!</h2>
        <p style="color:#888;font-size:14px">Taking you back to TeleVibe...</p>
        <script>
          (function() {
            // Case 1: we are in a popup — notify parent and close
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ tiktokConnected: true }, '*');
                setTimeout(() => window.close(), 800);
                return;
              }
            } catch(e) {}

            // Case 2: same-tab redirect — go back to app
            setTimeout(function() {
              try {
                var returnUrl = sessionStorage.getItem('tiktok_return') || '/';
                sessionStorage.removeItem('tiktok_return');
                window.location.replace(returnUrl);
              } catch(e) {
                window.location.replace('/');
              }
            }, 1000);
          })();
        </script>
      </body>
    </html>
  `);
});

app.post('/api/tiktok/post', upload.single('video'), async (req, res) => {
  const { caption } = req.body;
  const videoFile = req.file;

  const access_token = req.cookies.tiktok_token;
  if (!access_token) return res.status(401).json({ error: 'Not authenticated' });
  if (!videoFile) return res.status(400).json({ error: 'No video provided' });

  try {
    const initResponse = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/', {
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
    }, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

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

app.get('/api/tiktok/me', (req, res) => {
  try {
    const userCookie = req.cookies.tiktok_user;
    if (!userCookie) return res.status(401).json({ error: 'Not connected' });
    const user = JSON.parse(userCookie);
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Not connected' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const cookieOpts = { secure: true, sameSite: 'none' as const };
  res.clearCookie('tiktok_token', cookieOpts);
  res.clearCookie('tiktok_user', cookieOpts);
  res.json({ success: true });
});

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
