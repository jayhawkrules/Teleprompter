import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Zap, Copy, Check } from 'lucide-react';

// ── #13 Reading time helper ───────────────────────────────────────────────────
function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return '';
  const seconds = Math.round((words / 130) * 60);
  if (seconds < 60) return `~${seconds}s at normal pace`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `~${m}m ${s}s at normal pace`;
}

interface Props {
  script: string;
  setScript: (v: string) => void;
  caption: string;
  setCaption: (v: string) => void;
  aiTopic: string;
  setAiTopic: (v: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  copyStatus: 'idle' | 'copied';
  onCopyCaption: () => void;
  effectiveCaption: string;
}

export function ScriptTab({
  script, setScript,
  caption, setCaption,
  aiTopic, setAiTopic,
  isGenerating, onGenerate,
  copyStatus, onCopyCaption,
  effectiveCaption,
}: Props) {
  return (
    <div className="space-y-4">
      {/* AI Topic */}
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
            onClick={onGenerate}
            disabled={isGenerating}
            title="Generate AI script"
            className="h-auto aspect-square bg-zinc-100 text-black hover:bg-white disabled:bg-zinc-800"
          >
            <Zap className={`w-5 h-5 ${isGenerating ? 'animate-pulse text-yellow-500' : 'fill-current'}`} />
          </Button>
        </div>
        <p className="text-[10px] text-zinc-500 italic">Leave blank for general industry trends</p>
      </div>

      {/* Script textarea + #13 reading time */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-widest text-zinc-400">Your Script</Label>
          {script.trim() && (
            <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
              {readingTime(script)}
            </span>
          )}
        </div>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste your text here..."
          className="min-h-[200px] bg-zinc-900 border-zinc-800 focus:border-zinc-600 transition-colors resize-none text-base leading-relaxed"
        />
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs uppercase tracking-widest text-zinc-400">
            TikTok Caption
            {!caption.trim() && <span className="ml-2 text-zinc-600 normal-case">(auto from script)</span>}
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyCaption}
            className="h-6 text-[10px] gap-1 text-zinc-400 hover:text-white"
          >
            {copyStatus === 'copied'
              ? <><Check className="w-3 h-3 text-green-500" /> Copied</>
              : <><Copy className="w-3 h-3" /> Copy</>}
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
  );
}
