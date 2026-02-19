# Design Tokens: Discord Clone Reference

**Created:** 2026-02-18
**Status:** Complete ✅

## Overview

This document extracts all visual design tokens from the discord-clone reference for use in the MELO UI redesign.

## CSS Variables (globals.css)

### Light Mode (`:root`)

```css
:root {
  --background: 0 0% 100%;           /* White */
  --foreground: 20 14.3% 4.1%;       /* Near black */
  
  --card: 0 0% 100%;
  --card-foreground: 20 14.3% 4.1%;
  
  --popover: 0 0% 100%;
  --popover-foreground: 20 14.3% 4.1%;
  
  --primary: 24 9.8% 10%;            /* Dark brown-gray */
  --primary-foreground: 60 9.1% 97.8%;
  
  --secondary: 60 4.8% 95.9%;        /* Light gray */
  --secondary-foreground: 24 9.8% 10%;
  
  --muted: 60 4.8% 95.9%;
  --muted-foreground: 25 5.3% 44.7%;
  
  --accent: 60 4.8% 95.9%;
  --accent-foreground: 24 9.8% 10%;
  
  --destructive: 0 84.2% 60.2%;      /* Red */
  --destructive-foreground: 60 9.1% 97.8%;
  
  --border: 20 5.9% 90%;
  --input: 20 5.9% 90%;
  --ring: 20 14.3% 4.1%;
  
  --radius: 0.5rem;
}
```

### Dark Mode (`.dark`)

```css
.dark {
  --background: 20 14.3% 4.1%;       /* Near black */
  --foreground: 60 9.1% 97.8%;       /* Off-white */
  
  --card: 20 14.3% 4.1%;
  --card-foreground: 60 9.1% 97.8%;
  
  --popover: 20 14.3% 4.1%;
  --popover-foreground: 60 9.1% 97.8%;
  
  --primary: 60 9.1% 97.8%;
  --primary-foreground: 24 9.8% 10%;
  
  --secondary: 12 6.5% 15.1%;        /* Dark gray */
  --secondary-foreground: 60 9.1% 97.8%;
  
  --muted: 12 6.5% 15.1%;
  --muted-foreground: 24 5.4% 63.9%;
  
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 60 9.1% 97.8%;
  
  --destructive: 0 62.8% 30.6%;      /* Dark red */
  --destructive-foreground: 60 9.1% 97.8%;
  
  --border: 12 6.5% 15.1%;
  --input: 12 6.5% 15.1%;
  --ring: 24 5.7% 82.9%;
}
```

## Discord-Specific Colors (Hardcoded)

### Background Colors

| Element | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Navigation Sidebar | `#e3e5e8` | `#1e1f22` | Server list sidebar |
| Server Sidebar | `#f2f3f5` | `#2b2d31` | Channel list sidebar |
| Chat Input | N/A | `#313338` | Input background (text) |

**CSS Classes:**
```jsx
// Navigation sidebar
className="dark:bg-[#1e1f22] bg-[#e3e5e8]"

// Server/Channel sidebar
className="dark:bg-[#2b2d31] bg-[#f2f3f5]"
```

### Accent Colors

| Purpose | Color | Tailwind Class | Hex |
|---------|-------|----------------|-----|
| Primary action | Indigo | `bg-indigo-500` | `#6366f1` |
| Primary hover | Indigo light | `bg-indigo-400` | `#818cf8` |
| Primary dark | Indigo dark | `bg-indigo-600` | `#4f46e5` |
| Success | Emerald | `bg-emerald-500` | `#10b981` |
| Success dark | Emerald dark | `bg-emerald-600` | `#059669` |
| Danger/Admin | Rose | `bg-rose-500` | `#f43f5e` |

### Neutral Colors (Zinc palette)

| Shade | Hex | Usage |
|-------|-----|-------|
| `zinc-200` | `#e4e4e7` | Light borders |
| `zinc-300` | `#d4d4d8` | Light separators |
| `zinc-400` | `#a1a1aa` | Muted text |
| `zinc-500` | `#71717a` | Secondary text |
| `zinc-600` | `#52525b` | Dark muted text |
| `zinc-700` | `#3f3f46` | Dark separators |
| `zinc-800` | `#27272a` | Dark backgrounds |

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
             'Open Sans', 'Helvetica Neue', sans-serif;
