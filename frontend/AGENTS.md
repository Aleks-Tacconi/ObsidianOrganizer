# Frontend Design Guidelines (Linear-style, MUI-based)

## Core Principles

* Minimal, clean, functional
* No decorative elements without purpose
* Focus on spacing, alignment, typography
* Subtle over flashy

---

## Color System

* Background: `#0b0f14` (near black)
* Surface: `#111827` (slightly lighter)
* Primary text: `#e5e7eb`
* Secondary text: `#9ca3af`
* Accent (blue): `#3b82f6`

### Rules

* No gradients
* No multiple accent colors
* Use blue only for:

  * buttons
  * active states
  * focus indicators

---

## Typography

* Font: Inter (or MUI default sans-serif)
* Weights:

  * 400: body
  * 500: UI labels
  * 600: headings

### Rules

* No large text blocks
* Keep line length short
* Use consistent hierarchy

---

## Spacing System

Use a strict scale:

```
4px, 8px, 12px, 16px, 24px, 32px
```

### Rules

* No random spacing values
* Prefer padding over margin when possible
* Keep layouts breathable

---

## Layout

* Max width: `1100px`
* Centered content
* Use grid or flex (no absolute positioning unless necessary)

### Structure

* Sidebar (optional)
* Top bar
* Content area

---

## Components (MUI)

* Use default MUI components
* Override only:

  * colors
  * border radius
  * spacing

### Border Radius

* `6px` everywhere

### Borders

* Use subtle borders instead of shadows:

```
1px solid rgba(255,255,255,0.06)
```

---

## Shadows

* Avoid heavy shadows
* Use only subtle:

```
box-shadow: 0 1px 2px rgba(0,0,0,0.3)
```

---

## Buttons

* Primary: blue background, white text
* Secondary: transparent, subtle border

### Rules

* No gradients
* No large rounded pills
* Keep compact

---

## Animations

* Duration: `120ms – 180ms`
* Easing: `ease-out`

### Allowed

* Hover fade
* Slight scale (`1.01 - 1.02`)
* Background color transitions

### Avoid

* Bouncy animations
* Large motion
* Delays

---

## Interaction States

* Hover: slightly lighter background
* Active: subtle inset or darker shade
* Focus: blue outline

---

## Cards / Surfaces

* Flat design
* Slight contrast from background
* No elevation stacking

---

## Icons

* Simple, outline style
* Consistent size (16px / 20px)

---

## Do NOT Do

* Gradients
* Glassmorphism
* Multiple accent colors
* Heavy shadows
* Over-animation
* Inconsistent spacing

---

## Reference

* linear.app
* vercel.com
- skills.sh
