'use client';

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { animate } from 'animejs';

// SSR-safe client detection
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type AnimationTrigger = 'upvote' | 'remove' | null;

interface LightningBurstProps {
  trigger: AnimationTrigger;
  power: number; // 1.0 - 5.0
  anchorRef: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
}

// Simplified tier config - just affects bolt count and colors
type AnimationTier = 'spark' | 'bolt' | 'double' | 'thunder';

function getTier(power: number): AnimationTier {
  if (power >= 4.0) return 'thunder';
  if (power >= 2.5) return 'double';
  if (power >= 1.5) return 'bolt';
  return 'spark';
}

const tierConfig: Record<AnimationTier, { bolts: number; size: number }> = {
  spark: { bolts: 1, size: 48 },
  bolt: { bolts: 1, size: 56 },
  double: { bolts: 2, size: 64 },
  thunder: { bolts: 3, size: 72 },
};

const tierColors: Record<AnimationTier, { fill: string; stroke: string; glow: string }> = {
  spark: { fill: '#FDE047', stroke: '#FACC15', glow: '#FEF9C3' },
  bolt: { fill: '#FBBF24', stroke: '#F59E0B', glow: '#FEF08A' },
  double: { fill: '#F59E0B', stroke: '#D97706', glow: '#FDE68A' },
  thunder: { fill: '#F97316', stroke: '#EA580C', glow: '#FDBA74' },
};

export default function LightningBurst({
  trigger,
  power,
  anchorRef,
  onComplete,
}: LightningBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useRef(false);
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isClient) {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, [isClient]);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!trigger || !isClient || prefersReducedMotion.current || trigger === 'remove') {
      if (trigger) onComplete?.();
      return;
    }

    updatePosition();

    const timer = setTimeout(() => {
      if (!containerRef.current) {
        onComplete?.();
        return;
      }

      const bolts = containerRef.current.querySelectorAll('.lightning-bolt');
      if (bolts.length === 0) {
        onComplete?.();
        return;
      }

      // Simple animation: pop in, hold, shrink out
      Array.from(bolts).forEach((bolt, i) => {
        animate(bolt, {
          scale: [0, 1.3, 1.2, 0.4],
          opacity: [0, 1, 1, 0],
          rotate: [(i - 1) * 8, 0],
          duration: 600,
          ease: 'outQuart',
          delay: i * 20,
        });
      });

      setTimeout(() => onComplete?.(), 650);
    }, 10);

    return () => clearTimeout(timer);
  }, [trigger, power, isClient, updatePosition, onComplete]);

  if (!trigger || trigger === 'remove' || !isClient || !position) return null;

  const tier = getTier(power);
  const config = tierConfig[tier];
  const colors = tierColors[tier];

  return createPortal(
    <div
      ref={containerRef}
      className="fixed pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      }}
    >
      {Array.from({ length: config.bolts }).map((_, i) => {
        const spread = config.bolts > 1 ? (i - (config.bolts - 1) / 2) * 18 : 0;

        return (
          <svg
            key={i}
            className="lightning-bolt absolute"
            width={config.size}
            height={config.size * 1.25}
            viewBox="0 0 16 20"
            fill="none"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translateX(${spread}px)`,
              filter: `drop-shadow(0 0 8px ${colors.glow}) drop-shadow(0 0 4px ${colors.fill})`,
              opacity: 0,
            }}
          >
            <path
              d="M9 1L3 10h4l-1 9 7-11H8l1-8z"
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth="0.5"
            />
            <path d="M8.5 2L4 9h3l-0.5 7 5-8H7.5l1-6z" fill="white" opacity="0.4" />
          </svg>
        );
      })}
    </div>,
    document.body
  );
}
