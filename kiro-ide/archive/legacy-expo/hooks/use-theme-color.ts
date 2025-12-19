/**
 * Theme color hook for Hero IDE
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName,
) {
  // Default to dark theme for IDE aesthetic
  const theme = useColorScheme() ?? "dark";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

// Hook to get all theme colors at once
export function useThemeColors() {
  const theme = useColorScheme() ?? "dark";
  return Colors[theme];
}
