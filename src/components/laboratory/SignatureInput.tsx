import React, { useEffect, useRef, useState } from 'react';
import { Signature, Upload, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Button, SegmentedControl } from '../common/Dashboard';
import SignaturePad from '../ui/signature-pad';

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
  // The last image the pad produced. While the value is still that image the pad stays on screen so
  // more strokes, Undo and Clear keep working; any other value (saved, uploaded or already on the
  // record) is shown as a preview instead.
  const drawnValue = useRef<string | null>(null);
  const [padKey, setPadKey] = useState(0);

  // The form reset the field from outside: start the pad afresh too.
  useEffect(() => {
    if (!value && drawnValue.current) {
      drawnValue.current = null;
      setPadKey((key) => key + 1);
    }
  }, [value]);

  const draw = (png: string | null) => {
    drawnValue.current = png;
    onChange(png);
  };
  const clear = () => {
    drawnValue.current = null;
    onChange(null);
  };
  const showPreview = !!value && value !== drawnValue.current;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {!disabled && (
          <SegmentedControl
            ariaLabel={`${label} input`}
            value={mode}
            onChange={(next) => {
              // Leaving the pad unmounts it, so what was drawn becomes a preview like any other value.
              drawnValue.current = null;
              setMode(next);
            }}
            options={[
              { value: 'draw', label: 'Draw' },
              { value: 'upload', label: 'Upload' },
            ]}
          />
        )}
      </div>

      {showPreview ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
          <img src={value!} alt={`${label} on file`} className="h-20 max-w-[60%] object-contain" />
          {!disabled && (
            <Button size="xs" variant="ghost" icon={X} onClick={clear}>
              Remove
            </Button>
          )}
        </div>
      ) : disabled ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Not signed.</p>
      ) : mode === 'draw' ? (
        <div className="space-y-2">
          {saved && !value && (
            <Button size="sm" variant="primaryTeal" icon={Signature} onClick={() => onChange(saved)} className="w-full justify-center">
              Use my saved signature
            </Button>
          )}
          <SignaturePad key={padKey} label={`${label} pad`} onChange={draw} />
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
