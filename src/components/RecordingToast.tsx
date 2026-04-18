import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Video, Share2, Download, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import type { TikTokUser } from '../hooks/useTikTok';

interface Props {
  blob: Blob;
  mimeType: string;
  effectiveCaption: string;
  tiktokUser: TikTokUser | null;
  isPosting: boolean;
  onPost: () => void;
  onDownload: () => void;
  onDiscard: () => void;
}

function extFromMime(mime: string): string {
  if (mime.startsWith('video/mp4')) return 'mp4';
  if (mime.startsWith('video/webm')) return 'webm';
  if (mime.startsWith('video/ogg')) return 'ogv';
  return 'mp4';
}

export function RecordingToast({
  blob,
  mimeType,
  effectiveCaption,
  tiktokUser,
  isPosting,
  onPost,
  onDownload,
  onDiscard,
}: Props) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const ext = extFromMime(mimeType);
  const filename = `televibe-${Date.now()}.${ext}`;
  const formatLabel = ext.toUpperCase();

  const buildFile = () => new File([blob], filename, { type: mimeType || blob.type });

  const handleSaveToDevice = async () => {
    const file = buildFile();
    if (isMobile && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'TeleVibe Recording',
          text: effectiveCaption,
        });
      } catch (e) {
        // User cancelled — fine
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleShareToTikTok = async () => {
    const file = buildFile();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'TeleVibe Recording',
          text: effectiveCaption,
        });
      } catch (e) {
        // User cancelled — fine
      }
    } else {
      handleSaveToDevice();
    }
  };

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        zIndex: 200,
      }}
      className="bg-zinc-900 border border-zinc-700 p-4 rounded-2xl shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Recording Ready</p>
          <p className="text-[11px] text-zinc-400">
            {(blob.size / 1024 / 1024).toFixed(2)} MB &middot; {formatLabel}
          </p>
        </div>
      </div>

      {/* Action buttons — stacked full-width for easy tapping on mobile */}
      <div className="flex flex-col gap-2">

        {/* Primary: Save to device / Photos */}
        <Button
          onClick={handleSaveToDevice}
          className="w-full h-12 bg-white text-black hover:bg-zinc-100 font-bold text-sm rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          {isMobile ? 'Save to Photos' : 'Save to Device'}
        </Button>

        {/* Secondary: Share / Open in TikTok */}
        <Button
          onClick={handleShareToTikTok}
          className="w-full h-12 bg-[#fe2c55] hover:bg-[#d9244a] text-white font-bold text-sm rounded-xl shadow-lg shadow-red-500/20"
        >
          {isMobile
            ? <><Smartphone className="w-4 h-4 mr-2" /> Open in TikTok</>
            : <><Share2 className="w-4 h-4 mr-2" /> Share to TikTok</>}
        </Button>

        {/* API post — only if TikTok connected */}
        {tiktokUser && (
          <Button
            onClick={onPost}
            disabled={isPosting}
            variant="outline"
            className="w-full h-11 border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold text-sm rounded-xl"
          >
            {isPosting
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
              : <><Share2 className="w-4 h-4 mr-2" /> Post via API</>}
          </Button>
        )}

        {/* Divider */}
        <div className="border-t border-zinc-800 my-1" />

        {/* Destructive: Record Again — clearly labelled, red so it reads as a reset */}
        <Button
          onClick={onDiscard}
          disabled={isPosting}
          className="w-full h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold text-sm rounded-xl border border-red-500/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Discard &amp; Record Again
        </Button>

      </div>
    </motion.div>
  );
}
