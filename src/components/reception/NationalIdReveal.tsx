import React, { useEffect, useRef, useState } from 'react';

interface NationalIdRevealProps {
  visitorId: string;
  maskedValue: string;
  onReveal: (visitorId: string) => Promise<string | null>;
}

export const NationalIdReveal: React.FC<NationalIdRevealProps> = ({
  visitorId,
  maskedValue,
  onReveal,
}) => {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setRevealedValue(null);
    return () => window.clearTimeout(timer.current);
  }, [visitorId]);

  const reveal = async () => {
    const value = await onReveal(visitorId);
    if (!value) return;
    setRevealedValue(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRevealedValue(null), 5000);
  };

  return (
    <button
      type="button"
      className="font-mono underline decoration-dotted underline-offset-2"
      title="Reveal National ID for five seconds"
      aria-label={`National ID ${revealedValue ? 'visible' : 'masked'}; activate to reveal for five seconds`}
      onClick={() => void reveal()}
    >
      {revealedValue ?? maskedValue}
    </button>
  );
};
