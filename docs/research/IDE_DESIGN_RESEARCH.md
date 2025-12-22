# IDE Design Research Notes

## Source 1: Evil Martians - 5 Essential Design Patterns for Dev Tool UIs

**URL**: https://evilmartians.com/chronicles/keep-it-together-5-essential-design-patterns-for-dev-tool-uis

### Key Patterns Identified:

**1. Tabs for Context Switching**
- Enable quick context switching without losing place
- Reduce cognitive load by organizing work into manageable sections
- Guidelines:
  - Clearly define active state with distinct visual styling
  - Provide visual cues (colors, underlines, shadows) to differentiate active/inactive
  - Active tab should also show "close tab" icon (VS Code, Figma pattern)
- **Pitfalls**:
  - Tab overflow chaos - need menu or scrolling solution
  - Relying solely on color for distinction (accessibility issue)

**2. Toolbars for Common Actions**
- Place common actions within easy reach
- Reduces need to navigate menus for every action
- Guidelines:
  - Determine common actions in user workflow
  - Design prominent buttons for those actions
  - Group items to enable easy identification
- **Pitfalls**:
  - Overcrowding leads to cluttered interface
  - Inconsistent button sizes/colors cause confusion
  - Buttons that don't adapt to context
  - Small hit areas frustrating for users

**3. Navigation Sidebars**
- Guide through files, directories, settings
- Use hierarchical navigation system
- Guidelines:
  - Use indentation and tree-view structures
  - Allow collapse/expand folders
- **Pitfalls**:
  - Information overload from dense hierarchy
  - Important actions become obscured
  - Performance issues with large structures

**4. Properties Panels**
- Dedicated space for displaying/editing attributes
- Guidelines:
  - Display properties in label-value format for clarity
  - Use inline editing with appropriate form controls
- **Pitfalls**:
  - Cluttered panels reduce usability

**5. Output/Console Areas**
- For logs, errors, debugging output
- Essential for developer feedback loop

---

## Key Metrics to Evaluate:

1. **Cognitive Load** - How much mental effort to navigate?
2. **Task Completion Time** - How fast can users accomplish goals?
3. **Error Rate** - How often do users make mistakes?
4. **Discoverability** - Can users find features they need?
5. **Context Switching Cost** - Time lost when switching between tasks



---

## Source 2: Evil Martians - Beyond Monospace: The Perfect Coding Font

**URL**: https://evilmartians.com/chronicles/beyond-monospace-the-search-for-the-perfect-coding-font

### Key Typography Principles for Code:

1. **Hyphens and minus signs should match** - In code, hyphens function as minus signs
2. **Asterisks and carets should resemble math symbols** - They function as operators
3. **Mathematical symbols must not be too small** - They play a major role in code
4. **Quotes and backticks must be distinguishable** - Different string types need visual distinction
5. **Slashes and bars must be vertically centered** - For compound operators alignment
6. **Parentheses, brackets, braces must be distinguishable** - Especially when deeply nested
7. **Zero and capital O must differ** - Slashed, dotted, or distinct shape
8. **I, l, and 1 must differ significantly** - Critical for passwords and identifiers

