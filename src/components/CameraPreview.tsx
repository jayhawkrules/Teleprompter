import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Video, RefreshCw, Settings2, Square } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CameraPreviewProps {
  isRecording: boolean;
  onRecordingComplete: (blob: Blob) => void;
  onStopRecording: () => void;
}

export function CameraPreview({ isRecording, onRecordingComplete, onStopRecording }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const getDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices);
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
      if (videoDevices.length > 0 && !selectedVideoId) setSelectedVideoId(videoDevices[0].deviceId);
      if (audioDevices.length > 0 && !selectedAudioId) setSelectedAudioId(audioDevices[0].deviceId);
    } catch (e) {
      console.warn('Could not enumerate devices', e);
    }
  };

  const checkPermissions = async () => {
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const cameraStatus = await navigator.permissions.query({ name: 'camera' as any });
        setPermissionStatus(cameraStatus.state);
        cameraStatus.onchange = () => setPermissionStatus(cameraStatus.state);
      } catch {
        console.warn('Permissions API not fully supported for camera');
      }
    }
  };

  const runDebug = async () => {
    const info: any = {
      secureContext: window.isSecureContext,
      mediaDevices: !!navigator.mediaDevices,
      userAgent: navigator.userAgent,
    };
    if (navigator.mediaDevices?.enumerateDevices) {
      const devs = await navigator.mediaDevices.enumerateDevices();
      info.devices = devs.map(d => ({ kind: d.kind, label: d.label || 'unlabeled' }));
    }
    setDebugInfo(info);
  };

  const setupCamera = async (videoId?: string, audioId?: string) => {
    setIsCameraActive(false);
    setError(null);
    await checkPermissions();

    if (!window.isSecureContext) {
      setError('Camera access requires a secure (HTTPS) connection.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access.');
      return;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: videoId ? { deviceId: { exact: videoId } } : { facingMode: 'user' },
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setError(null);
        getDevices();
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('denied')) {
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: videoId ? { deviceId: { exact: videoId } } : true,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = videoOnlyStream;
            setError('Microphone access was denied. Recording will have no audio.');
            return;
          }
        } catch (videoErr: any) {
          console.error('Video-only fallback failed:', videoErr);
        }
      }

      if (!videoId && !audioId) {
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            setError('Running in limited mode (Video only).');
            return;
          }
        } catch (e) {
          console.error('Minimal fallback failed', e);
        }
      }

      setIsCameraActive(false);
      const isIframe = window.self !== window.top;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('denied')) {
        setError(isIframe
          ? "Permission Denied: Browsers often block camera access inside previews. Click 'Open in New Tab' to grant permission, then refresh this page."
          : "Permission Denied: Please click the 'Lock' icon in your address bar and set Camera to 'Allow'."
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Ensure your camera is connected and not being used by another app.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is busy. Close Zoom, Teams, or other tabs using the camera.');
      } else {
        setError(`System Error: ${err.name}. Try opening in a new tab.`);
      }
    }
  };

  useEffect(() => {
    checkPermissions();
    getDevices();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    const getSupportedMimeType = () => {
      const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    };
    const stream = videoRef.current.srcObject as MediaStream;
    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onRecordingComplete(blob);
      chunksRef.current = [];
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-3xl border-4 border-zinc-800 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onCanPlay={() => setIsCameraActive(true)}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {!isCameraActive && !error && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-8 text-center z-40">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
            <Video className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Camera Standby</h3>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-[240px]">
            Click the button below to initialize your camera and microphone.
          </p>
          <Button
            onClick={() => setupCamera()}
            className="bg-white text-black hover:bg-zinc-200 h-12 px-10 rounded-full font-bold shadow-xl shadow-white/10"
          >
            Start Camera
          </Button>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-50">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6">
            <Camera className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-3">Camera Access Blocked</h3>

          <div className="flex items-center gap-2 mb-6 px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
            <div className={`w-2 h-2 rounded-full ${permissionStatus === 'denied' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
              Status: {permissionStatus || 'Unknown'}
            </span>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-[280px]">{error}</p>

          <div className="text-left bg-zinc-800/50 p-5 rounded-2xl mb-8 w-full max-w-[340px] border border-zinc-700/50">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-bold">How to Unblock</p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <p className="text-xs text-zinc-300">Click the <b>Lock</b> icon next to the URL at the top of your browser.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <p className="text-xs text-zinc-300">Find <b>Camera</b> and <b>Microphone</b> and switch them to <b>Allow</b>.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <p className="text-xs text-zinc-300"><b>Refresh</b> the page to apply the new settings.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[340px]">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1 border-zinc-700 hover:bg-zinc-800 h-11 rounded-full font-bold"
              >
                Refresh
              </Button>
              <Button
                onClick={() => setupCamera()}
                className="flex-1 bg-white text-black hover:bg-zinc-200 h-11 rounded-full font-bold shadow-xl shadow-white/10"
              >
                Try Again
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full bg-zinc-800 text-white hover:bg-zinc-700 h-11 rounded-full font-bold border border-zinc-700"
            >
              Open in New Tab
            </Button>
            <Button
              variant="ghost"
              onClick={runDebug}
              className="text-[10px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400"
            >
              Run Debugger
            </Button>
          </div>

          {debugInfo && (
            <div className="mt-6 p-4 bg-black/50 rounded-xl text-left w-full max-w-[340px] border border-zinc-800 overflow-auto max-h-[200px]">
              <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Recording indicator + Stop button overlaid on camera */}
      {isRecording && !error && (
        <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">REC</span>
          </div>
          <button
            onClick={onStopRecording}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-full font-bold text-xs shadow-xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
            aria-label="Stop recording"
          >
            <Square className="w-3 h-3 fill-current" /> Stop
          </button>
        </div>
      )}

      {/* Camera/mic settings dropdown */}
      {!error && (
        <div className="absolute top-6 left-6 z-40">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Camera and microphone settings"
              className="bg-black/40 backdrop-blur-md border border-zinc-800 hover:bg-black/60 h-8 w-8 p-0 rounded-full flex items-center justify-center text-zinc-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <Settings2 className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Camera</DropdownMenuLabel>
              {devices.filter(d => d.kind === 'videoinput').map(device => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => {
                    setSelectedVideoId(device.deviceId);
                    setupCamera(device.deviceId, selectedAudioId);
                  }}
                  className="text-xs"
                >
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Microphone</DropdownMenuLabel>
              {devices.filter(d => d.kind === 'audioinput').map(device => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => {
                    setSelectedAudioId(device.deviceId);
                    setupCamera(selectedVideoId, device.deviceId);
                  }}
                  className="text-xs"
                >
                  {device.label || `Mic ${device.deviceId.slice(0, 5)}`}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={() => setupCamera()} className="text-xs text-zinc-400">
                <RefreshCw className="w-3 h-3 mr-2" /> Reset Connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
