import React, { useState, useCallback } from 'react';
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
import { useAppUpdate } from './hooks/useAppUpdate';
import { formatVersion } from './version';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Play, Square, Zap,
  ChevronRight, Video, FileText,
  History as HistoryIcon, Share2, ChevronLeft,
  RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function extFromMime(mime: string): string {
  if (mime.startsWith('video/mp4')) return 'mp4';
  if (mime.startsWith('video/webm')) return 'webm';
  return 'mp4';
}

export default function App() {
  const [script, setScript]               = useState("Welcome to TeleVibe! Paste your script here. This app will track your voice and scroll automatically as you speak. Perfect for TikTok, Reels, and YouTube Shorts. Try it out now!");
  const [caption, setCaption]             = useState('');
  const [aiTopic, setAiTopic]             = useState('');
  const [isRecording, setIsRecording]     = useState(false);
  const [isLive, setIsLive]               = useState(false);
  const [recordedBlob, setRecordedBlob]   = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('video/mp4');
  const [fontSize, setFontSize]           = useState(32);
  const [scrollSpeed, setScrollSpeed]     = useState(20);
  const [opacity, setOpacity]             = useState(40);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [copyStatus, setCopyStatus]       = useState<'idle' | 'copied'>('idle');
  const [toasts, setToasts]               = useState<Toast[]>([]);
  const [mobileCamera, setMobileCamera]   = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const effectiveCaption = caption.trim() || script.slice(0, 150);

  const { updateAvailable, latestVersion, refresh } = useAppUpdate();

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const { tiktokUser, tiktokLoading, isPosting, connect, logout, postVideo } = useTikTok(showToast);
  const { isGenerating, history, generate, deleteHistoryItem } = useAI(showToast);

  const handleRecordingComplete = useCallback((blob: Blob, mimeType: string) => {
    setRecordedBlob(blob);
    setRecordedMimeType(mimeType);
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
    if (ok) {
      setRecordedBlob(null);
      setRecordedMimeType('video/mp4');
    }
  }, [recordedBlob, effectiveCaption, postVideo]);

  const downloadVideo = useCallback(() => {
    if (!recordedBlob) return;
    const ext = extFromMime(recordedMimeType);
    const url = URL.createObjectURL(recordedBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `televibe-recording-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob, recordedMimeType]);

  const copyCaption = useCallback(() => {
    navigator.clipboard.writeText(effectiveCaption);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  }, [effectiveCaption]);

  const handleExitSession = useCallback(() => {
    if (isRecording) setIsRecording(false);
    setIsLive(false);
    setMobileCamera(false);
  }, [isRecording]);

  const handleStartSession = useCallback(() => {
    setIsLive(true);
    setMobileCamera(true);
  }, []);

  const handleDiscard = useCallback(() => {
    setRecordedBlob(null);
    setRecordedMimeType('video/mp4');
  }, []);

  const UpdateBanner = updateAvailable && !updateDismissed ? (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400"
    >
      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[11px] font-medium flex-1">
        Update available{latestVersion ? ` (v${latestVersion})` : ''} — tap to reload
      </span>
      <button
        onClick={refresh}
        className="text-[11px] font-bold underline underline-offset-2 hover:text-amber-300 transition-colors"
      >
        Update
      </button>
      <button
        onClick={() => setUpdateDismissed(true)}
        className="ml-1 text-amber-500/60 hover:text-amber-400 transition-colors"
        aria-label="Dismiss update notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  ) : null;

  // True when the toast is showing — used to hide the record button so they don't overlap
  const toastVisible = !!recordedBlob && !isRecording;

  const MobileCameraView = (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      style={{ height: '100dvh' }}
    >
      <div className="relative flex-1 overflow-hidden">
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

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between" style={{ zIndex: 100 }}>
          <button
            onClick={() => setMobileCamera(false)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/50 backdrop-blur-md border border-zinc-700 rounded-full text-xs font-bold text-white"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleExitSession}
            className="px-3 py-2 bg-black/50 backdrop-blur-md border border-zinc-700 rounded-full text-xs font-bold text-zinc-300"
          >
            Exit
          </button>
        </div>

        {/* Only show record button when the toast is NOT visible */}
        {!toastVisible && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{ zIndex: 100 }}>
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`flex items-center gap-2 px-10 py-4 rounded-full font-bold text-base shadow-2xl transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              {isRecording
                ? <><Square className="w-5 h-5 fill-current" /> Stop Recording</>
                : <><Play   className="w-5 h-5 fill-current" /> Start Recording</>}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toastVisible && (
          <RecordingToast
            blob={recordedBlob!}
            mimeType={recordedMimeType}
            effectiveCaption={effectiveCaption}
            tiktokUser={tiktokUser}
            isPosting={isPosting}
            onPost={handlePostToTikTok}
            onDownload={downloadVideo}
            onDiscard={handleDiscard}
          />
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>

      <AnimatePresence>
        {mobileCamera && (
          <motion.div
            key="mobile-camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {MobileCameraView}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Left Sidebar ── */}
        <div
          className="w-full md:w-[400px] bg-[#111111] border-r border-zinc-800 flex flex-col"
          style={{ height: '100%', minHeight: 0 }}
        >
          <AnimatePresence>{UpdateBanner}</AnimatePresence>

          <div className="flex-shrink-0 p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-none">TeleVibe</h1>
                <p className="text-[10px] text-zinc-600 font-mono mt-0.5 leading-none">{formatVersion()}</p>
              </div>
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

          <div className="flex-1 overflow-y-auto min-h-0">
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
          </div>

          <div className="flex-shrink-0 p-6 border-t border-zinc-800 bg-zinc-900/50">
            {!isLive ? (
              <>
                <Button
                  onClick={() => setIsLive(true)}
                  className="hidden md:flex w-full h-14 bg-zinc-100 text-black hover:bg-white rounded-xl font-bold text-lg shadow-xl shadow-white/5 items-center justify-center"
                >
                  Start Session
                </Button>
                <Button
                  onClick={handleStartSession}
                  className="flex md:hidden w-full h-14 bg-zinc-100 text-black hover:bg-white rounded-xl font-bold text-lg shadow-xl shadow-white/5 items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" /> Start Recording
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleExitSession}
                  className="h-14 border-zinc-800 hover:bg-zinc-800 rounded-xl font-bold text-black"
                >
                  Exit
                </Button>
                <Button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`hidden md:flex h-14 rounded-xl font-bold text-lg shadow-lg items-center justify-center ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                      : 'bg-zinc-100 text-black hover:bg-white shadow-white/5'
                  }`}
                >
                  {isRecording
                    ? <><Square className="w-5 h-5 mr-2 fill-current" /> Stop</>
                    : <><Play   className="w-5 h-5 mr-2 fill-current" /> Record</>}
                </Button>
                <Button
                  onClick={() => setMobileCamera(true)}
                  className="flex md:hidden h-14 rounded-xl font-bold text-lg shadow-lg bg-zinc-100 text-black hover:bg-white shadow-white/5 items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" /> Camera
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Main Preview (desktop only) ── */}
        <div className="hidden md:flex flex-1 relative bg-black flex-col items-center justify-center p-4 md:p-12 overflow-hidden">
          <div className="aspect-[9/16] h-full max-h-[90vh] relative">
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

            {isLive && !toastVisible && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm shadow-2xl transition-colors ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-white hover:bg-zinc-200 text-black'
                  }`}
                >
                  {isRecording
                    ? <><Square className="w-4 h-4 fill-current" /> Stop Recording</>
                    : <><Play   className="w-4 h-4 fill-current" /> Start Recording</>}
                </button>
              </div>
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

          <AnimatePresence>
            {toastVisible && (
              <RecordingToast
                blob={recordedBlob!}
                mimeType={recordedMimeType}
                effectiveCaption={effectiveCaption}
                tiktokUser={tiktokUser}
                isPosting={isPosting}
                onPost={handlePostToTikTok}
                onDownload={downloadVideo}
                onDiscard={handleDiscard}
              />
            )}
          </AnimatePresence>

          <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>

      </div>
    </div>
  );
}
