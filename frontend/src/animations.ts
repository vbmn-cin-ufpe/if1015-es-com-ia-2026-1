/**
 * Shared Framer Motion variants & helpers.
 *
 * Design rules:
 *  - Only animate `opacity` + `transform` (GPU-accelerated, no layout thrash)
 *  - All durations ≤ 400ms — snappy, not sluggish
 *  - Framer Motion automatically respects prefers-reduced-motion
 */

import type { Variants, Transition } from "framer-motion";

// ── Easing presets ────────────────────────────────────────────────────────────

export const ease = {
    smooth: [0.4, 0, 0.2, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    out: [0.0, 0.0, 0.2, 1] as const,
};

// ── Page-level transition (route changes) ────────────────────────────────────

export const pageVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    enter:   { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
    duration: 0.22,
    ease: ease.smooth,
};

// ── Fade up — generic card/block entrance ────────────────────────────────────

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0 },
};

export const fadeUpTransition: Transition = {
    duration: 0.3,
    ease: ease.smooth,
};

// ── Stagger container — use on a list wrapper ────────────────────────────────

export const staggerContainer: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.07,
            delayChildren: 0.05,
        },
    },
};

// ── Scale in — small chips, badges ──────────────────────────────────────────

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.85 },
    show:   { opacity: 1, scale: 1 },
};

export const scaleInTransition: Transition = {
    duration: 0.2,
    ease: ease.bounce,
};

// ── Slide in from side — chat bubbles ────────────────────────────────────────

export const slideInRight: Variants = {
    hidden: { opacity: 0, x: 24 },
    show:   { opacity: 1, x: 0 },
};

export const slideInLeft: Variants = {
    hidden: { opacity: 0, x: -24 },
    show:   { opacity: 1, x: 0 },
};

export const chatBubbleTransition: Transition = {
    duration: 0.25,
    ease: ease.smooth,
};

// ── Sidebar collapse / expand ────────────────────────────────────────────────

export const sidebarVariants = (open: boolean) => ({
    width: open ? 208 : 56,
});

export const sidebarTransition: Transition = {
    duration: 0.22,
    ease: ease.smooth,
};

// ── Dropdown (auth panel) ────────────────────────────────────────────────────

export const dropdownVariants: Variants = {
    hidden: { opacity: 0, y: -8, scale: 0.97 },
    show:   { opacity: 1, y: 0,  scale: 1 },
    exit:   { opacity: 0, y: -6, scale: 0.97 },
};

export const dropdownTransition: Transition = {
    duration: 0.18,
    ease: ease.smooth,
};
