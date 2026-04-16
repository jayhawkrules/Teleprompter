import React from 'react';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, RefreshCw, Trash2 } from 'lucide-react';
import type { HistoryItem } from '../../hooks/useAI';

interface Props {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export function HistoryTab({ history, onLoad, onDelete }: Props) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <HistoryIcon className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No history yet</p>
        <p className="text-xs text-zinc-600 mt-1">Generated scripts will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 group"
        >
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                {new Date(item.timestamp).toLocaleDateString()} · {item.topic || 'General'}
              </p>
              <p className="text-xs text-zinc-300 line-clamp-2 italic">
                &ldquo;{item.script.slice(0, 60)}...&rdquo;
              </p>
            </div>

            {/*
              FIX 5: Always visible on touch (hover:none devices).
              On pointer devices, fade in on group-hover.
              Min 44px touch target via h-11 w-11.
            */}
            <div className="flex gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoad(item)}
                className="h-11 w-11 p-0 text-zinc-500 hover:text-white active:text-white"
                title="Load script"
                aria-label="Load script"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="h-11 w-11 p-0 text-zinc-500 hover:text-red-500 active:text-red-500"
                title="Delete"
                aria-label="Delete script"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
