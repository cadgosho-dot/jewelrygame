# v0.10.566 Implementation Notes

## Portrait top bar 1

The portrait header no longer depends on nested flex containers for its two information rows. Top bar 1 is an explicit two-row grid:

- Row 1: date, weekday, game day, weather
- Row 2: time, player name, hunger, money

The legacy wrapper elements use `display: contents` in portrait mode so the two information rows become direct grid items. Explicit visibility, display, clipping, and overflow rules prevent the second row from disappearing under older accumulated header CSS.

## Preserved behavior

- Landscape header layout is unchanged.
- Landscape hunger remains left-aligned after the player name.
- Landscape money remains enlarged at the right edge.
- Time warning colors and foreground money-change animation remain enabled.
- No changes to game-time, hunger, money, balance, actions, or save data.
