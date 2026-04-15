import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, LogOut, RefreshCw } from 'lucide-react';
import type { TikTokUser } from '../../hooks/useTikTok';

interface Props {
  user: TikTokUser | null;
  loading: boolean;
  onConnect: () => void;
  onLogout: () => void;
}

// #15 — skeleton shown until the async fetch resolves
function Skeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 animate-pulse">
      <div className="w-20 h-20 rounded-full bg-zinc-800" />
      <div className="space-y-2 w-full max-w-[160px]">
        <div className="h-3 bg-zinc-800 rounded-full" />
        <div className="h-2 bg-zinc-800 rounded-full w-3/4 mx-auto" />
      </div>
      <div className="h-10 w-full bg-zinc-800 rounded-xl" />
    </div>
  );
}

export function TikTokTab({ user, loading, onConnect, onLogout }: Props) {
  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-6">
      {loading ? (
        <Skeleton />
      ) : user ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-20 h-20 rounded-full border-4 border-zinc-800 shadow-xl"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-lg">{user.display_name}</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Connected to TikTok</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
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
              Link your account to post recordings directly to TikTok with one click.
            </p>
          </div>
          <Button
            onClick={onConnect}
            className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 rounded-xl"
          >
            Connect Account
          </Button>
        </>
      )}
    </div>
  );
}
