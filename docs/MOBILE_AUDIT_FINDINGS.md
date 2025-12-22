# Hero IDE Mobile Audit Findings

**Current State Analysis**

*Date: December 2024*

---

## Executive Summary

This document presents a comprehensive audit of Hero IDE's current mobile web app implementation. The analysis covers responsive design patterns, touch interactions, feature availability, and identifies gaps requiring attention for a complete mobile experience.

---

## Part 1: Current Mobile Implementation

### 1.1 Responsive Breakpoints

The application uses Tailwind CSS default breakpoints:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets, primary mobile/desktop split |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

**Key Finding:** The `md:` breakpoint (768px) is the primary mobile/desktop divider. Most components hide/show based on this threshold.

### 1.2 Mobile-Specific Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MobileWorkspace.tsx` | `/components/workspace/` | Swipeable 3-pane workspace for mobile |
| `QuickActions.tsx` (mobile variant) | `/components/` | Floating action button for mobile |
| Mobile sidebar | Built into `DashboardLayout.tsx` | Sheet-based navigation |

### 1.3 Mobile Detection

```typescript
// From useMobile.ts hook
const isMobile = useIsMobile(); // Returns true for width < 768px
```

---

## Part 2: Feature Availability Matrix

### 2.1 Pages - Mobile Status

| Page | Desktop | Mobile | Mobile Issues |
|------|---------|--------|---------------|
| Dashboard (Home) | ✅ Full | ⚠️ Partial | Cards stack but no mobile optimization |
| Projects | ✅ Full | ⚠️ Partial | Grid becomes single column, touch targets small |
| Board (Kanban) | ✅ Full | ⚠️ Partial | Drag-drop difficult on touch, columns overflow |
| Chat | ✅ Full | ✅ Good | Works well, keyboard handling needs work |
| Agents | ✅ Full | ⚠️ Partial | Cards stack but actions cramped |
| Workspace | ✅ Full | ✅ Good | Has dedicated MobileWorkspace component |
| Agent Config | ✅ Full | ❌ Poor | Complex forms don't fit, tabs overflow |
| Execution History | ✅ Full | ⚠️ Partial | Table scrolls horizontally, hard to read |
| Metrics | ✅ Full | ⚠️ Partial | Charts resize but legends overlap |
| Settings | ✅ Full | ⚠️ Partial | Tab navigation cramped, forms functional |

### 2.2 Core Interactions - Mobile Status

| Interaction | Desktop | Mobile | Notes |
|-------------|---------|--------|-------|
| Navigation | Sidebar | Sheet drawer | ✅ Works well |
| File browsing | Tree view | Tree view | ⚠️ Touch targets too small |
| Code editing | Monaco Editor | Monaco Editor | ⚠️ Mobile keyboard issues |
| Drag-and-drop | @dnd-kit | @dnd-kit | ❌ Touch drag unreliable |
| Chat input | Standard | Standard | ⚠️ Keyboard covers input |
| Modals/Dialogs | Centered | Centered | ⚠️ Some overflow viewport |
| Dropdowns | Click | Touch | ✅ Works |
| Forms | Standard | Standard | ⚠️ Some labels truncate |

---

## Part 3: Critical Mobile Issues

### 3.1 CRITICAL: Touch Target Sizes

**Issue:** Many interactive elements are smaller than the recommended 44x44px minimum.

| Element | Current Size | Required | Status |
|---------|--------------|----------|--------|
| Sidebar menu items | 40px height | 44px | ⚠️ Close |
| File tree items | ~32px height | 44px | ❌ Too small |
| Kanban card actions | 24px icons | 44px | ❌ Too small |
| Table row actions | 32px buttons | 44px | ❌ Too small |
| Tab buttons | 36px height | 44px | ⚠️ Close |

### 3.2 CRITICAL: Kanban Board on Mobile

**Issues:**
1. Columns don't fit on screen (horizontal scroll required)
2. Drag-and-drop is unreliable on touch devices
3. Card detail modal covers entire screen with no way to dismiss easily
4. Column headers truncate

**Current Behavior:** Board renders same as desktop with horizontal scroll.

**Recommended:** Implement single-column view with swipe between columns.

### 3.3 HIGH: Code Editor on Mobile

**Issues:**
1. Monaco Editor has limited mobile support
2. Virtual keyboard covers editor content
3. No mobile-friendly code navigation
4. Pinch-to-zoom conflicts with editor zoom

**Current Behavior:** Editor loads but is difficult to use.

**Recommended:** Consider CodeMirror 6 for better mobile support, or implement read-only mode with "Edit on Desktop" prompt.

### 3.4 HIGH: Form Inputs

**Issues:**
1. Labels truncate on narrow screens
2. Some inputs don't have proper `inputmode` attributes
3. Date pickers not optimized for mobile
4. Multi-select dropdowns difficult to use

### 3.5 MEDIUM: Navigation Depth

**Issue:** No breadcrumb or back navigation on mobile. Users can get lost in nested views.

**Example:** Projects → Project Detail → File → Edit has no clear path back.

