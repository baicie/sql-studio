/**
 * Flux Design System — Design Tokens
 * Based on "Precision Data Interface" design language
 *
 * Color Mode: Dark (default)
 * Typography: Geist (UI) + JetBrains Mono (Code)
 * Spacing: 4px baseline grid
 */

export const fluxColors = {
  // Surface scale — layered depth (dark mode)
  surface: '#12131a',
  surface_dim: '#12131a',
  surface_bright: '#383941',
  surface_container_lowest: '#0d0e15',
  surface_container_low: '#1a1b22',
  surface_container: '#1e1f26',
  surface_container_high: '#292931',
  surface_container_highest: '#33343c',

  // On-surface — text & icons
  on_surface: '#e3e1ec',
  on_surface_variant: '#c2c6d6',

  // Inverse
  inverse_surface: '#e3e1ec',
  inverse_on_surface: '#2f3038',
  inverse_primary: '#005ac2',

  // Outlines & borders
  outline: '#8c909f',
  outline_variant: '#424754',

  // Primary (Blue accent)
  primary: '#adc6ff',
  on_primary: '#002e6a',
  primary_container: '#4d8eff',
  on_primary_container: '#00285d',
  primary_fixed: '#d8e2ff',
  primary_fixed_dim: '#adc6ff',
  on_primary_fixed: '#001a42',
  on_primary_fixed_variant: '#004395',

  // Secondary (Cyan accent)
  secondary: '#4cd7f6',
  on_secondary: '#003640',
  secondary_container: '#03b5d3',
  on_secondary_container: '#00424e',
  secondary_fixed: '#acedff',
  secondary_fixed_dim: '#4cd7f6',
  on_secondary_fixed: '#001f26',
  on_secondary_fixed_variant: '#004e5c',

  // Tertiary
  tertiary: '#ffb786',
  on_tertiary: '#502400',
  tertiary_container: '#df7412',
  on_tertiary_container: '#461f00',
  tertiary_fixed: '#ffdcc6',
  tertiary_fixed_dim: '#ffb786',
  on_tertiary_fixed: '#311400',
  on_tertiary_fixed_variant: '#723600',

  // Error
  error: '#ffb4ab',
  on_error: '#690005',
  error_container: '#93000a',
  on_error_container: '#ffdad6',

  // Surface tint
  surface_tint: '#adc6ff',

  // Background (alias of surface for compatibility)
  background: '#12131a',
  on_background: '#e3e1ec',
} as const;

export const fluxColorsLight = {
  // Surface scale — layered depth (light mode)
  surface: '#f8f9fc',
  surface_dim: '#e8eaf0',
  surface_bright: '#ffffff',
  surface_container_lowest: '#ffffff',
  surface_container_low: '#f2f3f8',
  surface_container: '#edEEF3',
  surface_container_high: '#e7e9ef',
  surface_container_highest: '#e2e4ea',

  // On-surface — text & icons
  on_surface: '#1a1b2e',
  on_surface_variant: '#44475f',

  // Inverse
  inverse_surface: '#2d2f3f',
  inverse_on_surface: '#e3e4f0',
  inverse_primary: '#a5c4ff',

  // Outlines & borders
  outline: '#6b7085',
  outline_variant: '#c2c5d6',

  // Primary (Blue accent)
  primary: '#0050cb',
  on_primary: '#ffffff',
  primary_container: '#d8e2ff',
  on_primary_container: '#001849',
  primary_fixed: '#d8e2ff',
  primary_fixed_dim: '#a5c4ff',
  on_primary_fixed: '#00174b',
  on_primary_fixed_variant: '#003ea8',

  // Secondary (Cyan accent)
  secondary: '#005f74',
  on_secondary: '#ffffff',
  secondary_container: '#acedff',
  on_secondary_container: '#001f2a',
  secondary_fixed: '#acedff',
  secondary_fixed_dim: '#4cd7f6',
  on_secondary_fixed: '#001f26',
  on_secondary_fixed_variant: '#004e5c',

  // Tertiary
  tertiary: '#794a00',
  on_tertiary: '#ffffff',
  tertiary_container: '#ffdcbf',
  on_tertiary_container: '#271900',
  tertiary_fixed: '#ffdcbf',
  tertiary_fixed_dim: '#ffb786',
  on_tertiary_fixed: '#311400',
  on_tertiary_fixed_variant: '#723600',

  // Error
  error: '#ba1a1a',
  on_error: '#ffffff',
  error_container: '#ffdad6',
  on_error_container: '#410002',

  // Surface tint
  surface_tint: '#0050cb',

  // Background
  background: '#f8f9fc',
  on_background: '#1a1b2e',
} as const;

export const fluxTypography = {
  headline_lg: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    letterSpacing: '-0.02em',
  },
  headline_md: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '24px',
    letterSpacing: '-0.01em',
  },
  body_lg: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
  },
  body_md: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  },
  body_sm: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '13px',
    fontWeight: '400',
    lineHeight: '18px',
  },
  label_md: {
    fontFamily: 'Geist, system-ui, sans-serif',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '16px',
    letterSpacing: '0.05em',
  },
  code_md: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '13px',
    fontWeight: '400',
    lineHeight: '20px',
  },
  code_sm: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '18px',
  },
} as const;

export const fluxSpacing = {
  unit: '4px',
  sidebar_width: '240px',
  activity_bar_width: '48px',
  gutter: '12px',
  container_padding: '16px',
  touch_target_min: '32px',
} as const;

export const fluxRadius = {
  sm: '2px',
  DEFAULT: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export type FluxColors = typeof fluxColors;
export type FluxColorsLight = typeof fluxColorsLight;
export type FluxTypography = typeof fluxTypography;
export type FluxSpacing = typeof fluxSpacing;
export type FluxRadius = typeof fluxRadius;
