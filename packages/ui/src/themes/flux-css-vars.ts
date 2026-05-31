/**
 * Flux Design System — CSS Variables
 * Generates CSS custom properties for both dark and light themes.
 * Import this in your app entry point.
 */

import {
  fluxColors,
  fluxColorsLight,
  fluxRadius,
  fluxSpacing,
  fluxTypography,
} from './flux-tokens';

export interface FluxCSSVars {
  colors: Record<string, string>;
  radius: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, string>;
}

export function generateFluxCSSVars(mode: 'dark' | 'light'): FluxCSSVars {
  const colors = mode === 'dark' ? fluxColors : fluxColorsLight;

  return {
    colors: {
      // Surface
      '--color-surface': colors.surface,
      '--color-surface-dim': colors.surface_dim,
      '--color-surface-bright': colors.surface_bright,
      '--color-surface-container-lowest': colors.surface_container_lowest,
      '--color-surface-container-low': colors.surface_container_low,
      '--color-surface-container': colors.surface_container,
      '--color-surface-container-high': colors.surface_container_high,
      '--color-surface-container-highest': colors.surface_container_highest,
      '--color-surface-tint': colors.surface_tint,
      // On-surface
      '--color-on-surface': colors.on_surface,
      '--color-on-surface-variant': colors.on_surface_variant,
      // Inverse
      '--color-inverse-surface': colors.inverse_surface,
      '--color-inverse-on-surface': colors.inverse_on_surface,
      '--color-inverse-primary': colors.inverse_primary,
      // Outline
      '--color-outline': colors.outline,
      '--color-outline-variant': colors.outline_variant,
      // Primary
      '--color-primary': colors.primary,
      '--color-on-primary': colors.on_primary,
      '--color-primary-container': colors.primary_container,
      '--color-on-primary-container': colors.on_primary_container,
      '--color-primary-fixed': colors.primary_fixed,
      '--color-primary-fixed-dim': colors.primary_fixed_dim,
      '--color-on-primary-fixed': colors.on_primary_fixed,
      '--color-on-primary-fixed-variant': colors.on_primary_fixed_variant,
      // Secondary
      '--color-secondary': colors.secondary,
      '--color-on-secondary': colors.on_secondary,
      '--color-secondary-container': colors.secondary_container,
      '--color-on-secondary-container': colors.on_secondary_container,
      '--color-secondary-fixed': colors.secondary_fixed,
      '--color-secondary-fixed-dim': colors.secondary_fixed_dim,
      '--color-on-secondary-fixed': colors.on_secondary_fixed,
      '--color-on-secondary-fixed-variant': colors.on_secondary_fixed_variant,
      // Tertiary
      '--color-tertiary': colors.tertiary,
      '--color-on-tertiary': colors.on_tertiary,
      '--color-tertiary-container': colors.tertiary_container,
      '--color-on-tertiary-container': colors.on_tertiary_container,
      // Error
      '--color-error': colors.error,
      '--color-on-error': colors.on_error,
      '--color-error-container': colors.error_container,
      '--color-on-error-container': colors.on_error_container,
      // Background
      '--color-background': colors.background,
      '--color-on-background': colors.on_background,
    },
    radius: {
      '--radius-sm': fluxRadius.sm,
      '--radius': fluxRadius.DEFAULT,
      '--radius-md': fluxRadius.md,
      '--radius-lg': fluxRadius.lg,
      '--radius-xl': fluxRadius.xl,
      '--radius-full': fluxRadius.full,
    },
    spacing: {
      '--spacing-sidebar-width': fluxSpacing.sidebar_width,
      '--spacing-activity-bar-width': fluxSpacing.activity_bar_width,
      '--spacing-gutter': fluxSpacing.gutter,
      '--spacing-container-padding': fluxSpacing.container_padding,
      '--spacing-touch-target-min': fluxSpacing.touch_target_min,
    },
    typography: {
      '--font-sans':
        '"Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      '--font-mono': '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      '--font-headline-lg': fluxTypography.headline_lg.fontFamily,
      '--font-headline-md': fluxTypography.headline_md.fontFamily,
      '--font-body-lg': fluxTypography.body_lg.fontFamily,
      '--font-body-md': fluxTypography.body_md.fontFamily,
      '--font-body-sm': fluxTypography.body_sm.fontFamily,
      '--font-label-md': fluxTypography.label_md.fontFamily,
      '--font-code-md': fluxTypography.code_md.fontFamily,
      '--font-code-sm': fluxTypography.code_sm.fontFamily,
    },
  };
}

export function applyFluxCSSVars(mode: 'dark' | 'light'): void {
  const root = document.documentElement;
  const vars = generateFluxCSSVars(mode);

  const allVars = { ...vars.colors, ...vars.radius, ...vars.spacing, ...vars.typography };
  for (const [key, value] of Object.entries(allVars)) {
    root.style.setProperty(key, value);
  }
}
