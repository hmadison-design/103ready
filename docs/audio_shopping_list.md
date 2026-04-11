# Audio Files Shopping List

Both scenarios share an audio framework with `$audioEnabled` guards — they work perfectly without audio, but sounds enhance the experience. All files should be short MP3 clips (5–30 seconds, loopable where noted).

## Required Files (11 unique across both scenarios)

| File | Used In | Description | Freesound Search |
|------|---------|-------------|------------------|
| engine-smooth.mp3 | Both | Steady Cessna/Lycoming piston engine cruise (loopable) | [Search](https://freesound.org/search/?q=cessna+engine+cruise) |
| engine-rough.mp3 | Both | Engine running rough, slight vibration/miss | [Search](https://freesound.org/search/?q=engine+rough+running+aircraft) |
| engine-cough.mp3 | Both | Engine cough/sputter, brief | [Search](https://freesound.org/search/?q=engine+sputter+cough) |
| engine-fail.mp3 | Both | Engine failure, power loss to silence | [Search](https://freesound.org/search/?q=engine+failure+stop+aircraft) |
| radio-squelch.mp3 | Both | Radio squelch/click, ATC-style | [Search](https://freesound.org/search/?q=radio+squelch+aviation) |
| wind-quiet.mp3 | Both | Light wind/air noise, cockpit ambient | [Search](https://freesound.org/search/?q=cockpit+wind+noise+light) |
| wind-turbulence.mp3 | The Wall | Turbulence — buffeting, loud wind, rattling | [Search](https://freesound.org/search/?q=turbulence+wind+buffeting) |
| touchdown.mp3 | Both | Tire chirp on runway, brief landing sound | [Search](https://freesound.org/search/?q=airplane+landing+tire+chirp) |
| atc-ambience.mp3 | Both | Background ATC radio chatter, ambient | [Search](https://freesound.org/search/?q=atc+radio+chatter+aviation) |
| rain-windshield.mp3 | The Wall | Rain hitting windshield/canopy | [Search](https://freesound.org/search/?q=rain+windshield+cockpit) |
| field-ambience.mp3 | Cylinder Three | Rural airfield outdoor ambience, birds, wind | [Search](https://freesound.org/search/?q=airfield+outdoor+ambience+rural) |

## Licensing Notes

Use sounds with Creative Commons 0 (CC0) or Attribution (CC-BY) licenses. If CC-BY, credit the author in the scenario's source code comments.

## File Placement

Copy downloaded MP3s to both scenario audio directories:
- `scenarios/cylinder-three/audio/`
- `scenarios/the-wall/audio/`

Each scenario only loads the files it references, so unused files in a directory won't cause problems.

## Alternative: ElevenLabs for ATC voices

Harvey mentioned exploring ElevenLabs for ATC voices with a walkie-talkie filter effect. This would replace `atc-ambience.mp3` and potentially `radio-squelch.mp3` with custom generated audio.
