# Hero IDE Mobile Design System

**Complete Component Specifications for Mobile Web App**

*Author: Manus AI | Date: December 2024*

---

## Executive Summary

This document defines the complete mobile design system for Hero IDE, building upon the established desktop aesthetic (warm, typography-first, Notion/Bear-inspired) while adapting for touch interfaces and smaller screens. Every specification is grounded in evidence-based research on mobile UX.

---

## Part 1: Design Principles

### 1.1 Core Philosophy

The mobile experience follows these guiding principles:

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Content First** | Let content speak, minimize chrome | Thin headers, no decorative elements |
| **Touch Confident** | Every tap target is reliable | Minimum 44px, generous spacing |
| **Context Preserved** | Don't lose user's place | Bottom sheets over full-page nav |
| **Progressive Disclosure** | Show only what's needed | Expandable sections, "More" patterns |
| **Forgiving** | Easy to undo, hard to break | Confirmation for destructive actions |

### 1.2 Aesthetic Continuity

The mobile design maintains visual continuity with the desktop system:

**Preserved Elements:**
- Warm off-white backgrounds (#FAFAF9)
- Serif headings (Libre Baskerville) for display text
- Sans-serif body (Inter) for UI text
- Amber accent color (#D97706)
- Generous whitespace philosophy

**Adapted Elements:**
- Increased touch target sizes
- Simplified navigation structure
- Single-column layouts
- Bottom-anchored actions
- Reduced information density

---

## Part 2: Color System

### 2.1 Mobile Color Palette

The color system is identical to desktop for consistency:

```css
/* Mobile Color Variables */
:root {
  /* Backgrounds */
  --mobile-bg-primary: #FAFAF9;      /* Main background */
  --mobile-bg-secondary: #F5F5F4;    /* Cards, inputs */
  --mobile-bg-tertiary: #E7E5E4;     /* Hover states */
  --mobile-bg-elevated: #FFFFFF;     /* Sheets, modals */
  
  /* Text */
  --mobile-text-primary: #1C1917;    /* Headings, primary */
  --mobile-text-secondary: #57534E;  /* Body text */
  --mobile-text-tertiary: #78716C;   /* Captions, hints */
  --mobile-text-disabled: #A8A29E;   /* Disabled states */
  
  /* Accent */
  --mobile-accent: #D97706;          /* Primary actions */
  --mobile-accent-hover: #B45309;    /* Pressed state */
  --mobile-accent-light: #FEF3C7;    /* Accent backgrounds */
  
  /* Status */
  --mobile-success: #059669;         /* Success states */
  --mobile-warning: #D97706;         /* Warning states */
  --mobile-error: #DC2626;           /* Error states */
  --mobile-info: #2563EB;            /* Info states */
  
  /* Borders */
  --mobile-border: #E7E5E4;          /* Default borders */
  --mobile-border-focus: #D97706;    /* Focus rings */
}
```

### 2.2 Dark Mode (Mobile)

```css
/* Mobile Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --mobile-bg-primary: #1C1917;
    --mobile-bg-secondary: #292524;
    --mobile-bg-tertiary: #44403C;
    --mobile-bg-elevated: #292524;
    
    --mobile-text-primary: #FAFAF9;
    --mobile-text-secondary: #D6D3D1;
    --mobile-text-tertiary: #A8A29E;
    
    --mobile-border: #44403C;
  }
}
```

---

## Part 3: Typography

### 3.1 Mobile Type Scale

Optimized for mobile readability with larger base sizes:

| Token | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| `display` | 28px | 600 | 1.2 | Page titles |
| `heading-1` | 22px | 600 | 1.3 | Section headers |
| `heading-2` | 18px | 600 | 1.4 | Card titles |
| `body-large` | 17px | 400 | 1.5 | Primary content |
| `body` | 15px | 400 | 1.5 | Default text |
| `body-small` | 13px | 400 | 1.4 | Secondary info |
| `caption` | 11px | 500 | 1.3 | Labels, hints |

### 3.2 Font Stack

```css
/* Mobile Typography */
.mobile-display,
.mobile-heading-1 {
  font-family: 'Libre Baskerville', Georgia, serif;
}

.mobile-body,
.mobile-caption {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.mobile-code {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}
```

### 3.3 Typography Rules

1. **Never use serif below 18px** - Readability degrades on mobile
2. **Minimum body text: 15px** - Below this strains eyes
3. **Maximum line length: 45 characters** - Optimal for mobile reading
4. **Generous line height: 1.5** - Improves scanability

---

## Part 4: Spacing System

### 4.1 Base Unit

The mobile spacing system uses an 8px base unit for consistency:

| Token | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Inline spacing, icon gaps |
| `space-2` | 8px | Tight component spacing |
| `space-3` | 12px | Default component spacing |
| `space-4` | 16px | Section spacing |
| `space-5` | 24px | Card padding |
| `space-6` | 32px | Section margins |
| `space-7` | 48px | Page sections |
| `space-8` | 64px | Major divisions |

### 4.2 Safe Areas

Account for device-specific safe areas:

```css
/* Safe Area Handling */
.mobile-container {
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Part 5: Touch Targets

### 5.1 Minimum Sizes

Based on WCAG 2.2 and platform guidelines:

| Element Type | Minimum Size | Recommended | Spacing |
|--------------|--------------|-------------|---------|
| Primary buttons | 48×48px | 48×48px | 8px |
| Secondary buttons | 44×44px | 48×48px | 8px |
| Icon buttons | 44×44px | 48×48px | 4px |
| List items | 48px height | 56px height | 0px |
| Tab bar items | 48×48px | 64×48px | 0px |
| Inline links | 27×27px | 44px height | 4px |

### 5.2 Touch Target Specifications

```css
/* Touch Target Base */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Primary Action Button */
.mobile-button-primary {
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

/* Icon Button */
.mobile-icon-button {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Part 6: Component Specifications

### 6.1 Bottom Tab Bar

The primary navigation component.

**Specifications:**
```
Height: 56px (+ safe area)
Background: var(--mobile-bg-elevated)
Border: 1px solid var(--mobile-border) (top)
Shadow: 0 -1px 3px rgba(0,0,0,0.05)

Tab Item:
  Width: 20% (5 tabs)
  Height: 56px
  Icon: 24×24px
  Label: 11px, caption weight
  Gap: 4px between icon and label
  
Active State:
  Icon color: var(--mobile-accent)
  Label color: var(--mobile-accent)
  
Inactive State:
  Icon color: var(--mobile-text-tertiary)
  Label color: var(--mobile-text-tertiary)

Badge:
  Size: 18px diameter (min)
  Background: var(--mobile-error)
  Text: 11px, white, bold
  Position: Top-right of icon, offset -4px
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🏠          📁          💬          📋          •••          │
│  Home      Projects      Chat       Board        More          │
│                          (2)                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    ↑ Active (amber)    ↑ Badge
```

### 6.2 Mobile Header

Consistent header across all pages.

**Specifications:**
```
Height: 56px
Background: var(--mobile-bg-primary)
Border: 1px solid var(--mobile-border) (bottom)
Padding: 0 16px

Back Button (optional):
  Size: 44×44px
  Icon: 24×24px, chevron-left
  Position: Left edge
  
Title:
  Font: heading-2 (18px, 600)
  Color: var(--mobile-text-primary)
  Position: Center (or left if no back button)
  Truncate: ellipsis at 200px
  
Actions (optional):
  Size: 44×44px each
  Max: 2 visible, overflow to menu
  Position: Right edge
  Gap: 4px
```

**Variants:**
```
Standard:    [←]     Page Title                    [⚙️]
Large:       Page Title (28px, left-aligned)
             Subtitle (15px, secondary)
Search:      [←]  [🔍 Search...]                   [✕]
```

### 6.3 Bottom Sheet

Modal overlay for contextual content.

**Specifications:**
```
Background: var(--mobile-bg-elevated)
Border-radius: 16px 16px 0 0
Shadow: 0 -4px 20px rgba(0,0,0,0.15)
Max-height: 90vh
Min-height: 200px

Grab Handle:
  Width: 36px
  Height: 4px
  Background: var(--mobile-border)
  Border-radius: 2px
  Position: Center, 8px from top
  
Header (optional):
  Height: 56px
  Title: heading-2, center
  Close button: 44×44px, right edge
  Border-bottom: 1px solid var(--mobile-border)
  
Content:
  Padding: 16px
  Overflow: scroll (vertical)
  
Scrim:
  Background: rgba(0,0,0,0.5)
  Tap to dismiss: enabled
```

**States:**
```
Collapsed: 30% of screen height
Half: 50% of screen height
Expanded: 90% of screen height (modal)
```

### 6.4 List Item

Standard list row component.

**Specifications:**
```
Height: 56px (single line) / 72px (two line)
Padding: 16px horizontal
Background: var(--mobile-bg-primary)
Border-bottom: 1px solid var(--mobile-border)

Leading (optional):
  Size: 40×40px (avatar) or 24×24px (icon)
  Margin-right: 12px
  
Content:
  Primary text: body (15px), primary color
  Secondary text: body-small (13px), tertiary color
  Gap: 2px
  
Trailing (optional):
  Icon: 20×20px, tertiary color
  Text: body-small, tertiary color
  Chevron: 16×16px for navigation
  
Active/Pressed:
  Background: var(--mobile-bg-tertiary)
  
Swipe Actions:
  Left: Destructive (red background)
  Right: Primary action (accent background)
  Icon: 24×24px, white
  Min-width: 80px
```

### 6.5 Card

Container for grouped content.

**Specifications:**
```
Background: var(--mobile-bg-elevated)
Border: 1px solid var(--mobile-border)
Border-radius: 12px
Padding: 16px
Margin: 8px 16px

Header (optional):
  Title: heading-2 (18px)
  Subtitle: body-small, tertiary
  Action: icon button, right aligned
  
Content:
  Flexible, component-specific
  
Footer (optional):
  Border-top: 1px solid var(--mobile-border)
  Padding-top: 12px
  Margin-top: 12px
```

### 6.6 Input Field

Text input component.

**Specifications:**
```
Height: 48px
Background: var(--mobile-bg-secondary)
Border: 1px solid var(--mobile-border)
Border-radius: 8px
Padding: 12px 16px
Font: body (15px)

Label:
  Font: caption (11px), uppercase
  Color: var(--mobile-text-tertiary)
  Margin-bottom: 4px
  
Placeholder:
  Color: var(--mobile-text-disabled)
  
Focus:
  Border-color: var(--mobile-accent)
  Box-shadow: 0 0 0 3px var(--mobile-accent-light)
  
Error:
  Border-color: var(--mobile-error)
  Helper text: body-small, error color
  
Disabled:
  Background: var(--mobile-bg-tertiary)
  Opacity: 0.6
```

### 6.7 Button

Action button component.

**Variants:**

| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| Primary | accent | white | none | Main actions |
| Secondary | transparent | accent | accent | Secondary actions |
| Ghost | transparent | primary | none | Tertiary actions |
| Destructive | error | white | none | Delete, remove |

**Specifications:**
```
Height: 48px (large) / 40px (medium) / 32px (small)
Padding: 12px 24px (large) / 8px 16px (medium) / 6px 12px (small)
Border-radius: 8px
Font: 16px/14px/12px, weight 500

States:
  Default: as specified
  Pressed: darken 10%
  Disabled: opacity 0.5
  Loading: spinner icon, text hidden
```

### 6.8 Chat Message

Message bubble component.

**Specifications:**
```
User Message:
  Background: var(--mobile-accent)
  Text: white
  Border-radius: 16px 16px 4px 16px
  Max-width: 80%
  Align: right
  Padding: 12px 16px
  
AI Message:
  Background: var(--mobile-bg-secondary)
  Text: var(--mobile-text-primary)
  Border-radius: 16px 16px 16px 4px
  Max-width: 85%
  Align: left
  Padding: 12px 16px
  
Code Block (within message):
  Background: var(--mobile-bg-tertiary)
  Font: mobile-code (14px)
  Border-radius: 8px
  Padding: 12px
  Overflow: horizontal scroll
  
Timestamp:
  Font: caption (11px)
  Color: var(--mobile-text-tertiary)
  Margin-top: 4px
```

### 6.9 Kanban Card

Task card for board view.

**Specifications:**
```
Background: var(--mobile-bg-elevated)
Border: 1px solid var(--mobile-border)
Border-radius: 8px
Padding: 12px
Min-height: 72px
Margin-bottom: 8px

Priority Indicator:
  Width: 4px
  Height: 100%
  Position: left edge
  Colors: error (high), warning (medium), success (low), border (none)
  
Title:
  Font: body (15px), weight 500
  Max-lines: 2
  
Metadata:
  Font: caption (11px), tertiary
  Margin-top: 8px
  
Assignee:
  Avatar: 24×24px, right aligned
  
Due Date:
  Icon + text, bottom left
  Color: error if overdue
```

---

## Part 7: Animation & Motion

### 7.1 Timing

| Duration | Use Case |
|----------|----------|
| 100ms | Button press feedback |
| 150ms | Hover/focus states |
| 200ms | Small transitions |
| 300ms | Sheet open/close |
| 400ms | Page transitions |

### 7.2 Easing

```css
/* Standard Easing */
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);      /* Decelerate */
--ease-in: cubic-bezier(0.4, 0.0, 1, 1);         /* Accelerate */
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);   /* Standard */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bounce */
```

### 7.3 Specific Animations

**Bottom Sheet:**
```css
/* Sheet Enter */
@keyframes sheet-enter {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-enter { animation: sheet-enter 300ms var(--ease-out); }

/* Sheet Exit */
@keyframes sheet-exit {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
.sheet-exit { animation: sheet-exit 200ms var(--ease-in); }
```

**Pull to Refresh:**
```css
/* Spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.refresh-spinner { animation: spin 1s linear infinite; }
```

---

## Part 8: Accessibility

### 8.1 Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Touch targets | WCAG 2.2 AA | 44×44px minimum |
| Color contrast | WCAG 2.1 AA | 4.5:1 text, 3:1 UI |
| Focus indicators | WCAG 2.1 AA | 3px accent ring |
| Screen reader | ARIA | Semantic HTML + labels |
| Reduced motion | prefers-reduced-motion | Disable animations |

### 8.2 Focus States

```css
/* Focus Ring */
.focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--mobile-accent-light),
              0 0 0 4px var(--mobile-accent);
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 8.3 Screen Reader Considerations

1. **Bottom sheets**: Announce when opened, trap focus
2. **Swipe actions**: Provide button alternatives
3. **Loading states**: Announce completion
4. **Tab bar**: Mark current tab with aria-current

---

## Part 9: Responsive Breakpoints

### 9.1 Breakpoint System

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `mobile-sm` | < 375px | Compact mobile |
| `mobile` | 375-428px | Standard mobile |
| `mobile-lg` | 428-768px | Large mobile / small tablet |
| `tablet` | 768-1024px | Tablet (hybrid layout) |
| `desktop` | > 1024px | Full desktop |

### 9.2 Layout Adaptations

```css
/* Mobile-first approach */
.container {
  padding: 16px;
}

/* Large mobile */
@media (min-width: 428px) {
  .container {
    padding: 20px;
  }
}

/* Tablet - show sidebar */
@media (min-width: 768px) {
  .mobile-bottom-nav {
    display: none;
  }
  .desktop-sidebar {
    display: flex;
  }
}
```

---

## Part 10: Implementation Checklist

### Pre-Launch Requirements

- [ ] All touch targets ≥ 44px
- [ ] Color contrast passes WCAG AA
- [ ] Bottom tab bar implemented
- [ ] Bottom sheets for contextual content
- [ ] Pull-to-refresh on lists
- [ ] Safe area insets handled
- [ ] Keyboard avoidance for inputs
- [ ] Loading states for all async operations
- [ ] Error states for all failure modes
- [ ] Empty states for all lists
- [ ] Offline indicator
- [ ] Reduced motion support

### Testing Checklist

- [ ] iPhone SE (375px) - smallest supported
- [ ] iPhone 15 Pro (393px) - standard
- [ ] iPhone 15 Pro Max (430px) - large
- [ ] Android (360px) - common Android
- [ ] iPad Mini (768px) - tablet breakpoint
- [ ] Landscape orientation
- [ ] Dark mode
- [ ] VoiceOver/TalkBack
- [ ] Slow network (3G)
- [ ] Offline mode

---

## References

[1] Apple Human Interface Guidelines. "Touch Targets." https://developer.apple.com/design/human-interface-guidelines/

[2] Material Design 3. "Touch Targets." https://m3.material.io/foundations/designing/structure

[3] W3C. "WCAG 2.2 Success Criterion 2.5.8: Target Size (Minimum)." https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

[4] Nielsen Norman Group. "Bottom Sheets: Definition and UX Guidelines." https://www.nngroup.com/articles/bottom-sheet/

[5] Smashing Magazine. "Accessible Tap Target Sizes." https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
