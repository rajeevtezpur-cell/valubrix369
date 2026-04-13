# Premium Glassmorphic Map UI — Design Brief

## Purpose
High-end property intelligence map interface for ValuBrix. Users explore real estate markets through interactive heatmaps, infrastructure layers, and premium level selectors without map compression or layout shift.

## Theme
**Apple-style premium** — glassmorphism, soft shadows, smooth animations, informative yet clean. Deep navy foundation with gold accents. Floating UI elements (pills, buttons, legend) that layer above a full-screen map.

## Aesthetic
Luxury institutional. Refined clarity. Glassmorphic UI with backdrop blur effects and semi-transparent backgrounds. Gold glowing accents for active states. No border compression; map remains full screen at all times.

## Palette

| Token | OKLCH | Usage |
|-------|-------|-------|
| Navy 900 | `#071A2F` | Background base |
| Navy 800 | `#0B2A4A` | Secondary backgrounds |
| Gold | `#D8B56A` | Active states, accents, glows |
| Gold Dim | `#B78F3B` | Hover states, muted gold |
| Text Primary | `#F4F7FF` | Primary text |
| Text Secondary | `#B9C6D8` | Secondary/muted text |
| Glass BG | `rgba(255,255,255,0.08)` | Card/pill backgrounds with blur |
| Glass Border | `rgba(255,255,255,0.18)` | Subtle borders on glass |

## Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display | Playfair Display | 600–700 | 28–48px |
| Body | Plus Jakarta Sans | 400–500 | 14–16px |
| Label | Plus Jakarta Sans | 500–600 | 12–13px |
| Mono | JetBrains Mono | 400 | 12–14px |

## Zones

| Zone | Treatment |
|------|-----------|
| **Map** | Full screen, CartoDB Voyager tiles, dark background |
| **Top-Left (Level Selector)** | Floating glass pills, 4 options (Smart/Premium/Growth/Investment), active glow |
| **Top-Right (Infrastructure Toggles)** | Floating circular glass buttons (10 icons), 2×5 grid, active state gold |
| **Bottom-Left (Legend)** | Floating glass card, active layer indicators with colored dots |
| **Bottom-Right (Tooltip)** | Distance & impact info on hover, glass popup |
| **Header/Nav** | Minimal, blends with dark background; ValuBrix logo visible |

## Components

- **Level Pill**: `level-pill` class. Semi-transparent glass, rounded border, smooth hover lift, active glow animation.
- **Infrastructure Toggle**: `infra-toggle` class. Circular glass button, icon centered, hover lift, active gold glow with inset shadow.
- **Legend Card**: `legend-card` class. Glass card with legend items (dot + label pairs), positioned bottom-left.
- **Map Popup**: Glassmorphic dark popup for additional info on pin click.

## Motion

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Pill Enter | Fade + scale up + slide down | 0.4s ease-out |
| Pill Active | Glow pulse (border + shadow) | 2s infinite |
| Button Hover | Lift + fade background | 0.3s ease-out |
| Button Active | Pulse scale + gold glow | 2s infinite |
| Legend Entry | Fade + slide in | 0.4s ease-out |

## Constraints

- **Map Never Shrinks**: Floating UI never compresses the map or causes layout shift.
- **No Flickering**: Layer toggles smooth fade; no re-renders or blinks.
- **High Contrast**: All text on glass backgrounds meets AA+ contrast standards.
- **Mobile-First**: Floating panels reposition on small screens; map remains primary.
- **No Hardcoding**: Infrastructure layer pins use real coordinates; distances calculated via haversine.
- **Performance**: Lazy load markers; cluster on zoom out; smooth 60fps transitions.

## Signature Detail

**Pill Glow Animation** — Selected level pill emits a gentle gold glow that pulses every 2 seconds, signaling active selection without overwhelming the map. Applies to active infrastructure toggles as well for visual cohesion.

## Branding

- **Logo**: ValuBrix wordmark in top-left or header; white or gold, depending on context.
- **Colors**: Deep navy + gold only. No secondary accent colors.
- **Tone**: Institutional, trustworthy, premium. No playful or casual language.
