# Frontend Design Guidelines

---

## Nielsen's 10 Usability Heuristics

Every UI decision must be evaluated against these. When in doubt, apply the relevant heuristic.

1. **Visibility of system status** — Always keep the user informed. Show loading states, success/error feedback, and progress indicators. Never leave the user wondering if something is happening.

2. **Match between system and the real world** — Use language and concepts the user knows. Avoid internal jargon. Order information naturally. Labels should describe what the user does, not what the system does.

3. **User control and freedom** — Support undo, cancel, and back. Never trap the user in a flow. Destructive actions must be reversible or at minimum confirmed.

4. **Consistency and standards** — Same action always looks and behaves the same way. Follow platform conventions (MUI patterns, keyboard behavior). Don't reinvent interactions that users already understand.

5. **Error prevention** — Design to prevent mistakes before they happen. Disable buttons when actions are unavailable. Use confirmation dialogs for irreversible actions. Validate inputs inline.

6. **Recognition over recall** — Make options visible. Don't require users to remember information between steps. Use labels, icons with text, and visible affordances.

7. **Flexibility and efficiency of use** — Support both novice and expert users. Power users should be able to move fast. Common actions should be one click.

8. **Aesthetic and minimalist design** — Every element on screen should earn its place. Remove anything that does not directly help the user complete a task. Less is more.

9. **Help users recognize, diagnose, and recover from errors** — Error messages must be in plain language, explain what went wrong, and offer a clear path forward. No raw error codes or stack traces.

10. **Help and documentation** — Even a well-designed interface sometimes needs explanation. Keep help contextual, brief, and task-focused.

---

## 10 Crucial UI/UX Principles

1. **Hierarchy** — The most important elements must be visually dominant. Size, weight, contrast, and position communicate importance. Never let everything compete equally for attention.

2. **Proximity** — Related elements belong together. Group logically connected content with consistent spacing. Distance communicates separation; closeness communicates relationship.

3. **Affordance** — Interactive elements must look interactive. Buttons look clickable. Inputs look typeable. Never rely on the user discovering hidden interactions.

4. **Feedback** — Every user action must produce a visible response. Hover states, click responses, loading indicators, and success messages all confirm that the system received the input.

5. **Contrast** — Text must be readable. Interactive elements must be distinguishable from non-interactive ones. Minimum 4.5:1 contrast ratio for body text (WCAG AA).

6. **Fitts's Law** — Make click targets large enough and close enough to where the user's cursor naturally rests. Small or distant targets create friction and errors.

7. **Progressive disclosure** — Show only what the user needs right now. Reveal complexity on demand. Don't front-load every option onto every screen.

8. **Cognitive load** — Limit the number of decisions a user must make at once. Chunk information. Use defaults. Remove unnecessary options from critical paths.

9. **Consistency of mental model** — The interface should behave exactly as the user expects based on how it looked. Visual similarity implies behavioral similarity. Breaking this erodes trust.

10. **Forgiveness** — Good design assumes users will make mistakes. Defaults should be safe. Destructive actions should require confirmation. Inputs should be tolerant of minor formatting errors.

---

## Color System — Pure Noir

* Background: `#0a0a0a` (true black)
* Surface: `#141414` (cards, drawer)
* Elevated surface: `#1c1c1c` (dialogs, modals)
* Primary text: `#ededed`
* Secondary text: `#6b6b6b`
* Accent: `#e0e0e0` (near-white — buttons, active states, links, progress)
* Accent hover: `#c8c8c8`
* Accent text: `#0a0a0a` (text on accent-colored buttons)
* Border: `rgba(255,255,255,0.07)`
* Border hover: `rgba(255,255,255,0.12)`
* Shadow: `0 1px 2px rgba(0,0,0,0.4)`
* Overlay: `rgba(0,0,0,0.7)`

### Rules

* No blue, no hue dominance of any kind
* No gradients
* No multiple accent colors
* Accent (`#e0e0e0`) used only for: buttons, active states, links, focus indicators, progress bars

---

## Typography

* Font: Inter (or MUI default sans-serif)
* Weights: 400 body / 500 UI labels / 600 headings

### Rules

* No large text blocks
* Keep line length short
* Use consistent hierarchy — never skip heading levels
* Secondary text (`#6b6b6b`) for metadata, captions, helper text

---

## Spacing System

Strict scale only:

```
4px  8px  12px  16px  24px  32px
```

* No arbitrary values (no 5px, 10px, 15px, 20px, 30px)
* Prefer padding over margin
* Keep layouts breathable — don't pack elements together

---

## Layout

* Max width: `1100px`
* Centered content
* Use flex or grid — no absolute positioning unless truly necessary

### Structure

* Sidebar (optional)
* Top bar
* Content area

---

## Components (MUI)

* Use default MUI components
* Override only: colors, border-radius, spacing
* Border radius: `6px` everywhere — no pills, no circles
* Borders: `1px solid rgba(255,255,255,0.07)` — subtle, not decorative
* No elevation stacking — use `elevation={0}` and let theme borders define surfaces

---

## Shadows

* Avoid heavy shadows
* Allowed: `box-shadow: 0 1px 2px rgba(0,0,0,0.4)`
* No colored shadows, no spread > 2px

---

## Buttons

* Primary (contained): `#e0e0e0` background, `#0a0a0a` text
* Secondary (outlined): transparent background, `rgba(255,255,255,0.07)` border
* Text buttons: no border, no background, `#ededed` text

### Rules

* No gradients
* No rounded pills (`border-radius: 6px` everywhere)
* Keep compact — no oversized padding on icon buttons

---

## Animations

* Duration: `120ms – 180ms`
* Easing: `ease-out`
* Allowed: hover fade, background color transitions, slight scale (`1.01`)
* Avoid: bouncy animations, large motion, delays, entrance animations on static UI

---

## Interaction States

* Hover: `rgba(255,255,255,0.04)` background overlay
* Active / selected: `rgba(255,255,255,0.06)`
* Focus: visible outline using accent color
* Disabled: reduce opacity, no pointer events

---

## Cards / Surfaces

* Flat design — `elevation={0}`
* Distinct from background via border (`rgba(255,255,255,0.07)`) not shadow
* No stacked elevation (don't put a card inside a card inside a card)

---

## Icons

* Simple, outline style
* Consistent size: 16px inline / 20px standalone
* Pair with labels wherever space allows (recognition over recall — heuristic #6)

---

## Error & Feedback States

* Errors: plain language, explain cause, provide action (heuristic #9)
* Loading: always show a spinner or skeleton — never blank space (heuristic #1)
* Success: brief, non-blocking confirmation
* Destructive actions: always require confirmation dialog (heuristic #3 + #5)

---

## Do NOT Do

* Gradients
* Glassmorphism
* Multiple accent colors or any hue dominance
* Heavy shadows or `elevation > 0`
* Over-animation or entrance animations
* Inconsistent spacing (off-scale values)
* Hiding interactive elements — affordance must be visible
* Showing raw error codes or stack traces to users
* Disabling the back/cancel path in any flow

---

## Reference

* linear.app
* vercel.com
* stripe.com/dashboard
* Nielsen Norman Group — nngroup.com
