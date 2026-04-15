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
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in a short-lived cookie — no session map needed
  res.cookie('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 600000 // 10 minutes
  });

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

  // User cancelled
  if (error) {
    return res.send(`<html><body><p style="font-family:sans-serif;padding:40px;color:#666">
      Authorization cancelled. You can close this window.</p>
      <script>setTimeout(()=>window.close(),2000)</script></body></html>`);
  }

  const storedState = req.cookies.tiktok_oauth_state;

  if (!state || !storedState || state !== storedState) {
    return res.send(`<html><body><p style="font-family:sans-serif;padding:40px;color:#c00">
      Session expired or invalid. Please close this window and try connecting again.</p>
      <script>setTimeout(()=>window.close(),3000)</script></body></html>`);
  }

  // Clear state cookie immediately
  res.clearCookie('tiktok_oauth_state', { secure: true, sameSite: 'none' });

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

    // Store token and user in httpOnly cookies — persists across Cloud Run restarts
    res.cookie('tiktok_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 86400000
    });
    res.cookie('tiktok_user', JSON.stringify({
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      open_id
    }), {
      httpOnly: false, // must be readable by /api/tiktok/me
      secure: true,
      sameSite: 'none',
      maxAge: 86400000
    });

    // Redirect to /auth/tiktok/success — DO NOT use postMessage here
    // because window.opener is null after cross-origin navigation
    res.redirect('/auth/tiktok/success');

  } catch (err: any) {
    console.error('TikTok Callback Error:', err.response?.data || err.message);
    res.send(`<html><body><p style="font-family:sans-serif;padding:40px;color:#c00">
      Authentication failed. Please close this window and try again.</p>
      <script>setTimeout(()=>window.close(),3000)</script></body></html>`);
  }
});

app.get('/auth/tiktok/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Connected!</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
        <h2 style="margin-bottom:8px">✓ TikTok Connected</h2>
        <p style="color:#888;font-size:14px">This window will close automatically...</p>
        <script>
          // Signal the parent window that auth is complete
          try {
            if (window.opener) {
              window.opener.postMessage({ tiktokConnected: true }, '*');
            }
          } catch(e) {}
          // Always close after short delay regardless of opener
          setTimeout(() => window.close(), 1500);
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
  res.clearCookie('tiktok_oauth_state', cookieOpts);
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
