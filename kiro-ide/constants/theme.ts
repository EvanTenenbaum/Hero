/**
 * Hero IDE Theme - Dark IDE aesthetic with syntax highlighting
 */

import { Platform } from "react-native";

// Primary accent colors
export const Accent = {
  primary: "#00D4AA",      // Teal/Mint - Primary actions, AI indicators
  secondary: "#6366F1",    // Indigo - Agent activity, parallel tasks
  warning: "#F59E0B",      // Amber - Pending actions, warnings
  error: "#EF4444",        // Red - Errors, destructive actions
  success: "#10B981",      // Emerald - Completed tasks, success
};

// Syntax highlighting colors
export const Syntax = {
  keyword: "#FF7B72",      // Pink-Red
  string: "#A5D6FF",       // Light Blue
  comment: "#8B949E",      // Gray
  function: "#D2A8FF",     // Purple
  variable: "#FFA657",     // Orange
  type: "#79C0FF",         // Blue
  number: "#79C0FF",       // Blue
  operator: "#FF7B72",     // Pink-Red
};

export const Colors = {
  light: {
    // Light mode (optional, dark is default for IDE)
    text: "#24292F",
    textSecondary: "#57606A",
    textDisabled: "#8C959F",
    background: "#FFFFFF",
    surface: "#F6F8FA",
    elevated: "#FFFFFF",
    border: "#D0D7DE",
    tint: Accent.primary,
    icon: "#57606A",
    tabIconDefault: "#57606A",
    tabIconSelected: Accent.primary,
  },
  dark: {
    // Dark mode (default for IDE)
    text: "#F0F6FC",
    textSecondary: "#8B949E",
    textDisabled: "#484F58",
    background: "#0D1117",
    surface: "#161B22",
    elevated: "#21262D",
    border: "#30363D",
    tint: Accent.primary,
    icon: "#8B949E",
    tabIconDefault: "#8B949E",
    tabIconSelected: Accent.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "Menlo",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Spacing scale (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radius
export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Typography sizes
export const Typography = {
  title: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  code: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
  small: { fontSize: 11, lineHeight: 14, fontWeight: "500" as const },
};
