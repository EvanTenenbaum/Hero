// Icon mapping for SF Symbols to Material Icons

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * SF Symbols to Material Icons mappings for Kiro IDE
 */
const MAPPING: Record<string, MaterialIconName> = {
  // Tab bar icons
  "house.fill": "home",
  "bubble.left.fill": "chat",
  "cpu.fill": "memory",
  "gearshape.fill": "settings",
  
  // Navigation
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  
  // File operations
  "folder.fill": "folder",
  "folder.badge.plus": "create-new-folder",
  "doc.fill": "description",
  "doc.badge.plus": "note-add",
  "doc.text.fill": "article",
  "trash.fill": "delete",
  "pencil": "edit",
  "square.and.arrow.up": "upload",
  "square.and.arrow.down": "download",
  
  // Git/GitHub
  "arrow.triangle.branch": "call-split",
  "arrow.up.arrow.down": "sync",
  "arrow.down.circle": "download",
  "arrow.up.circle": "upload",
  "clock.arrow.circlepath": "history",
  
  // AI/Chat
  "sparkles": "auto-awesome",
  "wand.and.stars": "auto-fix-high",
  "brain": "psychology",
  "paperplane.fill": "send",
  "plus.bubble.fill": "add-comment",
  
  // Agents
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "arrow.clockwise": "refresh",
  "bolt.fill": "bolt",
  
  // General
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.octagon.fill": "error",
  "info.circle.fill": "info",
  "magnifyingglass": "search",
  "ellipsis": "more-horiz",
  "ellipsis.vertical": "more-vert",
  "link": "link",
  "key.fill": "vpn-key",
  "server.rack": "dns",
  "terminal.fill": "terminal",
  "list.bullet": "list",
  "list.number": "format-list-numbered",
  "square.grid.2x2.fill": "grid-view",
  "person.fill": "person",
  "star.fill": "star",
  "bookmark.fill": "bookmark",
  "bell.fill": "notifications",
  "heart.fill": "favorite",
  
  // Budget & Limits
  "gauge.with.dots.needle.bottom.50percent": "speed",
  "dollarsign.circle": "attach-money",
  "clock.fill": "schedule",
  "text.word.spacing": "text-fields",
  "arrow.up.left.and.arrow.down.right": "open-in-full",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",
  "arrow.counterclockwise": "undo",
  
  // Task types
  "ladybug.fill": "bug-report",
  "arrow.triangle.2.circlepath": "autorenew",
  "wrench.fill": "build",
  "calendar": "calendar-today",
  "arrow.triangle.pull": "merge-type",
  "arrow.down.circle.fill": "download",
  "questionmark.circle": "help-outline",
  "wind": "air",
  "desktopcomputer": "computer",
  "arrow.uturn.backward": "undo",
  "arrow.right": "arrow-forward",
};

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name];
  if (!mappedName) {
    console.warn(`IconSymbol: No mapping found for "${String(name)}"`);
    return <MaterialIcons color={color} size={size} name="help-outline" style={style} />;
  }
  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}

export type { IconSymbolName };
