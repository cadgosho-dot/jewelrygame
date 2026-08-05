# v0.10.570 implementation notes

## Portrait main-menu header

The portrait main-menu header now uses explicit in-panel row positioning so older responsive grid rules cannot hide the second row.

- First row left: date, weekday, game day, weather
- First row right: money
- Second row left: current time
- Second row center: player name
- Second row right: hunger

The status elements are forced visible with stable height, clipping, opacity, and positioning rules. The transparent panel background and border remain unchanged.

## Unchanged

- Landscape header layout
- Money size and money-change foreground animation
- Time warning colors
- Date-group compact spacing
- Game logic, save data, and balance
