import { useState } from 'react';
import { generateIndustryScript, type GeneratedContent } from '../services/geminiService';

export interface HistoryItem extends GeneratedContent {
  id: string;
  timestamp: number;
  topic?: string;
}

const safeGetStorage = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSetStorage = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* silently ignore */ }
};

export interface ToastFn {
  (type: 'success' | 'error' | 'info', message: string): void;
}

export function useAI(showToast: ToastFn) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = safeGetStorage('televibe_history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveToHistory = (content: GeneratedContent, topic?: string) => {
    const newItem: HistoryItem = {
      ...content,
      id:        Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      topic,
    };
    const newHistory = [newItem, ...history].slice(0, 20);
    setHistory(newHistory);
    safeSetStorage('televibe_history', JSON.stringify(newHistory));
    return newItem;
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    safeSetStorage('televibe_history', JSON.stringify(newHistory));
  };

  const generate = async (
    topic: string,
    onSuccess: (script: string, caption: string) => void
  ) => {
    setIsGenerating(true);
    try {
      const result = await generateIndustryScript(topic || undefined);
      onSuccess(result.script, result.caption);
      saveToHistory(result, topic);
      showToast('success', 'Script generated!');
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      showToast('error', 'AI generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, history, generate, saveToHistory, deleteHistoryItem };
}