### 3.6 MEDIUM: Keyboard Handling

**Issues:**
1. Virtual keyboard pushes content up, sometimes hiding input
2. No "Done" button to dismiss keyboard
3. Chat input gets covered when keyboard opens

---

## Part 4: Existing Mobile Patterns (Good)

### 4.1 MobileWorkspace Component

The `MobileWorkspace.tsx` component demonstrates good mobile patterns:

**Strengths:**
- Swipe navigation between panes
- Bottom tab bar for quick access
- Sheet-based agent panel (80vh height)
- Touch event handling for gestures
- Dot indicators for pane position

**Code Pattern:**
```typescript
// Touch handling for swipe
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  const diff = touchStartX.current - touchEndX.current;
  const threshold = 50;
  if (Math.abs(diff) > threshold) {
    // Navigate to next/previous pane
  }
};
```

### 4.2 QuickActions Mobile Variant

**Strengths:**
- Floating action button (FAB) pattern
- Hidden on desktop (`md:hidden`)
- Dropdown menu for actions
- Proper touch targets

### 4.3 Sheet-Based Navigation

**Strengths:**
- Sidebar converts to sheet on mobile
- Slides in from left
- Full height coverage
- Backdrop for dismissal

---

## Part 5: Feature Inventory for Mobile

### 5.1 Must-Have Features (MVP)

| Feature | Priority | Current Status | Mobile Approach |
|---------|----------|----------------|-----------------|
| View projects | P0 | ⚠️ Partial | List view, larger touch targets |
| View/navigate files | P0 | ⚠️ Partial | Expand tree items, breadcrumb nav |
| Chat with AI | P0 | ✅ Good | Keep current, fix keyboard |
| View Kanban board | P0 | ❌ Poor | Single-column swipe view |
| View agent status | P0 | ⚠️ Partial | Card list with status badges |
| Basic settings | P1 | ⚠️ Partial | Simplified form layout |

### 5.2 Should-Have Features

| Feature | Priority | Current Status | Mobile Approach |
|---------|----------|----------------|-----------------|
| Create project | P1 | ⚠️ Partial | Bottom sheet form |
| Move Kanban cards | P1 | ❌ Poor | Long-press → action sheet |
| View code (read-only) | P1 | ⚠️ Partial | Syntax highlighting, no edit |
| View metrics | P2 | ⚠️ Partial | Simplified charts |
| View execution history | P2 | ⚠️ Partial | Timeline view |

### 5.3 Desktop-Only Features

| Feature | Reason |
|---------|--------|
| Code editing | Requires physical keyboard |
| Complex drag-and-drop | Touch unreliable |
| Multi-pane workspace | Screen too small |
| Bulk operations | Too complex for mobile |

---

## Part 6: Recommended Mobile Architecture

### 6.1 Navigation Structure

```
┌─────────────────────────────────────┐
│  Hero IDE              [Avatar] [≡] │  ← Top bar (sticky)
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │  ← Scrollable
│                                     │
├─────────────────────────────────────┤
│  [Home] [Projects] [Chat] [More]    │  ← Bottom tab bar
└─────────────────────────────────────┘
```

### 6.2 Bottom Tab Bar Items

| Tab | Icon | Destination |
|-----|------|-------------|
| Home | Home | Dashboard |
| Projects | Folder | Projects list |
| Chat | MessageSquare | AI Chat |
| More | Menu | Sheet with remaining items |

### 6.3 "More" Sheet Contents

- Agents
- Board
- Metrics
- Settings
- Execution History
- Agent Config

---

## Part 7: Implementation Priorities

### Phase 1: Foundation (Week 1-2)
1. Implement bottom tab bar navigation
2. Increase all touch targets to 44px minimum
3. Fix keyboard handling in Chat
4. Add breadcrumb navigation

### Phase 2: Core Features (Week 3-4)
1. Redesign Kanban for mobile (single-column swipe)
2. Implement mobile-friendly file browser
3. Add "View on Desktop" prompts for complex features
4. Fix modal/sheet sizing

### Phase 3: Polish (Week 5-6)
1. Add pull-to-refresh where appropriate
2. Implement haptic feedback for actions
3. Add offline indicator
4. Optimize performance (lazy loading)

---

## Part 8: Technical Recommendations

### 8.1 CSS Changes

```css
/* Add to index.css */

/* Safe area insets for notched devices */
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}

/* Minimum touch target */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Prevent text selection on touch */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}
```

### 8.2 Component Patterns

```typescript
// Mobile-first component pattern
function FeatureComponent() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileFeatureComponent />;
  }
  
  return <DesktopFeatureComponent />;
}
```

### 8.3 Touch Gesture Library

Consider adding `@use-gesture/react` for consistent gesture handling:
- Swipe navigation
- Pull-to-refresh
- Long-press actions
- Pinch-to-zoom (where appropriate)

---

## Appendix: Screenshots Reference

Current mobile state screenshots should be captured for:
1. Dashboard
2. Projects list
3. Kanban board
4. Chat interface
5. Settings page
6. Agent detail view

*Screenshots to be added during implementation phase.*


