# v0.10.568 Implementation Notes

## Header structure replacement

The status header no longer uses the nested legacy `status-left` / `status-top-line` / duplicated time-slot structure. It now renders three direct elements inside the status frame:

- `jwj-status-primary`: date, weekday, game day, and weather
- `jwj-status-secondary`: current time, player name, and hunger
- `jwj-money-area`: current money and money-change animation

This isolates the new layout from the accumulated legacy portrait rules that previously positioned or clipped the old elements.

## Portrait layout

- Row 1: status-primary at left and money at right
- Row 2: time at left, player name centered, hunger at right
- Main-screen header height equals the complete two-row status frame
- Non-main screens add the separate operation frame below it

## Landscape layout

Landscape remains one row: primary status, time/name/hunger group, flexible space, and money at the right edge. Existing money visibility and hunger alignment are retained.

## Visual treatment

Both status and operation frames retain their border but use a transparent background with no black panel fill or blur. Time warning colors and the foreground money-change animation are retained.

## Unchanged behavior

No changes were made to save data, game time, hunger calculations, money calculations, actions, balance, or event probabilities.
