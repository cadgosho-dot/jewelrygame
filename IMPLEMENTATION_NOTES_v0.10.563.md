# v0.10.563 Implementation Notes

## Header recovery

This release restores the two-part header layout on phone-sized screens.

- Top bar 1 contains date, weekday, game day, weather, current time, player name, hunger, and money.
- Top bar 2 contains back, screen title, help, and main-screen controls.
- The direct children of both bars are explicitly reset to normal positioning so legacy header CSS cannot move the money display into the operation bar.
- Visibility, opacity, grid areas, dimensions, and alignment are explicitly defined for the new wrapper structure.

## Landscape money visibility

The landscape money amount now uses a larger responsive size: 20 to 24 CSS pixels on phone-class landscape layouts. The money-change animation keeps its existing foreground layer and remains unclipped.

## Update-path compatibility

The update ZIP includes the complete current `styles.css`. This repairs repositories where v0.10.562 was applied without first copying the v0.10.561 stylesheet.

## Compatibility

- No save-data schema changes.
- No changes to game time, money calculations, actions, or balance.
- Existing saves remain compatible.
