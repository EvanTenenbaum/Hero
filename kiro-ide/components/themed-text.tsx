import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { Fonts } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link" | "code" | "caption" | "small";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const secondaryColor = useThemeColor({}, "textSecondary");

  return (
    <Text
      style={[
        { color: type === "caption" || type === "small" ? secondaryColor : color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        type === "code" ? styles.code : undefined,
        type === "caption" ? styles.caption : undefined,
        type === "small" ? styles.small : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    color: "#00D4AA",
  },
  code: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  small: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
});
