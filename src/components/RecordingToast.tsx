import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Video, Share2, Download, RefreshCw } from 'lucide-react';
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={isPosting}
          className="text-zinc-500 hover:text-zinc-100 flex-1"
        >
          Discard
        </Button>

        {tiktokUser ? (
          <Button
            size="sm"
            onClick={onPost}
            disabled={isPosting}
            className="bg-[#fe2c55] text-white hover:bg-[#ef2950] font-bold shadow-lg shadow-red-500/20 flex-1"
          >
            {isPosting
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
              : <><Share2 className="w-4 h-4 mr-2" /> Post to TikTok</>}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onDownload}
            className="bg-zinc-100 text-black hover:bg-white font-bold flex-1"
          >
            <Download className="w-4 h-4 mr-2" /> Save to Device
          </Button>
        )}
      </div>
    </motion.div>
  );
}
