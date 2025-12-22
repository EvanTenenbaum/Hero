import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

// Check if user is on Mac
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except Escape)
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Built-in shortcuts
      // Shift + ? - Show keyboard shortcuts help
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        showShortcutsHelp();
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

  return {
    isMac,
    modifierKey: isMac ? '⌘' : 'Ctrl',
  };
}

// Show keyboard shortcuts help
function showShortcutsHelp() {
  const mod = isMac ? '⌘' : 'Ctrl';
  toast.info(
    `Keyboard Shortcuts:\n${mod}+K: Command palette\n${mod}+B: Toggle sidebar\n${mod}+1/2/3: Switch panes\nShift+?: This help`,
    { duration: 5000 }
  );
}

// Export shortcut definitions for help display
export const SHORTCUTS = {
  commandPalette: { key: 'K', modifier: true, description: 'Open command palette' },
  toggleSidebar: { key: 'B', modifier: true, description: 'Toggle sidebar' },
  switchPane1: { key: '1', modifier: true, description: 'Switch to pane 1' },
  switchPane2: { key: '2', modifier: true, description: 'Switch to pane 2' },
  switchPane3: { key: '3', modifier: true, description: 'Switch to pane 3' },
  help: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  escape: { key: 'Escape', description: 'Close modal / blur input' },
};

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
