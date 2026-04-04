import type { Transition, Variants } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

export const motionDurations = {
  fast: 0.14,
  base: 0.18,
  slow: 0.24,
};

export const motionTransitions = {
  hover: {
    duration: motionDurations.fast,
    ease: easeOut,
  } satisfies Transition,
  base: {
    duration: motionDurations.base,
    ease: easeOut,
  } satisfies Transition,
  dialog: {
    duration: motionDurations.slow,
    ease: easeOut,
  } satisfies Transition,
  layout: {
    duration: 0.22,
    ease: easeOut,
  } satisfies Transition,
};

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.dialog,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: motionTransitions.base,
  },
} satisfies Variants;

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
} satisfies Variants;

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.dialog,
  },
} satisfies Variants;

export const dialogContentVariants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: motionTransitions.dialog,
  },
} satisfies Variants;

export const subtleHoverLift = {
  y: -2,
  transition: motionTransitions.hover,
};

export const subtleTapPress = {
  scale: 0.985,
  transition: motionTransitions.hover,
};
