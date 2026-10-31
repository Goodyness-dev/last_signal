# Asset register

All battlefield visuals are original procedural source. No purchased assets, generated concept images, commercial game content or recorded audio are included.

Revision: articulated figures and the eye level weapon now live in apps/web/src/soldier.ts. Shells, sparks, dust and splashes are original geometry in combat-fx.ts. field-camera.ts owns the new views. scene.ts adds original concrete weathering, cracks, doors, conduits and bounded smoke. Audio noise and oscillators in main.ts synthesize rain and gunshots. These remain temporary original procedural assets under the same project source ownership as the initial assets. No external models or sounds were introduced.

| Asset | Path | Source and creator | License | Status and replacement |
| --- | --- | --- | --- | --- |
| Compound, ground texture, puddles, skyline, towers, barriers | apps/web/src/scene.ts | Original source authored for LAST SIGNAL | Project source. Ownership follows project agreement | Temporary procedural art. Improve detail after gameplay review |
| Three soldiers per squad | apps/web/src/scene.ts | Original procedural geometry | Project source | Temporary soldiers. No external rig |
| Rain, flame and support pulse | apps/web/src/scene.ts | Original procedural geometry and material | Project source | Initial effects. No downloaded particles |
| Command tones | apps/web/src/main.ts | Original Web Audio synthesis | Project source | Temporary audio. No recordings |
| HUD mark and symbols | apps/web/src/main.ts and style.css | Original layout and Unicode glyphs | Project source; glyph appearance depends on font | No commercial logos |
| Barlow | apps/web/public/fonts/Barlow-Regular.ttf | Google Fonts, Jeremy Tribby; https://github.com/google/fonts/tree/main/ofl/barlow | SIL Open Font License 1.1, assets/licenses/barlow-OFL.txt | Bundled, unmodified |
| Barlow Condensed | apps/web/public/fonts/BarlowCondensed-SemiBold.ttf | Google Fonts, Jeremy Tribby; https://github.com/google/fonts/tree/main/ofl/barlowcondensed | SIL Open Font License 1.1, assets/licenses/barlowcondensed-OFL.txt | Bundled, unmodified |
| IBM Plex Mono | apps/web/public/fonts/IBMPlexMono-Regular.ttf | IBM; https://github.com/google/fonts/tree/main/ofl/ibmplexmono | SIL Open Font License 1.1, assets/licenses/ibmplexmono-OFL.txt | Bundled, unmodified |

License texts preserve source notices. File sizes can be inspected in the local public/fonts folder. Procedural geometry has no downloaded model size. Polygon profiling and audio mix measurements are pending. Runtime evidence under docs/evidence comes from this application and is not proof of multiplayer or chain integration.