```

### Font Sizes (Tailwind)

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Timestamps, badges |
| `text-sm` | 0.875rem (14px) | Secondary text, labels |
| `text-base` | 1rem (16px) | Body text, messages |
| `text-lg` | 1.125rem (18px) | Section headers |
| `text-xl` | 1.25rem (20px) | Channel names |
| `text-2xl` | 1.5rem (24px) | Modal titles |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-light` | 300 | Subtle labels |
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, usernames |
| `font-semibold` | 600 | Section titles |
| `font-bold` | 700 | Headlines, emphasis |

## Spacing

### Common Spacing Values

| Tailwind | Value | Usage |
|----------|-------|-------|
| `p-2` | 0.5rem (8px) | Small padding |
| `p-3` | 0.75rem (12px) | Medium padding |
| `p-4` | 1rem (16px) | Standard padding |
| `px-3` | 0.75rem (12px) | Horizontal padding |
| `py-2` | 0.5rem (8px) | Vertical padding |
| `gap-2` | 0.5rem (8px) | Small gaps |
| `gap-4` | 1rem (16px) | Standard gaps |
| `gap-y-4` | 1rem (16px) | Vertical gaps |
| `space-y-[2px]` | 2px | Tight list items |
| `mb-2` | 0.5rem (8px) | Section margins |
| `mb-4` | 1rem (16px) | Group margins |
| `mt-2` | 0.5rem (8px) | Top margins |

### Container Widths

| Element | Width | Notes |
|---------|-------|-------|
| Navigation sidebar | ~72px (w-[72px] or w-18) | Server icons |
| Server sidebar | ~240px (w-60) | Channel list |
| Chat area | flex-1 | Remaining space |

## Border Radius

```css
--radius: 0.5rem;  /* Base radius (8px) */
```

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-md` | 0.375rem (6px) | Buttons, inputs |
| `rounded-lg` | 0.5rem (8px) | Cards, modals |
| `rounded-full` | 9999px | Avatars, icons |

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals |

## Transitions

```css
/* Standard transition */
transition-colors  /* Color changes */
transition-all     /* All properties */

/* Duration */
duration-200       /* 200ms */
duration-300       /* 300ms */

/* Easing */
ease-out           /* Ease out */
ease-in-out        /* Ease in-out */
```

## Button Variants

From `components/ui/button.tsx`:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium 
   ring-offset-background transition-colors focus-visible:outline-none 
   focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
   disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        primary: "bg-indigo-500 text-white hover:bg-indigo-500/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    }
  }
);
```

## Icon Sizing

| Class | Size | Usage |
|-------|------|-------|
| `h-4 w-4` | 16px | Inline icons, channel icons |
| `h-5 w-5` | 20px | Action icons |
| `h-6 w-6` | 24px | Navigation icons |
| `h-8 w-8` | 32px | Server icons |
| `h-[48px] w-[48px]` | 48px | Large server icons |

## Z-Index Layers

| Class | Value | Usage |
|-------|-------|-------|
| `z-10` | 10 | Floating elements |
| `z-20` | 20 | Dropdowns |
| `z-30` | 30 | Modals |
| `z-50` | 50 | Critical overlays |

## Usage Examples

### Server Icon Container
```jsx
<div className="space-y-4 flex flex-col h-full items-center 
                text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
```

### Channel List Container
```jsx
<div className="flex flex-col h-full text-primary w-full 
                dark:bg-[#2b2d31] bg-[#f2f3f5]">
```

### Separator
```jsx
<Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
```

### Section Separator
```jsx
<Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
```

## Implementation Notes

1. **Use CSS variables** for theme switching (light/dark)
2. **Hardcode Discord colors** for signature backgrounds
3. **Prefer Tailwind classes** over inline styles
4. **Follow mobile-first** approach with responsive breakpoints
5. **Keep dark mode as primary** (Discord default)
