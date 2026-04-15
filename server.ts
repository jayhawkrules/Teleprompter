import express from 'express';
import path from 'path';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = 3001;
const upload = multer({ storage: multer.memoryStorage() });

// In-memory session store
// Key: sessionId, Value: { access_token, open_id, state }
const sessions = new Map<string, any>();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = `${APP_URL}/auth/tiktok/callback`;

app.use(cors({
  origin: [APP_URL, 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Route 1: GET /auth/tiktok
app.get('/auth/tiktok', (req, res) => {
  if (!TIKTOK_CLIENT_KEY) {
    return res.status(500).send('TikTok Client Key not configured');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const sessionId = req.cookies.sessionId || crypto.randomUUID();
  
  // Store state in session (or create session)
  const sessionData = sessions.get(sessionId) || {};
  sessions.set(sessionId, { ...sessionData, state });

  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 3600000 // 1 hour
  });

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic,video.upload,video.publish',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// Route 2: GET /auth/tiktok/callback
app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state } = req.query;
  const sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).send('Invalid session');
  }

  const sessionData = sessions.get(sessionId);
  if (state !== sessionData.state) {
    return res.status(400).send('State mismatch');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', 
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, open_id } = tokenResponse.data;
    
    // Fetch user info
    const userResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const user = userResponse.data.data.user;
    
    // Update session
    sessions.set(sessionId, { ...sessionData, access_token, open_id, user });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                tiktokConnected: true, 
                user: ${JSON.stringify(user)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('TikTok Callback Error:', error.response?.data || error.message);
    res.status(500).send('Failed to complete TikTok authentication');
  }
});

// Route 3: POST /api/tiktok/post
app.post('/api/tiktok/post', upload.single('video'), async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { caption } = req.body;
  const videoFile = req.file;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { access_token } = sessions.get(sessionId);
  if (!access_token) return res.status(401).json({ error: 'No access token' });
  if (!videoFile) return res.status(400).json({ error: 'No video provided' });

  try {
    // 1. Initialize Upload
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

    // 2. Upload Video
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
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { user } = sessions.get(sessionId);
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie('sessionId');
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
