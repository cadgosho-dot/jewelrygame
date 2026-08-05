# v0.10.564 Implementation Notes

## Portrait top-bar clipping

- The portrait information bar height is increased to fit the two status rows and the enlarged current-time text without clipping.
- The primary and secondary status rows are reset to normal static layout so older header rules cannot move the second row outside the frame.
- Row height, line height, vertical centering, and overflow are explicitly controlled.
- Two-bar screen content offsets continue to use the actual bar-one and bar-two dimensions.

## Landscape hunger alignment

- The landscape primary and secondary status groups remain left aligned as one continuous information group.
- The player-name field no longer expands across all remaining space.
- Hunger is placed immediately after the player name and remains left aligned.
- The enlarged landscape money amount stays at the right edge.

## Compatibility

- No save-data schema changes.
- No changes to time, hunger, money calculations, actions, or game balance.
- Existing saves remain compatible.
