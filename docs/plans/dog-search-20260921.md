# Dog search implementation plan

Spec: ../specs/dog-search-approved-20260921.txt (approved handover).
Base: main 0cea3fc18d97f405384d5a3a1dd16c3f5c98beb9, v0.10.961.

- [ ] State and data: js/events/dog-search-data.js and dog-search-state.js. Preserve exact dialogue and formal image references. Test 20% intro after 30/180 days, 50% per uncompleted place, five unique completions, no completion on cancellation, save round trip.
- [ ] Runtime: js/events/dog-search-event.js, isolated dog-search-event.css. Use final approved v5 and intro v6 layout; connect existing entry points only. Block other random events on a successful dog entry; a failed roll continues existing logic.
- [ ] Final sequence: blank panda scene 2000ms, dog sound, full blackout 2000ms, boy/butler/reward/boy. Extend grantMetalIgnoreCapacity only with optional atomic event guard; one inventory and flag save. Preserve existing helper behavior.
- [ ] Validate existing meal/mining/helper behavior plus new state and DOM flows; synchronize version using repository script, save changes in the dedicated GitHub branch and one PR.

Review focus: reloaded final reward; rapid taps; stale timers after interruption; overlapping observer events; unchanged global UI and source assets.

Execution: inline, as the approved handover requests; no additional design approval needed.
