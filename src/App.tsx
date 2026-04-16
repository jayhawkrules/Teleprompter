import React, { useState, useCallback, useRef } from 'react';
import { CameraPreview } from './components/CameraPreview';
import { Teleprompter } from './components/Teleprompter';
import { ScriptTab } from './components/tabs/ScriptTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { StyleTab } from './components/tabs/StyleTab';
import { TikTokTab } from './components/tabs/TikTokTab';
import { RecordingToast } from './components/RecordingToast';
import { ToastStack, type Toast } from './components/ToastStack';
import { useTikTok } from './hooks/useTikTok';
import { useAI } from './hooks/useAI';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Play, Square, Download, Zap,
  ChevronRight, Video, FileText,
  History as HistoryIcon, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [script, setScript]             = useState("Welcome to TeleVibe! Paste your script here. This app will track your voice and scroll automatically as you speak. Perfect for TikTok, Reels, and YouTube Shorts. Try it out now!");
  const [caption, setCaption]           = useState('');
  const [aiTopic, setAiTopic]           = useState('');
  const [isRecording, setIsRecording]   = useState(false);
  const [isLive, setIsLive]             = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [fontSize, setFontSize]         = useState(32);
  const [scrollSpeed, setScrollSpeed]   = useState(20);
  const [opacity, setOpacity]           = useState(40);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [copyStatus, setCopyStatus]     = useState<'idle' | 'copied'>('idle');
  const [toasts, setToasts]             = useState<Toast[]>([]);

  const effectiveCaption = caption.trim() || script.slice(0, 150);

  // ── FIX 3: stable showToast reference via useCallback ────────────────────
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { tiktokUser, tiktokLoading, isPosting, connect, logout, postVideo } = useTikTok(showToast);
  const { isGenerating, history, generate, deleteHistoryItem } = useAI(showToast);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRecordingComplete = useCallback((blob: Blob) => {
    setRecordedBlob(blob);
    setIsRecording(false);
  }, []);

  const handleGenerate = useCallback(() =>
    generate(aiTopic, (newScript, newCaption) => {
      setScript(newScript);
      setCaption(newCaption);
    }), [generate, aiTopic]);

  const handleLoadHistory = useCallback((item: { script: string; caption: string }) => {
    setScript(item.script);
    setCaption(item.caption);
    showToast('info', 'Script loaded from history');
  }, [showToast]);

  const handlePostToTikTok = useCallback(async () => {
    if (!recordedBlob) return;
    const ok = await postVideo(recordedBlob, effectiveCaption);
    if (ok) setRecordedBlob(null);
  }, [recordedBlob, effectiveCaption, postVideo]);

  const downloadVideo = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `televibe-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob]);

  const copyCaption = useCallback(() => {
    navigator.clipboard.writeText(effectiveCaption);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  }, [effectiveCaption]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700">
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-full md:w-[400px] bg-[#111111] border-r border-zinc-800 flex flex-col h-full">

          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">TeleVibe</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'
              }`} />
              <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
                {isLive ? 'System Live' : 'Standby'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                  <TabsTrigger value="script"   className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100"><FileText    className="w-4 h-4" /> Script</TabsTrigger>
                  <TabsTrigger value="history"  className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100"><HistoryIcon className="w-4 h-4" /> History</TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100"><Settings   className="w-4 h-4" /> Style</TabsTrigger>
                  <TabsTrigger value="tiktok"   className="flex-1 gap-2 text-zinc-400 data-[state=active]:text-zinc-100"><Share2     className="w-4 h-4" /> TikTok</TabsTrigger>
                </TabsList>

                <TabsContent value="script" className="mt-6">
                  <ScriptTab
                    script={script}           setScript={setScript}
                    caption={caption}         setCaption={setCaption}
                    aiTopic={aiTopic}         setAiTopic={setAiTopic}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                    copyStatus={copyStatus}
                    onCopyCaption={copyCaption}
                    effectiveCaption={effectiveCaption}
                  />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <HistoryTab
                    history={history}
                    onLoad={handleLoadHistory}
                    onDelete={deleteHistoryItem}
                  />
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <StyleTab
                    fontSize={fontSize}           setFontSize={setFontSize}
                    opacity={opacity}             setOpacity={setOpacity}
                    scrollSpeed={scrollSpeed}     setScrollSpeed={setScrollSpeed}
                    isVoiceActive={isVoiceActive} setIsVoiceActive={setIsVoiceActive}
                  />
                </TabsContent>

                <TabsContent value="tiktok" className="mt-6">
                  <TikTokTab
                    user={tiktokUser}
                    loading={tiktokLoading}
                    onConnect={connect}
                    onLogout={logout}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Session controls */}
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
                  onClick={() => { if (isRecording) setIsRecording(false); setIsLive(false); }}
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
                  {isRecording
                    ? <><Square className="w-5 h-5 mr-2 fill-current" /> Stop</>
                    : <><Play   className="w-5 h-5 mr-2 fill-current" /> Record</>}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Preview */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4 md:p-12 overflow-hidden">
          <div className="aspect-[9/16] h-full max-h-[90vh] relative group">
            <CameraPreview
              isRecording={isRecording}
              onRecordingComplete={handleRecordingComplete}
              onStopRecording={() => setIsRecording(false)}
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
              <RecordingToast
                blob={recordedBlob}
                effectiveCaption={effectiveCaption}
                tiktokUser={tiktokUser}
                isPosting={isPosting}
                onPost={handlePostToTikTok}
                onDownload={downloadVideo}
                onDiscard={() => setRecordedBlob(null)}
              />
            )}
          </AnimatePresence>

          {/* Notification toasts */}
          <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
      </div>
    </div>
  );
}
