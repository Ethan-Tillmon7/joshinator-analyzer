// frontend/src/lib/motion.ts
// One motion grammar: critically damped springs by default (Apple: damping 1.0, response ~0.35s),
// a little bounce only after a flick. MotionConfig reducedMotion="user" turns transforms into fades.
import type { Transition } from 'framer-motion';

export const SPRING: Transition = { type: 'spring', bounce: 0, visualDuration: 0.35 };
export const FLICK_SPRING: Transition = { type: 'spring', bounce: 0.2, visualDuration: 0.3 };

// Materials arrive and leave as a material: scale and blur move together, not a bare fade.
export const MATERIAL_HIDDEN = { opacity: 0, scale: 0.96, filter: 'blur(8px)' };
export const MATERIAL_SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' };

// Apple's momentum projection (Designing Fluid Interfaces): where a flick would come to rest.
export const project = (velocityPxPerS: number, decelerationRate = 0.998): number =>
  ((velocityPxPerS / 1000) * decelerationRate) / (1 - decelerationRate);
