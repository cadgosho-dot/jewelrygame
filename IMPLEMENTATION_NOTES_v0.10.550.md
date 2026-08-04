# JEWELRYxJEWELRY v0.10.550 Implementation Notes

## Added event
- Location: Okachimachi entry
- Chance: 1/90
- Lottery: once per game day
- Repeat: available again on later game days
- Background: Panda Plaza, with portrait-specific background when applicable
- Image: one of three band images selected randomly and saved for stable resume

## Dialogue
1. 「あ、、今日はパンダ広場でイベントやってるんだな、、、」
2. 「こういうの嬉しい、、」
3. Return to normal Okachimachi screen

## Assets
- assets/images/events/panda-music-band-alien.png
- assets/images/events/panda-music-band-cats.png
- assets/images/events/panda-music-band-horror.png

## Compatibility
- Existing save data is retained.
- The event state is created automatically for old saves.
- Active event state can resume after reload.
- Emergency event recovery returns safely to Okachimachi.
