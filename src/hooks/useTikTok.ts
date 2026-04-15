import { useState, useEffect, useRef, useCallback } from 'react';

export interface TikTokUser {
  display_name: string;
  avatar_url: string;
  open_id: string;
}

export interface ToastFn {
  (type: 'success' | 'error' | 'info', message: string): void;
}

export function useTikTok(showToast: ToastFn) {
  const [tiktokUser, setTiktokUser]     = useState<TikTokUser | null>(null);
  const [tiktokLoading, setTiktokLoading] = useState(true);
  const [isPosting, setIsPosting]       = useState(false);
  const abortedRef                      = useRef(false);

  const fetchUser = useCallback(async (): Promise<TikTokUser | null> => {
    try {
      const res = await fetch('/api/tiktok/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          if (!abortedRef.current) setTiktokUser(data.user);
          return data.user;
        }
      }
      if (!abortedRef.current) setTiktokUser(null);
      return null;
    } catch {
      if (!abortedRef.current) setTiktokUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    abortedRef.current = false;
    const params        = new URLSearchParams(window.location.search);
    const justConnected = params.get('tiktok') === 'connected';

    if (justConnected) {
      window.history.replaceState({}, '', '/');
      let attempts = 0;
      const tryFetch = async () => {
        if (abortedRef.current) return;
        attempts++;
        const user = await fetchUser();
        if (!user && attempts < 5 && !abortedRef.current) {
          setTimeout(tryFetch, 800);
        } else {
          if (!abortedRef.current) setTiktokLoading(false);
        }
      };
      setTimeout(tryFetch, 500);
    } else {
      fetchUser().finally(() => {
        if (!abortedRef.current) setTiktokLoading(false);
      });
    }

    return () => { abortedRef.current = true; };
  }, [fetchUser]);

  const connect = () => { window.location.href = '/auth/tiktok'; };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setTiktokUser(null);
  };

  const postVideo = async (blob: Blob, caption: string): Promise<boolean> => {
    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('video', blob, 'video.webm');
      formData.append('caption', caption);

      const res = await fetch('/api/tiktok/post', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        showToast('success', 'Successfully posted to TikTok!');
        return true;
      }

      const err = await res.json();
      if (res.status === 401) {
        setTiktokUser(null);
        showToast('error', 'TikTok session expired. Please reconnect your account.');
      } else {
        showToast('error', `Failed to post: ${err.error}`);
      }
      return false;
    } catch {
      showToast('error', 'Failed to post to TikTok. Check your connection and try again.');
      return false;
    } finally {
      setIsPosting(false);
    }
  };

  return { tiktokUser, tiktokLoading, isPosting, connect, logout, postVideo };
}
