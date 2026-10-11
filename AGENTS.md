# XCTrack Screen Designer

Read `docs/architecture.md`, `docs/development-plan.md` and relevant research before changing native compatibility behavior.

- React/TypeScript app lives in `web/src`; dev server is loopback-only. Keep file serving restricted to the app and dependencies.
- Preserve original XCFG, APK, vendor checkout and native screenshots. Private exports belong in `.local`, never browser assets or committed fixtures.
- Target first profile: XCTrack 0.9.12.6 / 91260. Distinguish sample-observed, APK-derived and runtime-verified facts.
- Native grid depends on DPI; `_bg` is transparency. Preserve unknown fields, widget order and independent orientations. Simulation must never change exported settings.
- Use the configured Playwright MCP for interactive browser work. The project Playwright test runner is for reproducible automated tests.
- All Android commands must name an `emulator-*` serial. No physical-device commands, AVD wipe or package-data reset as routine setup.
- Run `npm run check` for web/tool changes and `npm run test:e2e` after build when UI changes. Keep verification proportional. Use `npm run doctor` to diagnose environment dependencies.
- Pixel comparisons require matching native resolution and controlled data; do not silently rescale references or claim pixel parity from shell tests.
- No cloud deployment, tile service, analytics, account connection or resource redistribution is part of local development by default.
