import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CameraPreview } from './components/CameraPreview';
import { Teleprompter } from './components/Teleprompter';
import { generateIndustryScript, type GeneratedContent } from './services/geminiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, 
  Play, 
  Square, 
  Download, 
  Zap, 
  ChevronRight,
  Video,
  FileText,
  History as HistoryIcon,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Share2,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryItem extends GeneratedContent {
  id: string;
  timestamp: number;
  topic?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const safeGetStorage = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSetStorage = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* silently ignore */ }
};

export default function App() {
  const [script, setScript] = useState("Welcome to TeleVibe! Paste your script here. This app will track your voice and scroll automatically as you speak. Perfect for TikTok, Reels, and YouTube Shorts. Try it out now!");
  const [caption, setCaption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const [fontSize, setFontSize] = useState(32);
  const [scrollSpeed, setScrollSpeed] = useState(20);
  const [opacity, setOpacity] = useState(40);
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = safeGetStorage('televibe_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [tiktokUser, setTiktokUser] = useState<any>(null);
  const [tiktokLoading, setTiktokLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Ref to abort the retry loop if the component unmounts
  const fetchAbortedRef = useRef(false);

  const effectiveCaption = caption.trim() || script.slice(0, 150);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const fetchTikTokUser = async (): Promise<any | null> => {
    try {
      const res = await fetch('/api/tiktok/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          if (!fetchAbortedRef.current) setTiktokUser(data.user);
          return data.user;
        }
      }
      if (!fetchAbortedRef.current) setTiktokUser(null);
      return null;
    } catch (e) {
      if (!fetchAbortedRef.current) setTiktokUser(null);
      return null;
    }
  };

  useEffect(() => {
    fetchAbortedRef.current = false;
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get('tiktok') === 'connected';

    if (justConnected) {
      window.history.replaceState({}, '', '/');
      let attempts = 0;
      const tryFetch = async () => {
        if (fetchAbortedRef.current) return;
        attempts++;
        const user = await fetchTikTokUser();
        if (!user && attempts < 5 && !fetchAbortedRef.current) {
          setTimeout(tryFetch, 800);
        } else {
          if (!fetchAbortedRef.current) setTiktokLoading(false);
        }
      };
      setTimeout(tryFetch, 500);
    } else {
      fetchTikTokUser().finally(() => {
        if (!fetchAbortedRef.current) setTiktokLoading(false);
      });
    }

    return () => {
      fetchAbortedRef.current = true;
    };
  }, []);

  const handleTikTokConnect = () => {
    window.location.href = '/auth/tiktok';
  };

  const handleTikTokLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setTiktokUser(null);
  };

  const handlePostToTikTok = async () => {
    if (!recordedBlob) return;
    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, 'video.webm');
      formData.append('caption', effectiveCaption);

      const res = await fetch('/api/tiktok/post', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        showToast('success', 'Successfully posted to TikTok!');
        setRecordedBlob(null);
      } else {
        const err = await res.json();
        // If token expired and refresh failed, prompt reconnect
        if (res.status === 401) {
          setTiktokUser(null);
          showToast('error', 'TikTok session expired. Please reconnect your account.');
        } else {
          showToast('error', `Failed to post: ${err.error}`);
        }
      }
    } catch (e) {
      showToast('error', 'Failed to post to TikTok. Check your connection and try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const saveToHistory = (content: GeneratedContent, topic?: string) => {
    const newItem: HistoryItem = {
      ...content,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      topic
    };
    const newHistory = [newItem, ...history].slice(0, 20);
    setHistory(newHistory);
    safeSetStorage('televibe_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    safeSetStorage('televibe_history', JSON.stringify(newHistory));
  };

  const handleGenerateAIScript = async () => {
    setIsGenerating(true);
    try {
      const result = await generateIndustryScript(aiTopic || undefined);
      setScript(result.script);
      setCaption(result.caption);
      saveToHistory(result, aiTopic);
      showToast('success', 'Script generated!');
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      showToast('error', 'AI generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(effectiveCaption);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleRecordingComplete = useCallback((blob: Blob) => {
    setRecordedBlob(blob);
    setIsRecording(false);
  }, []);

  const downloadVideo = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `televibe-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700">
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-full md:w-[400px] bg-[#111111] border-r border-zinc-800 flex flex-col h-full">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">TeleVibe</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`} />
              <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
                {isLive ? 'System Live' : 'Standby'}
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                  <TabsTrigger value="script" className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100">
                    <FileText className="w-4 h-4" /> Script
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100">
                    <HistoryIcon className="w-4 h-4" /> History
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100">
                    <Settings className="w-4 h-4" /> Style
                  </TabsTrigger>
                  <TabsTrigger value="tiktok" className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100">
                    <Share2 className="w-4 h-4" /> TikTok
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="script" className="mt-6 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-zinc-400">AI Topic (Optional)</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g. The future of Netflix, Coachella concert films, Reality TV fatigue..."
                          className="min-h-[60px] bg-zinc-900 border-zinc-800 focus:border-zinc-600 transition-colors resize-none text-sm"
                        />
                        <Button
                          onClick={handleGenerateAIScript}
                          disabled={isGenerating}
                          title="Generate AI script"
                          className="h-auto aspect-square bg-zinc-100 text-black hover:bg-white disabled:bg-zinc-800"
                        >
                          <Zap className={`w-5 h-5 ${isGenerating ? 'animate-pulse text-yellow-500' : 'fill-current'}`} />
                        </Button>
                      </div>
                      <p className="text-[10px] text-zinc-500 italic">Leave blank for general industry trends</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-zinc-400">Your Script</Label>
                      <Textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Paste your text here..."
                        className="min-h-[200px] bg-zinc-900 border-zinc-800 focus:border-zinc-600 transition-colors resize-none text-base leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-widest text-zinc-400">
                          TikTok Caption
                          {!caption.trim() && <span className="ml-2 text-zinc-600 normal-case">(auto from script)</span>}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyCaption}
                          className="h-6 text-[10px] gap-1 text-zinc-400 hover:text-white"
                        >
                          {copyStatus === 'copied' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <Textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder={script.slice(0, 150) + '...'}
                        className="min-h-[80px] bg-zinc-900 border-zinc-800 focus:border-zinc-600 transition-colors resize-none text-sm font-mono"
                      />
                      <p className="text-[10px] text-zinc-600">
                        {effectiveCaption.length} chars · Will be used as TikTok caption when posting
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <div className="text-center py-12">
                        <HistoryIcon className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No history yet</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div key={item.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 group">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                {new Date(item.timestamp).toLocaleDateString()} · {item.topic || 'General'}
                              </p>
                              <p className="text-xs text-zinc-300 line-clamp-2 italic">"{item.script.slice(0, 60)}..."</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setScript(item.script); setCaption(item.caption); showToast('info', 'Script loaded from history'); }}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHistoryItem(item.id)}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-6 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-widest text-zinc-400">Font Size</Label>
                        <span className="text-xs font-mono text-zinc-400">{fontSize}px</span>
                      </div>
                      <Slider
                        value={[fontSize]}
                        onValueChange={(v) => setFontSize(v[0])}
                        min={16} max={80} step={1}
                        className="py-4"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-widest text-zinc-400">Background Opacity</Label>
                        <span className="text-xs font-mono text-zinc-400">{opacity}%</span>
                      </div>
                      <Slider
                        value={[opacity]}
                        onValueChange={(v) => setOpacity(v[0])}
                        min={0} max={100} step={1}
                        className="py-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Voice Sync</Label>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Auto-scroll as you speak</p>
                      </div>
                      <Switch
                        checked={isVoiceActive}
                        onCheckedChange={setIsVoiceActive}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tiktok" className="mt-6 space-y-6">
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-6">
                    {tiktokLoading ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
                        <p className="text-xs text-zinc-600 uppercase tracking-widest">Checking connection...</p>
                      </div>
                    ) : tiktokUser ? (
                      <>
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={tiktokUser.avatar_url}
                            alt={tiktokUser.display_name}
                            className="w-20 h-20 rounded-full border-4 border-zinc-800 shadow-xl"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-bold text-lg">{tiktokUser.display_name}</h3>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">Connected to TikTok</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleTikTokLogout}
                          className="w-full border-zinc-800 hover:bg-zinc-800 gap-2"
                        >
                          <LogOut className="w-4 h-4" /> Disconnect
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-2">
                          <Share2 className="w-8 h-8 text-zinc-500" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">Connect TikTok</h3>
                          <p className="text-sm text-zinc-500 leading-relaxed">
                            Link your account to post your recordings directly to TikTok with one click.
                          </p>
                        </div>
                        <Button
                          onClick={handleTikTokConnect}
                          className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 rounded-xl"
                        >
                          Connect Account
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
            {!isLive ? (
              <Button
                onClick={() => setIsLive(true)}
                className="w-full h-14 bg-zinc-100 text-black hover:bg-white rounded-xl font-bold text-lg shadow-xl shadow-white/5"
              >
                Start Session
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsLive(false)}
                  className="h-14 border-zinc-800 hover:bg-zinc-800 rounded-xl font-bold text-black"
                >
                  Exit
                </Button>
                <Button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`h-14 rounded-xl font-bold text-lg shadow-lg ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                      : 'bg-zinc-100 text-black hover:bg-white shadow-white/5'
                  }`}
                >
                  {isRecording ? <Square className="w-5 h-5 mr-2 fill-current" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4 md:p-12 overflow-hidden">
          <div className="aspect-[9/16] h-full max-h-[90vh] relative group">
            <CameraPreview
              isRecording={isRecording}
              onRecordingComplete={handleRecordingComplete}
            />

            {isLive && (
              <Teleprompter
                text={script}
                fontSize={fontSize}
                scrollSpeed={scrollSpeed}
                isAutoScroll={!isVoiceActive}
                isVoiceActive={isVoiceActive}
                opacity={opacity}
              />
            )}

            <AnimatePresence>
              {!isLive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12 z-30 rounded-3xl"
                >
                  <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-2xl">
                    <Zap className="w-10 h-10 text-black fill-current" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">Ready to Record?</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-[240px]">
                    Configure your script and style on the left, then hit Start Session to begin.
                  </p>
                  <Button
                    onClick={() => setIsLive(true)}
                    className="bg-white text-black hover:bg-zinc-200 h-12 px-8 rounded-full font-bold"
                  >
                    Go Live <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recording ready toast */}
          <AnimatePresence>
            {recordedBlob && !isRecording && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-50 w-[90%] max-w-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Recording Ready</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{(recordedBlob.size / 1024 / 1024).toFixed(2)} MB · WebM</p>
                  </div>
                </div>

                <div className="mb-3 p-2 bg-zinc-800 rounded-lg">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Caption</p>
                  <p className="text-xs text-zinc-300 line-clamp-2">{effectiveCaption}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecordedBlob(null)}
                    disabled={isPosting}
                    className="text-zinc-500 hover:text-zinc-100 flex-1"
                  >
                    Discard
                  </Button>
                  {tiktokUser ? (
                    <Button
                      size="sm"
                      onClick={handlePostToTikTok}
                      disabled={isPosting}
                      className="bg-[#fe2c55] text-white hover:bg-[#ef2950] font-bold shadow-lg shadow-red-500/20 flex-1"
                    >
                      {isPosting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                      {isPosting ? 'Posting...' : 'Post to TikTok'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={downloadVideo}
                      className="bg-zinc-100 text-black hover:bg-white font-bold flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" /> Save to Device
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toast notifications */}
          <div className="absolute top-6 right-6 z-[60] flex flex-col gap-2 w-80">
            <AnimatePresence>
              {toasts.map(toast => (
                <motion.div
                  key={toast.id}
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl ${
                    toast.type === 'success' ? 'bg-zinc-900 border-green-500/30' :
                    toast.type === 'error'   ? 'bg-zinc-900 border-red-500/30' :
                                              'bg-zinc-900 border-zinc-700'
                  }`}
                >
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                  {toast.type === 'error'   && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  {toast.type === 'info'    && <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />}
                  <p className="text-sm text-zinc-200 flex-1 leading-snug">{toast.message}</p>
                  <button onClick={() => dismissToast(toast.id)} className="text-zinc-600 hover:text-zinc-300 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
