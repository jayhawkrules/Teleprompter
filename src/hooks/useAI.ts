import { useState, useEffect, useCallback, useRef } from 'react';
import { generateIndustryScript, type GeneratedContent } from '../services/geminiService';

export interface HistoryItem extends GeneratedContent {
  id:        string;
  timestamp: number;
  topic?:    string;
}

export interface ToastFn {
  (type: 'success' | 'error' | 'info', message: string): void;
}

const LS_KEY = 'televibe_history';
const lsGet  = (): HistoryItem[] => { try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const lsSet  = (items: HistoryItem[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {} };

async function serverGet(): Promise<HistoryItem[] | null> {
  try {
    const res = await fetch('/api/history', { credentials: 'include' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function serverAdd(item: HistoryItem): Promise<HistoryItem[] | null> {
  try {
    const res = await fetch('/api/history', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(item),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function serverDelete(id: string): Promise<HistoryItem[] | null> {
  try {
    const res = await fetch(`/api/history/${id}`, {
      method:      'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export function useAI(showToast: ToastFn) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory]           = useState<HistoryItem[]>([]);
  const [useServer, setUseServer]       = useState<boolean | null>(null);

  // ── FIX 4: ref so addItem/deleteItem always read latest value, no stale closure ──
  const useServerRef = useRef<boolean | null>(null);
  useEffect(() => { useServerRef.current = useServer; }, [useServer]);

  useEffect(() => {
    let cancelled = false;
    serverGet().then(items => {
      if (cancelled) return;
      if (items !== null) {
        setUseServer(true);
        setHistory(items);
      } else {
        setUseServer(false);
        setHistory(lsGet());
      }
    });
    return () => { cancelled = true; };
  }, []);

  const addItem = useCallback(async (item: HistoryItem) => {
    const serverMode = useServerRef.current;

    if (serverMode === true || serverMode === null) {
      const updated = await serverAdd(item);
      if (updated) {
        setHistory(updated);
        return;
      }
    }
    // localStorage fallback
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 20);
      lsSet(next);
      return next;
    });
  }, []); // no deps — reads live value from ref

  const deleteHistoryItem = useCallback(async (id: string) => {
    const serverMode = useServerRef.current;

    if (serverMode === true || serverMode === null) {
      const updated = await serverDelete(id);
      if (updated) {
        setHistory(updated);
        return;
      }
    }
    setHistory(prev => {
      const next = prev.filter(i => i.id !== id);
      lsSet(next);
      return next;
    });
  }, []); // no deps — reads live value from ref

  const generate = useCallback(async (
    topic: string,
    onSuccess: (script: string, caption: string) => void
  ) => {
    setIsGenerating(true);
    try {
      const result = await generateIndustryScript(topic || undefined);
      onSuccess(result.script, result.caption);
      const newItem: HistoryItem = {
        ...result,
        id:        Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        topic:     topic || undefined,
      };
      await addItem(newItem);
      showToast('success', 'Script generated!');
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      showToast('error', 'AI generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  }, [addItem, showToast]);

  return { isGenerating, history, generate, deleteHistoryItem };
}
