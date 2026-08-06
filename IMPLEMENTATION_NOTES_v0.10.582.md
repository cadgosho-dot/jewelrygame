# v0.10.582 Implementation Notes

## Passerby Quiz King introduction video

The Passerby Quiz King event now begins with the supplied video before any dialogue or question is shown.

Flow:

1. The existing visit-count condition triggers the Quiz King event.
2. The introduction video is displayed first.
3. The video must reach its `ended` event.
4. The existing `intro1` dialogue begins automatically.
5. The existing four-choice quiz, answer judgement and reward flow continue unchanged.

## Display behavior

- The video uses a fixed full-viewport layer in portrait and landscape.
- `object-fit: contain` and centered positioning preserve the complete frame without cropping or distortion.
- The source is H.264 video with AAC audio. Rotation metadata was baked into an upright 720×870 frame for consistent browser rendering, and fast-start metadata was added.
- If unmuted autoplay is blocked, a visible replay button is shown.
- A load error does not skip the video; the same source can be retried.

## Audio behavior

The Okachimachi background music continues during the introduction video. The implementation deliberately does not call `suspendAudio()` for this video. The video's own audio remains enabled. The existing Quiz King introduction sound effect starts only after the video ends and the dialogue appears.

## Unchanged systems

- Quiz event appearance timing remains 26 to 34 counted Okachimachi visits after the previous occurrence.
- One hour is still consumed when the event begins.
- Question selection, correct-answer judgement and rough-gem reward are unchanged.
- All meal and non-meal event probabilities are unchanged.
