# v0.10.581 Implementation Notes

## Korean aquarium event probability

The Korean restaurant aquarium event now uses its own explicit probability:

```js
const GRAY_HOOD_AQUARIUM_EVENT_CHANCE = 1 / 15;
```

`1 / 15` means approximately one success per fifteen independent eligible checks (about 6.67%). It is not a guaranteed event on the fifteenth meal.

## Preserved eligibility and event flow

- The event is eligible only from game day 366 onward.
- It remains unavailable after the aquarium is unlocked or the event is completed.
- It remains a one-time event.
- The supplied introduction video still plays before the dialogue and reward sequence.
- Closing the game before completing the video does not mark the event as completed.

## Other meal events unchanged

The following remain `1 / 30`:

- Convenience store Cyclops event
- Kaitenzushi chef event
- Indian restaurant Ganesha tusk event
- Mystery Chinese meal event

## Non-meal probabilities unchanged

No non-meal event probability was changed in this version.
