# v0.10.562 Implementation Notes

## Okachimachi Panda Plaza music event audio

A dedicated original loop sound was added for the Panda Plaza music event:

- `assets/audio/sfx-panda-music-event.ogg`
- 8 seconds, stereo, Ogg Vorbis
- original synthesized live-band sound with drums, distorted guitar-like chords, bass, cymbal, and light crowd ambience

## Playback lifecycle

The event sound starts when the event is triggered or resumed. It continues through both dialogue stages and stops when the player returns to the normal Okachimachi screen.

The sound is also protected against lifecycle leaks:

- paused when the page becomes hidden
- resumed only when the music event is still active and visible
- stopped and reset when any other screen is selected
- stopped if an event-recovery path leaves the event screen

## Settings integration

The custom event sound follows the existing sound-effect settings:

- sound-effect volume
- sound-effect mute
- external-audio priority

The event sound uses the sound-effect volume at 72 percent of the configured level so it remains audible without overwhelming the normal game mix.

## Compatibility

- No save-data schema changes.
- No changes to the 1-in-90 daily event chance.
- No changes to event dialogue, band-image selection, time passage, rewards, or other Okachimachi events.
- Existing saves remain compatible.
