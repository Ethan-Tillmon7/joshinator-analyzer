// frontend/src/components/EvidenceSheet.tsx
// Narrow layouts carry the evidence in a bottom sheet with two detents. It tracks the grabber 1:1,
// lands where the flick projects, and only bounces when a flick put momentum into it.
import React, { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  PanInfo,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { X } from 'lucide-react';
import { FLICK_SPRING, SPRING, project } from '../lib/motion';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const FLICK_VELOCITY = 500; // px/s

function useViewportHeight(): number {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}

const EvidenceSheet: React.FC<Props> = ({ open, onClose, title, children }) => {
  const viewport = useViewportHeight();
  const sheetH = Math.round(viewport * 0.92);
  const large = 0;
  const medium = sheetH - Math.round(viewport * 0.56);
  const closed = sheetH + 32;

  const reduce = useReducedMotion();
  const controls = useDragControls();
  const y = useMotionValue(closed);
  const opacity = useMotionValue(1);
  const scrimOpacity = useTransform(y, [large, medium], [0.4, 0]);
  const [mounted, setMounted] = useState(open);
  const [isLarge, setIsLarge] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useMotionValueEvent(y, 'change', latest => setIsLarge(latest < medium / 2));

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Open to the medium detent; close back down the way it came.
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      if (reduce) {
        y.set(medium);
        opacity.set(0);
        animate(opacity, 1, { duration: 0.2 });
      } else {
        animate(y, medium, SPRING);
      }
      sheetRef.current?.focus({ preventScroll: true });
    } else {
      const done = () => {
        setMounted(false);
        returnFocus.current?.focus?.({ preventScroll: true });
      };
      if (reduce) animate(opacity, 0, { duration: 0.2 }).then(done);
      else animate(y, closed, SPRING).then(done);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const projected = y.get() + project(velocity);
    const stops = [large, medium, closed];
    const target = stops.reduce((best, s) => (Math.abs(s - projected) < Math.abs(best - projected) ? s : best), medium);
    const transition = Math.abs(velocity) > FLICK_VELOCITY ? FLICK_SPRING : SPRING;
    if (target === closed) {
      onClose();
      return;
    }
    animate(y, target, { ...transition, velocity });
  };

  const toggleDetent = () => animate(y, isLarge ? medium : large, SPRING);

  if (!mounted) return null;

  return (
    <>
      <motion.div
        className="sheet-scrim"
        style={{ opacity: scrimOpacity, pointerEvents: isLarge ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={sheetRef}
        id="evidence-sheet"
        className="sheet"
        role="dialog"
        aria-modal={isLarge}
        aria-labelledby="evidence-sheet-title"
        tabIndex={-1}
        style={{ y, opacity, height: sheetH }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: large, bottom: closed }}
        dragElastic={{ top: 0.08, bottom: 0.2 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <div className="sheet-header" onPointerDown={e => controls.start(e)}>
          <button
            type="button"
            className="sheet-grabber"
            onClick={toggleDetent}
            aria-label={isLarge ? 'Shrink evidence' : 'Expand evidence'}
          />
          <h2 className="sheet-title" id="evidence-sheet-title">{title}</h2>
          <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close evidence">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </motion.div>
    </>
  );
};

export default EvidenceSheet;
