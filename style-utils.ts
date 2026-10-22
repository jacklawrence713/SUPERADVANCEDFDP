// ═══════════════════════════════════════════════════════════════════════════
// STYLE UTILITIES FOR COMPREHENSIVE UI MODERNIZATION
// Central place for consistent styles across all components
// ═══════════════════════════════════════════════════════════════════════════

import type React from 'react';

export const styles = {
  // ───────────────────────────────────────────────────────────────────────
  // SPACING
  // ───────────────────────────────────────────────────────────────────────
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  // ───────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY
  // ───────────────────────────────────────────────────────────────────────
  text: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
  },

  // ───────────────────────────────────────────────────────────────────────
  // BORDER RADIUS
  // ───────────────────────────────────────────────────────────────────────
  radius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    '2xl': 16,
    full: 9999,
  },

  // ───────────────────────────────────────────────────────────────────────
  // SHADOWS
  // ───────────────────────────────────────────────────────────────────────
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.1)',
    md: '0 2px 8px rgba(0,0,0,0.15)',
    lg: '0 8px 16px rgba(0,0,0,0.2)',
    xl: '0 12px 32px rgba(0,0,0,0.25)',
  },

  // ───────────────────────────────────────────────────────────────────────
  // TRANSITIONS
  // ───────────────────────────────────────────────────────────────────────
  transition: {
    fast: '0.15s ease-in-out',
    normal: '0.2s ease-in-out',
    slow: '0.3s ease-in-out',
  },
};

// ───────────────────────────────────────────────────────────────────────────
// STYLE GENERATORS
// ───────────────────────────────────────────────────────────────────────────

export const pageLayout = (T: any) => ({
  paddingBottom: 80,
});

export const pageSection = (T: any) => ({
  marginBottom: styles.space.lg,
});

export const card = (T: any) => ({
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: styles.radius.xl,
  padding: styles.space.base,
  transition: `all ${styles.transition.normal}`,
  cursor: 'pointer',
});

export const cardHover = (T: any) => ({
  background: T.bgCard,
  border: `1px solid ${T.borderPurple}`,
  borderRadius: styles.radius.xl,
  padding: styles.space.base,
  boxShadow: styles.shadow.md,
  transform: 'translateY(-2px)',
});

export const button = (T: any) => ({
  padding: `${styles.space.sm}px ${styles.space.lg}px`,
  borderRadius: styles.radius.md,
  border: 'none',
  background: T.purple,
  color: '#fff',
  fontWeight: 700,
  fontSize: styles.text.base,
  cursor: 'pointer',
  transition: `all ${styles.transition.fast}`,
});

export const buttonSecondary = (T: any) => ({
  padding: `${styles.space.sm}px ${styles.space.lg}px`,
  borderRadius: styles.radius.md,
  border: `1px solid ${T.border}`,
  background: 'transparent',
  color: T.text,
  fontWeight: 700,
  fontSize: styles.text.base,
  cursor: 'pointer',
  transition: `all ${styles.transition.fast}`,
});

export const tabNav = (T: any) => ({
  display: 'flex',
  gap: styles.space.sm,
  borderBottom: `1px solid ${T.border}`,
  padding: `0 ${styles.space.base}px`,
  overflowX: 'auto' as const,
  WebkitOverflowScrolling: 'touch' as const,
});

export const tabItem = (T: any, isActive: boolean) => ({
  padding: `${styles.space.md}px ${styles.space.base}px`,
  border: 'none',
  background: 'transparent',
  color: isActive ? T.purple : T.textSub,
  cursor: 'pointer',
  fontSize: styles.text.base,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
  position: 'relative' as const,
  transition: `color ${styles.transition.fast}`,
  borderBottom: isActive ? `2px solid ${T.purple}` : 'none',
  marginBottom: '-1px',
});

export const badge = (T: any, variant: string) => {
  const variants: Record<string, any> = {
    success: { background: T.green + '20', color: T.green },
    danger: { background: T.red + '20', color: T.red },
    warning: { background: T.gold + '20', color: T.gold },
    info: { background: T.cyan + '20', color: T.cyan },
    primary: { background: T.purpleDim, color: T.purple },
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: styles.space.xs,
    padding: `${styles.space.xs}px ${styles.space.md}px`,
    borderRadius: styles.radius.full,
    fontSize: styles.text.xs,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    ...variants[variant],
  };
};

export const row = {
  display: 'flex',
  alignItems: 'center',
  gap: styles.space.base,
};

export const column = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: styles.space.base,
};

export const grid = (cols: number) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: styles.space.lg,
});

export const flexBetween = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const flexCenter = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

// ───────────────────────────────────────────────────────────────────────────
// RESPONSIVE UTILITIES
// ───────────────────────────────────────────────────────────────────────────

export const desktop = (isDesktop: boolean) => (styles: any) =>
  isDesktop ? styles : {};

export const responsive = {
  containerPadding: (isDesktop: boolean) =>
    isDesktop ? styles.space.lg : styles.space.base,

  columnCount: (isDesktop: boolean) => (isDesktop ? 3 : 1),

  gap: (isDesktop: boolean) =>
    isDesktop ? styles.space.xl : styles.space.lg,
};
