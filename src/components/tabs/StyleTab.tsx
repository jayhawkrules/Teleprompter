import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface Props {
  fontSize: number;
  setFontSize: (v: number) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  scrollSpeed: number;
  setScrollSpeed: (v: number) => void;
  isVoiceActive: boolean;
  setIsVoiceActive: (v: boolean) => void;
}

export function StyleTab({
  fontSize, setFontSize,
  opacity, setOpacity,
  scrollSpeed, setScrollSpeed,
  isVoiceActive, setIsVoiceActive,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Font size */}
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

      {/* Background opacity */}
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

      {/* Voice sync toggle */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Voice Sync</Label>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Auto-scroll as you speak</p>
        </div>
        <Switch checked={isVoiceActive} onCheckedChange={setIsVoiceActive} />
      </div>

      {/* #14 — Scroll speed: only shown when voice sync is OFF */}
      {!isVoiceActive && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-xs uppercase tracking-widest text-zinc-400">
              Auto-Scroll Speed
            </Label>
            <span className="text-xs font-mono text-zinc-400">{scrollSpeed}</span>
          </div>
          <Slider
            value={[scrollSpeed]}
            onValueChange={(v) => setScrollSpeed(v[0])}
            min={1} max={60} step={1}
            className="py-4"
          />
          <p className="text-[10px] text-zinc-600 italic">
            Only active when Voice Sync is off
          </p>
        </div>
      )}
    </div>
  );
}