---

## Part 9: Evidence-Based Mobile UX Research

### 9.1 Touch Target Size Standards

| Standard | Minimum Size | Recommended | Source |
|----------|--------------|-------------|--------|
| WCAG 2.1 AAA | 44×44 CSS px | 44×44px | W3C |
| WCAG 2.2 AA | 24×24 CSS px | 44×44px | W3C |
| Apple HIG | 44×44 pt | 44×44pt | Apple |
| Material Design | 48×48 dp | 48×48dp | Google |
| Smashing Magazine | 27×27px (inline) | 48×48px | Vitaly Friedman |

**Key Insight from Research:**

> "When designing for touch today, we need to use at least 27×27px for small links or icons in the content area and at least 44×44px for icons at the top and at the bottom of the page."
> — Vitaly Friedman, Smashing Magazine

**Rage Taps:** Users tap multiple times in frustration when targets are too small. This is a measurable metric for user frustration.

### 9.2 Position-Based Target Sizing

Touch targets need different sizes based on screen position:

| Position | Minimum | Reason |
|----------|---------|--------|
| Top corners | 48×48px | Hard to reach, less precise |
| Bottom corners | 48×48px | Thumb zone, but edge of reach |
| Center screen | 44×44px | Easy to reach, most precise |
| Inline text | 27×27px | Context helps, but still needs padding |

### 9.3 Mobile Navigation Patterns (NN/g Research)

From Nielsen Norman Group's Mobile UX Study Guide:

**Recommended Patterns:**
1. **Bottom Navigation Bar** - Most accessible, thumb-friendly
2. **Tab Bar** - Good for 3-5 primary destinations
3. **Hamburger Menu** - Acceptable for secondary navigation
4. **Floating Action Button** - Good for primary action

**Anti-Patterns:**
1. **Split Buttons** - Confusing tap targets
2. **Image Grids for Navigation** - Text lists perform better
3. **Deep Hamburger Menus** - Users get lost

### 9.4 Mobile Content Guidelines

From NN/g research on mobile content:

> "Mobile content is twice as difficult to consume as desktop content."

**Recommendations:**
- Reduce content by 50% for mobile
- Use progressive disclosure
- Prioritize above-the-fold content
- Use accordions for secondary content
- Avoid horizontal scrolling

### 9.5 Mobile Code Editor Considerations

Research on mobile code editing reveals significant challenges:

**Challenges:**
1. Virtual keyboard covers 40-50% of screen
2. Precise cursor positioning is difficult
3. Multi-character selection is error-prone
4. Syntax highlighting increases cognitive load on small screens

**Industry Approaches:**
- **GitHub Mobile** - Read-only code view, edit on desktop prompt
- **GitLab Mobile** - Limited editing, focus on review
- **Codespaces** - Full VS Code in browser, desktop-class experience
- **Working Copy (iOS)** - Optimized git client, minimal editing

**Recommendation for Hero IDE:**
- Prioritize code viewing over editing on mobile
- Implement "Edit on Desktop" prompts for complex changes
- Focus on review, approval, and chat workflows
- Consider read-only syntax highlighting with copy functionality


### 9.6 Bottom Sheet Guidelines (NN/g Research)

**Definition:** A bottom sheet is an overlay anchored to the bottom edge of a mobile screen that displays additional details or actions.

**When to Use:**
- Progressive disclosure of contextual information
- When users need to reference background content
- For temporary controls or options
- When full-page navigation would break context

**When NOT to Use:**
- For always-needed information
- As replacement for page-to-page navigation
- When stacking multiple sheets

**Key Guidelines:**

| Guideline | Reason |
|-----------|--------|
| Support Back button/gesture | Users expect standard navigation |
| Include visible Close button | Grab handles are often ignored |
| Don't stack bottom sheets | Creates navigation confusion |
| Use modal for blocking actions | Non-modal for parallel reference |
| Expandable sheets start non-modal | Become modal when expanded |

**Common Mistake:** Assuming bottom = reachable. Research shows middle of screen is most accessible for varied grip styles.

### 9.7 Swipe Gesture Guidelines

**Swipe-to-Reveal Actions:**

| Pattern | Use Case | Caution |
|---------|----------|---------|
| Swipe left to delete | Destructive actions | Always require confirmation |
| Swipe right to archive | Non-destructive actions | Show visual feedback |
| Swipe to reveal menu | Multiple contextual actions | Limit to 2-3 actions |

**Discoverability Problem:** Swipe gestures are hidden by default. Users may not know they exist.

**Solutions:**
1. Partial reveal on first view (show action peeking)
2. Onboarding hint on first use
3. Long-press alternative for same actions
4. Visual affordance (slight shadow or edge indicator)

### 9.8 Pull-to-Refresh Pattern

**Best Practices:**
- Only use for content that updates (feeds, lists)
- Show clear loading indicator
- Provide haptic feedback on trigger
- Don't use for static content
- Consider auto-refresh for real-time data

**Hero IDE Application:**
- Use for: Project list, activity feed, chat messages
- Don't use for: Settings, static pages, forms
