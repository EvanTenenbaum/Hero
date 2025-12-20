import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
        const metaMatch = shortcut.meta ? event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Workspace-specific shortcuts hook
export function useWorkspaceShortcuts({
  onPaneSwitch,
  onToggleLeftSidebar,
  onToggleRightPanel,
  onQuickSwitcher,
}: {
  onPaneSwitch: (index: number) => void;
  onToggleLeftSidebar: () => void;
  onToggleRightPanel: () => void;
  onQuickSwitcher?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: '1',
      ctrl: true,
      action: () => onPaneSwitch(0),
      description: 'Switch to Pane 1',
    },
    {
      key: '2',
      ctrl: true,
      action: () => onPaneSwitch(1),
      description: 'Switch to Pane 2',
    },
    {
      key: '3',
      ctrl: true,
      action: () => onPaneSwitch(2),
      description: 'Switch to Pane 3',
    },
    {
      key: 'b',
      ctrl: true,
      action: onToggleLeftSidebar,
      description: 'Toggle left sidebar',
    },
    {
      key: '\\',
      ctrl: true,
      action: onToggleRightPanel,
      description: 'Toggle agent panel',
    },
    ...(onQuickSwitcher
      ? [
          {
            key: 'k',
            ctrl: true,
            action: onQuickSwitcher,
            description: 'Open quick switcher',
          },
        ]
      : []),
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