### Font Testing String:
```
o0O s5S 9gq z2Z Il1|!ij a-+^*~=b .,;: _ `'"
@ {([|])} /* <-> <=> <~> <|> |= /= += ~= */
```

---

## Source 3: Cognitive Load Theory in Software Development

**URL**: https://thevaluable.dev/cognitive-load-theory-software-developer/

### Three Types of Cognitive Load:

1. **Intrinsic Load** - Inherent complexity of the material itself
2. **Extraneous Load** - Unnecessary complexity from poor presentation
3. **Germane Load** - Effort spent building mental schemas (good load)

### Key Principles for IDE Design:

**Working Memory Limits:**
- Miller's Law: 7±2 items can be held in working memory
- Information must be chunked into meaningful groups
- Schemas reduce load by automating recognition

**Reducing Extraneous Load:**
- Isolate concepts - limit dependencies between modules
- Avoid redundant information (same info presented multiple ways)
- Group complementary pieces of information together
- Related things should be visually close (cohesion)

**Supporting Schema Building:**
- Working examples help novices learn
- Experts benefit from problem-solving in groups
- Active learning creates long-term schemas

### Application to UI Design:
- **Minimize visual noise** - Every decorative element adds load
- **Group related controls** - Reduces scanning time
- **Consistent patterns** - Leverage existing schemas
- **Progressive disclosure** - Show complexity only when needed

---

## Source 4: WCAG Accessibility Guidelines

### Color Contrast Requirements:

| Level | Normal Text | Large Text |
|-------|-------------|------------|
| AA (minimum) | 4.5:1 | 3:1 |
| AAA (enhanced) | 7:1 | 4.5:1 |

Large text = 14pt bold or 18pt regular

### Key Accessibility Principles:
- Don't rely solely on color to convey information
- Ensure focus states are clearly visible
- Support keyboard navigation
- Provide sufficient touch targets (44x44px minimum)



---

## Source 5: Nielsen Norman Group - Dark Mode Research

**URL**: https://www.nngroup.com/articles/dark-mode-users-issues/

### User Preferences (Survey of 115 mobile users):
- ~1/3 use dark mode
- ~1/3 use light mode  
- ~1/3 use combination of both

### Why Users Say They Use Dark Mode:
1. **Reduced eye strain** - Most common reason cited
2. **Battery savings** - Widespread belief (only true for OLED displays)
3. **Aesthetic appeal** - "Dark mode is way cooler"
4. **Accessibility** - Benefits those with cataracts/visual impairments

### Research Findings on Eye Strain:
- Dark mode does slightly reduce light intake
- Studies failed to find significant difference in eye strain between modes
- VR study: Dark mode best in dimly lit environments, but advantage over dimmed light mode was "very small"
- **Screen brightness matters as much as color scheme**

### Battery Savings Reality:
- Only works on OLED displays
- At 100% brightness: 67% power reduction
- At 30% brightness: only 14% power reduction
- Apps with lots of images/video see minimal savings

### Key Dark Mode Issues to Avoid:

1. **Insufficient contrast** - Text becomes hard to read
2. **Pure black backgrounds** - Can cause "halation" (light text blooms)
3. **Inverted images** - Photos/graphics look wrong
4. **Inconsistent implementation** - Some elements don't switch
5. **Color meaning changes** - Red/green may not translate well

### Best Practices:
- Use dark gray (#121212) instead of pure black (#000000)
- Test contrast ratios in both modes
- Don't invert photos or complex graphics
- Maintain consistent visual hierarchy
- Test with real users in both modes

### Key Insight:
> "Dark mode is popular, but not essential. Users like dark mode but maintain similar behaviors without it. They think about it at the system level, not the application level."



---

## Source 6: Nielsen Norman Group - Visual Hierarchy in UX

**URL**: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/

### Definition:
Visual hierarchy refers to the organization of design elements so the eye is guided to consume each element in order of intended importance.

### Three Primary Tools for Creating Hierarchy:

**1. Color and Contrast**
- Not the actual color but the contrast in value/saturation
- Type contrast (bold, italic, underlined) also creates hierarchy
- Best practices:
  - Use bright colors for important items, less-saturated for lesser importance
  - Limit to 2 primary + 2 secondary colors
  - Use no more than 3 contrast variations
  - Don't rely only on color (accessibility)

**2. Scale**
- Bigger elements stand out more and attract attention
- Best practices:
  - Use no more than 3 sizes (small, medium, large)
  - Body: 14-16px, Subheader: 18-22px, Header: up to 32px
  - Make most important element biggest
  - Limit big elements to maximum of 2

**3. Grouping (Proximity and Common Regions)**
- Implicit grouping through proximity and whitespace
- Explicit grouping through enclosure/borders
- Best practices:
  - "Let it breathe" - more space = more attention
  - Use containers sparingly to avoid visual clutter

### The Squint Test:
Apply blur to design to see if hierarchy works as intended. Reveals what is emphasized and uncovers underlying structure.

### Key Insight:
> "When the page's visual hierarchy accurately reflects the importance of different design elements, users easily understand it and can successfully complete tasks."

---

## Source 7: Whitespace Research Summary

### Key Findings from Multiple Studies:

**Whitespace increases user attention by 20%** (cited in multiple UX studies)

**Benefits of Whitespace:**
1. Improved readability - more space between lines of text
2. Reduced cognitive load - minimizes visual clutter
3. Better comprehension - 20% improvement in understanding
4. Increased focus - guides eye to important elements
5. Perceived quality - associated with premium brands

**Types of Whitespace:**
- **Micro whitespace**: Between lines, letters, paragraphs
- **Macro whitespace**: Between major sections, margins

**Balance Considerations:**
- Too little = cluttered, overwhelming
- Too much = disconnected, hard to scan
- Developer tools often need higher information density than consumer apps

