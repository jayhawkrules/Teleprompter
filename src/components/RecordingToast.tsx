import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Video, Share2, Download, RefreshCw, Smartphone } from 'lucide-react';
import type { TikTokUser } from '../hooks/useTikTok';

interface Props {
  blob: Blob;
  effectiveCaption: string;
  tiktokUser: TikTokUser | null;
  isPosting: boolean;
  onPost: () => void;
  onDownload: () => void;
  onDiscard: () => void;
}

export function RecordingToast({
  blob,
  effectiveCaption,
  tiktokUser,
  isPosting,
  onPost,
  onDownload,
  onDiscard,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save video to device using a real download link
  const handleSaveToDevice = () => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `televibe-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // On mobile: trigger native share sheet so user can share directly to TikTok app
  const handleShareToTikTok = async () => {
    const file = new File([blob], `televibe-${Date.now()}.mp4`, { type: 'video/mp4' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'TeleVibe Recording',
          text: effectiveCaption,
        });
      } catch (e) {
        // User cancelled share — that's fine
      }
    } else {
      // Desktop fallback: just download
      handleSaveToDevice();
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
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
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {(blob.size / 1024 / 1024).toFixed(2)} MB · WebM
          </p>
        </div>
      </div>

      <div className="mb-3 p-2 bg-zinc-800 rounded-lg">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Caption</p>
        <p className="text-xs text-zinc-300 line-clamp-2">{effectiveCaption}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">

        {/* Row 1: TikTok options */}
        <div className="flex gap-2">
          {/* Open in TikTok app (mobile share sheet) */}
          <Button
            size="sm"
            onClick={handleShareToTikTok}
            className="bg-[#fe2c55] text-white hover:bg-[#ef2950] font-bold shadow-lg shadow-red-500/20 flex-1"
          >
            {isMobile
              ? <><Smartphone className="w-4 h-4 mr-2" /> Open in TikTok</>
              : <><Share2 className="w-4 h-4 mr-2" /> Share to TikTok</>}
          </Button>

          {/* Direct API post — only show if TikTok connected */}
          {tiktokUser && (
            <Button
              size="sm"
              onClick={onPost}
              disabled={isPosting}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold flex-1"
            >
              {isPosting
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
                : <><Share2 className="w-4 h-4 mr-2" /> Post via API</>}
            </Button>
          )}
        </div>

        {/* Row 2: Save + Discard */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSaveToDevice}
            className="bg-zinc-100 text-black hover:bg-white font-bold flex-1"
          >
            <Download className="w-4 h-4 mr-2" /> Save to Device
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={isPosting}
            className="text-zinc-500 hover:text-zinc-100 flex-1"
          >
            Discard
          </Button>
        </div>

      </div>
    </motion.div>
  );
}
