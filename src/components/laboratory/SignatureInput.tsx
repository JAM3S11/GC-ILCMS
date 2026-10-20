import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, Signature, Upload, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Button, SegmentedControl } from '../common/Dashboard';

const MAX_IMAGE_BYTES = 300 * 1024;

/** Reads an uploaded PNG/JPEG as a data URL, refusing anything too large to store. */
export const readImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      reject(new Error('Choose a PNG or JPEG image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('The image must be smaller than 300 KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });

/* The signed-in officer's saved signature (Settings → My signature), fetched once per session. */
let savedSignatureRequest: Promise<string | null> | null = null;
const savedSignatureListeners = new Set<(value: string | null) => void>();

const loadSavedSignature = () => {
  savedSignatureRequest ??= apiRequest<{ signature: string | null }>('/api/account/signature')
    .then((result) => result.signature)
    .catch(() => {
      savedSignatureRequest = null;
      return null;
    });
  return savedSignatureRequest;
};

/** Call after saving or clearing the signature in Settings so open forms pick it up. */
export const setSavedSignature = (value: string | null) => {
  savedSignatureRequest = Promise.resolve(value);
  savedSignatureListeners.forEach((listener) => listener(value));
};

/** Forget the cached signature, e.g. when another officer signs in on this browser. */
export const resetSavedSignature = () => {
  savedSignatureRequest = null;
};

export const useSavedSignature = (enabled = true) => {
  const [signature, setSignature] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    void loadSavedSignature().then((value) => active && setSignature(value));
    savedSignatureListeners.add(setSignature);
    return () => {
      active = false;
      savedSignatureListeners.delete(setSignature);
    };
  }, [enabled]);
  return signature;
};

interface SignatureInputProps {
  label: string;
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  /** The field is the signed-in officer's own signature: offer their saved one in one click. */
  mine?: boolean;
}

/**
 * A signature captured by drawing on a pad (mouse, pen or finger) or by
 * uploading an image. The value is a PNG/JPEG data URL, or null when empty.
 */
export const SignatureInput: React.FC<SignatureInputProps> = ({ label, value, onChange, disabled = false, mine = false }) => {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const saved = useSavedSignature(mine && !disabled);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drewSomething = useRef(false);

  // Size the canvas backing store to its displayed size for crisp strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'draw') return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a';
    drewSomething.current = false;
  }, [mode]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    drewSomething.current = true;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (drewSomething.current && canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    drewSomething.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {!disabled && (
          <SegmentedControl
            ariaLabel={`${label} input`}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'draw', label: 'Draw' },
              { value: 'upload', label: 'Upload' },
            ]}
          />
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
          <img src={value} alt={`${label} on file`} className="h-14 max-w-[60%] object-contain" />
          {!disabled && (
            <Button size="xs" variant="ghost" icon={X} onClick={clear}>
              Remove
            </Button>
          )}
        </div>
      ) : disabled ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Not signed.</p>
      ) : mode === 'draw' ? (
        <div className="space-y-1">
          {saved && (
            <Button size="sm" variant="primaryTeal" icon={Signature} onClick={() => onChange(saved)} className="w-full justify-center">
              Use my saved signature
            </Button>
          )}
          <canvas
            ref={canvasRef}
            aria-label={`${label} pad — draw your signature`}
            className="h-24 w-full touch-none rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-600"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><PenLine className="h-3 w-3" /> Sign inside the box</span>
            <button type="button" onClick={clear} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200">
              <Eraser className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/40">
          <Upload className="h-4 w-4" /> Choose a PNG or JPEG of the signature (under 300 KB)
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                setError('');
                onChange(await readImageFile(file));
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'The image could not be used.');
              }
            }}
          />
        </label>
      )}
      {error && <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
};
