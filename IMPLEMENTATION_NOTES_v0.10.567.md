# v0.10.567 Implementation Notes

## Portrait top bar visibility

The portrait status area no longer uses `display: contents`. Some Android WebView builds did not reliably paint the second row when the nested wrappers were flattened.

Top bar 1 now keeps the existing wrapper elements as normal layout boxes:

- Row 1: date, weekday, game day, weather
- Row 2: time, player name, hunger
- Money: aligned to the right side of row 2

Visibility, clipping, overflow, and line placement are explicitly reset for portrait mode.

## Transparent bar panels

The black fill and blur are removed from top bar 1 and top bar 2 in both portrait and landscape. The decorative border remains, allowing the game background to remain visible.

## Preserved behavior

- Landscape information order and left-aligned hunger are unchanged.
- Landscape money remains enlarged at the right edge.
- Time warning colors remain enabled.
- Money-change animation remains in the foreground.
- No changes to game time, hunger, money calculations, balance, actions, or save data.
