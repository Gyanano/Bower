# Bower Design System

> Editorial-archive aesthetic for a local-first design asset management tool.

---

## Design Philosophy

Bower's visual language is **minimal, professional, and typographically driven**. The interface emphasises whitespace, serif headlines, and a restrained navy-blue palette — an editorial feel that lets the user's uploaded imagery remain the visual focus.

---

## 1. Color Palette

### Primary

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#002b6b` | Buttons, active states, links |
| `--color-primary-foreground` | `#ffffff` | Text on primary backgrounds |
| `--color-primary-light` | `#002b6b0f` | Hover tints, light primary fill (6 % opacity) |
| `--color-accent` | `#1a428a` | Secondary interactive elements |
| `--color-accent-foreground` | `#ffffff` | Text on accent |

### Surface & Background

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#f9f9f7` | Page background (warm off-white) |
| `--color-foreground` | `#1a1c1b` | Default body text |
| `--color-card` | `#ffffff` | Card backgrounds |
| `--color-card-foreground` | `#1a1c1b` | Card body text |
| `--color-surface` | `#f4f4f2` | Slightly elevated surfaces |
| `--color-surface-high` | `#e8e8e6` | Higher-elevation surface |

### Neutral / Muted

| Token | Value | Usage |
|---|---|---|
| `--color-muted` | `#eeeeec` | Subtle backgrounds, tags |
| `--color-muted-foreground` | `#747782` | Secondary / de-emphasised text |
| `--color-outline` | `#747782` | Outline strokes |
| `--color-outline-variant` | `#c4c6d2` | Lighter outlines |

### Border & Input

| Token | Value | Usage |
|---|---|---|
| `--color-border` | `#002b6b1a` | Borders (primary-tinted, 10 % opacity) |
| `--color-input` | `#e2e3e1` | Input field borders |
| `--color-ring` | `#002b6b33` | Focus rings (20 % opacity) |

### Semantic

| Token | Value | Usage |
|---|---|---|
| `--color-destructive` | `#ba1a1a` | Error / delete actions |
| `--color-destructive-foreground` | `#ffffff` | Text on destructive |
| `--color-success` | `#0a9f63` | Success indicators |

---

## 2. Typography

### Font Stack

| Token | Family | Fallback | Role |
|---|---|---|---|
| `--font-headline` | **Newsreader** | Georgia, serif | Page titles, card headers, hero copy |
| `--font-label` | **Space Grotesk** | Arial, sans-serif | Nav labels, badges, small uppercase text |
| `--font-body` | **Manrope** | Helvetica Neue, sans-serif | Body paragraphs, form content |

All three families are loaded from Google Fonts with a wide weight range (200 – 800). Newsreader also loads italic styles.

### Type Scale & Patterns

| Context | Class Pattern | Notes |
|---|---|---|
| Page title (h1) | `font-headline text-4xl uppercase tracking-[0.15em]` | Serif, wide letter-spacing |
| Section heading (h2) | `font-headline text-2xl` | |
| Card title (h3) | `font-headline text-sm lg:text-base uppercase tracking-[0.1em]` | |
| Navigation item | `font-label text-[10px] uppercase tracking-[0.4em]` | Very wide tracking |
| Form label | `font-label text-[10px] font-semibold uppercase tracking-[0.3em]` | |
| Tag / meta | `font-label text-[9px] uppercase tracking-[0.3em]` | |
| Body text | `font-body text-sm` or `text-base` | |

Font smoothing: `-webkit-font-smoothing: antialiased` / `-moz-osx-font-smoothing: grayscale` applied globally.

---

## 3. Spacing & Radius

### Border Radius Tokens

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `0.25rem` (4 px) | Small chips, inline elements |
| `--radius-md` | `0.5rem` (8 px) | Buttons, inputs |
| `--radius-lg` | `0.75rem` (12 px) | Cards |
| `--radius-xl` | `1.5rem` (24 px) | Modals, large panels |
| `--radius-full` | `9999px` | Pills, avatars |

### Common Spacing Patterns

- Button padding: `px-3 py-1.5`
- Card inner padding: `p-6 lg:p-8`
- Section gap: `gap-8` or `gap-12`
- Standard margin: `mt-4` / `mt-6`

---

## 4. Elevation & Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 10px 24px rgba(0,0,0,0.06)` | Default card shadow |
| `--shadow-elevated` | `0 25px 60px rgba(0,0,0,0.12)` | Modals, popovers |
| `--shadow-hover` | `0 40px 60px -15px rgba(0,43,107,0.1)` | Card hover (primary-tinted) |

