# v0.10.573 Implementation Notes

## Transparent framed UI

- Top bar 1 and top bar 2 now keep their borders while rendering the inside fully transparent in portrait and landscape.
- Background fills, gradients, blur, filters, shadows, and decorative pseudo-elements are disabled for the two top bars.
- The main-screen bottom menu container and every menu button now keep their borders, icons, and labels while rendering the inside fully transparent.
- Hover, focus, and pressed states no longer restore a dark fill.

## Unchanged

- Header layout, date/time/name/hunger/money positions and sizes are unchanged.
- Bottom-menu button positions, icons, labels, actions, and disabled state are unchanged.
- Game balance, save data, and controls are unchanged.
