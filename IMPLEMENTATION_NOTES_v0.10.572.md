# v0.10.572 implementation notes

## Meal-screen header clearance

On portrait phones, the meal selection panel now receives a dedicated top margin after the dynamically measured header offset. This keeps the `現在の空腹度` summary below the operation bar even when Android display scaling increases the actual header height.

## Hunger barometer removal

The seven visual hunger pips were removed from the meal selection markup. A CSS fallback also hides them if an older cached render remains momentarily visible. The numeric hunger value remains centered.

## Unchanged behavior

- Meal prices and recovery values
- Hunger calculations and maximum value
- Header status and operation-bar layout
- Landscape layout
- Save data