---

## 5. Animation

### Keyframes

| Name | Effect | Duration / Easing |
|---|---|---|
| `fade-in` | Opacity 0 → 1 | 0.4 s ease-out |
| `slide-up` | Opacity 0 + translateY(12 px) → visible | 0.5 s cubic-bezier(0.16, 1, 0.3, 1) |
| `shimmer` | Background position sweep | 1.2 s linear infinite |
| `spin` | 360 deg rotation | 1 s linear infinite |

### Interaction Transitions

- Card image hover: `transition-transform duration-700` with `group-hover:scale-105`
- Colour transitions: `transition-colors`
- General smooth transitions: `transition-all duration-500`
- Radix UI enter/exit: `data-[state=open]:animate-in` / `data-[state=closed]:animate-out` with zoom-in-95 / zoom-out-95

---

## 6. Layout System

### Fixed Chrome

| Element | Position | Dimensions |
|---|---|---|
| TopNav | `fixed top-0 w-full z-50` | Height ~60 px (mobile) / ~68 px (desktop) |
| SideNav | `fixed left-0 top-0 h-full` | Width 72 px, visible at `lg:` breakpoint |
| MobileTabBar | Fixed bottom | Visible below `lg:` breakpoint |

Main content area: `pt-[60px] lg:pt-[68px] lg:pl-[72px] pb-24 lg:pb-0`

### Responsive Breakpoints

| Breakpoint | Threshold | Key Changes |
|---|---|---|
| Default | < 768 px | Single-column, bottom tab bar, stacked layout |
| `md:` | 768 px | 2-column grids begin |
| `lg:` | 1024 px | Side nav appears, tab bar hidden, wider grids |

### Grid Patterns

- Masonry layout: CSS columns with `break-inside-avoid`
- Inspiration cards: `aspect-[4/5]` image containers
- Board cards: `aspect-square`

---

## 7. Component Library

### Primitives (`components/ui/`)

Built on **Radix UI** primitives, styled with **Tailwind CSS v4** and **class-variance-authority** (CVA).

| Component | Variants |
|---|---|
| Button | default, destructive, outline, secondary, ghost, link × sizes xs/sm/default/lg/icon |
| Badge | default, secondary, destructive, outline, ghost, link |
| Input | Standard with focus-ring pattern |
| Dialog | Overlay + content with zoom animations |
| Tabs | Default and line style |
| Select | Radix select with trigger/content/item |
| DropdownMenu | Radix dropdown with items, separators |
| Tooltip | 300 ms open delay |
| Separator | Horizontal / vertical divider |
| ScrollArea | Custom scrollbar styling |

### Feature Components

| Component | Description |
|---|---|
| `page-hero.tsx` | Reusable hero section with title + subtitle slots |
| `inspiration-card.tsx` | Masonry card with image zoom on hover |
| `board-card.tsx` | Square collection thumbnail |
| `filter-bar.tsx` | Horizontal tag/filter strip |
| `upload-form.tsx` | File upload with drag-and-drop |
| `login-panel.tsx` | Authentication UI |

### Utility

- `cn()` — merges Tailwind classes via `clsx` + `tailwind-merge` (`lib/utils.ts`)
- `.hide-scrollbar` — hides scrollbars while preserving scroll
- `.text-balance` — `text-wrap: balance`

---

## 8. Dark Mode

Components include `dark:` variant classes (e.g. `dark:bg-input/30`, `dark:border-input`), but the current colour palette is **light-mode only**. A dark palette has not yet been defined in the `@theme` block. The architecture is ready for dark mode when tokens are added.

---

## 9. Key Dependencies

| Package | Version | Role |
|---|---|---|
| Tailwind CSS | 4.2.2 | Utility-first styling |
| @tailwindcss/postcss | 4.2.2 | PostCSS integration |
| class-variance-authority | 0.7.1 | Component variant management |
| clsx | 2.1.1 | Conditional class names |
| tailwind-merge | 3.5.0 | Intelligent class deduplication |
| @radix-ui/* | 1.4.x | Accessible unstyled primitives |

---

## 10. Configuration Files

| File | Purpose |
|---|---|
| `app/globals.css` | All design tokens (`@theme` block), keyframes, base styles |
| `app/layout.tsx` | Google Fonts imports (Newsreader, Space Grotesk, Manrope) |
| `components/ui/` | CVA-based primitive components |
| `lib/utils.ts` | `cn()` helper |

No separate `tailwind.config.js` — Tailwind v4 `@theme` inline config is used.
