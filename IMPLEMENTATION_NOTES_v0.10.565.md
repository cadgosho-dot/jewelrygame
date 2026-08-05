# v0.10.565 Implementation Notes

## Portrait top bar 1

The portrait-only header override now gives top bar 1 a responsive height of 112 to 124 CSS pixels. The two status rows use explicit minimum row sizes, centered vertical alignment, and visible overflow so the enlarged time row cannot be clipped by legacy header rules.

The Android top safe area is guarded with `max(12px, env(safe-area-inset-top))`. The main screen and two-bar screen content offsets are recalculated from the revised portrait header height.

## Preserved behavior

- Landscape header layout is unchanged.
- Landscape hunger remains left-aligned after the player name.
- Landscape money size remains enlarged at the right edge.
- Time warning colors and the foreground money-change animation remain enabled.
- No game-time, hunger, money, balance, action, or save-data changes.
