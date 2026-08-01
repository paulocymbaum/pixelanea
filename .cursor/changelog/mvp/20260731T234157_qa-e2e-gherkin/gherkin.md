# Gherkin E2E — Complete MVP

## Goal

Validate every MVP ship-gate journey end-to-end: blank or import entry, draw and palette edit, undo with debounced sync, 8-frame animation, save/open `.pixelanea` round-trip, PNG/GIF/spritesheet export, theme and shortcuts — through the real Vite frontend and C++ API on localhost.

## Source matrix

| Matrix | Path | Backlog | Cases |
|--------|------|---------|-------|
| MVP business rules | `.cursor/skill-outputs/backlog/mvp/20260731T225800_test-matrix-unit/test_matrix_unit.md` | MVP scope | 42 |
| Paint paths | `.cursor/skill-outputs/qa/paint/20260731T223100_test-matrix-unit/test_matrix_unit.md` | QA-001 | 61 |
| Import paths | `.cursor/skill-outputs/qa/import/20260731T223100_test-matrix-unit/test_matrix_unit.md` | QA-002 | 20 |
| Animation paths | `.cursor/skill-outputs/qa/animation/20260731T223100_test-matrix-unit/test_matrix_unit.md` | QA-003 | 23 |
| Save/open round-trip | `.cursor/skill-outputs/qa/project-io/20260731T223100_test-matrix-unit/test_matrix_unit.md` | QA-004 | 24 |

- **Feature / layer:** `mvp` (aggregated QA matrices)
- **Last matrix pass:** 2026-07-31 (QA-001 automated vitest; MVP backlog automated; QA-002–004 not run)

## Prerequisites

- `./scripts/dev.sh` (API `127.0.0.1:8787`, Vite `http://127.0.0.1:5173` with proxy)
- Playwright browsers: `pnpm exec playwright install` (when `e2e/` package exists)
- Fixtures: sample PNG/JPEG, 3840×2160 image, truncated/corrupt `.pixelanea`, tampered checksum bundle, path-traversal ZIP (from backend ctest fixtures)
- Blank 32×32 project, 8-frame 32×32 with art on frame 1, multi-color painted canvas

## Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Critical golden path |
| `@race` | Timing / concurrency |
| `@routing` | Navigation between app routes |
| `@edge` | Boundary and guard behavior |
| `@error` | API failure and recovery |
| `@offline` | Network blocked |
| `@slow` | >5s or intentional delay |
| `@flaky` | Needs throttling or route mock to stabilize |

## Matrix coverage

### MVP backlog (`MVP:*`)

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| MVP:HP-001 | Feature: New blank project / Scenario: Resolution presets | yes | |
| MVP:HP-002 | Feature: Casey import path / Scenario: Photo import under 5 minutes | yes | `@slow` optional |
| MVP:HP-003 | Feature: Paint golden path / Scenario: Click-drag stroke persists | yes | overlaps QA-001 |
| MVP:HP-004 | Feature: Eraser / Scenario: Fix mistakes clears pixels | yes | |
| MVP:HP-005 | Feature: Eyedropper / Scenario: Sample then auto-switch to paint | yes | |
| MVP:HP-006 | Feature: Palette editing / Scenario: Add edit remove and presets | yes | |
| MVP:HP-007 | Feature: Palette lock / Scenario: Off-palette blocked | yes | |
| MVP:HP-008 | Feature: Undo redo / Scenario: Keyboard undo and redo | yes | |
| MVP:HP-009 | Feature: Frame sync / Scenario: Rapid paint then re-fetch | yes | API GET verify |
| MVP:HP-010 | Feature: Duplicate frames / Scenario: Expand to 8 frames | yes | |
| MVP:HP-011 | Feature: Animation playback / Scenario: Play FPS and loop | yes | |
| MVP:HP-012 | Feature: Animation playback / Scenario: Read-only while playing | yes | |
| MVP:HP-013 | Feature: Riley walk cycle / Scenario: Save and round-trip | yes | |
| MVP:HP-014 | Feature: Export / Scenario: PNG current frame | yes | |
| MVP:HP-015 | Feature: Save As / Scenario: Asset type Character | yes | |
| MVP:HP-016 | Feature: Casey import path / Scenario: Remove background default on | yes | |
| MVP:HP-017 | Feature: Theme and shortcuts / Scenario: Toggle and persist theme | yes | |
| MVP:HP-018 | Feature: Theme and shortcuts / Scenario: Shortcuts overlay | yes | |
| MVP:HP-019 | Feature: Offline operation / Scenario: Full flow without network | yes | `@offline` |
| MVP:HP-020 | — | unit-only | `ss` port bind — infra, not browser |
| MVP:HP-021 | Feature: Bundle integrity / Scenario: Checksum mismatch rejected | yes | |
| MVP:HP-022 | — | unit-only | API JSON shape — covered in vitest/ctest |
| MVP:RACE-001 | Feature: Paint races / Scenario: Rapid tool switch while dragging | yes | |
| MVP:RACE-002 | Feature: Save races / Scenario: Save during continued edits | yes | |
| MVP:RACE-003 | Feature: Duplicate frames / Scenario: Rapid duplicate clicks | yes | |
| MVP:RACE-004 | Feature: Palette lock / Scenario: Toggle lock mid-drag | yes | |
| MVP:EDGE-001 | Feature: Palette edge / Scenario: Single-color palette paint and erase | yes | |
| MVP:EDGE-002 | — | unit-only | Undo cap 500 — vitest `UNDO_STACK_CAP` |
| MVP:EDGE-003 | Feature: Zoom extremes / Scenario Outline: 25% and 3200% | yes | |
| MVP:EDGE-004 | Feature: Animation playback / Scenario Outline: FPS 1 and 24 | yes | |
| MVP:EDGE-005 | Feature: Frame strip / Scenario: First and last frame navigation | yes | |
| MVP:EDGE-006 | Feature: Bundle integrity / Scenario: Extra ZIP entries ignored | deferred | needs fixture injection helper |
| MVP:EDGE-007 | Feature: Casey import path / Scenario: 4K import under 2 seconds | yes | `@slow` |
| MVP:EDGE-008 | Feature: Save open / Scenario: Empty project round-trip | yes | |
| MVP:ERR-001 | — | unit-only | Invalid frame index — API contract test |
| MVP:ERR-002 | Feature: Import errors / Scenario: Non-image file rejected | yes | |
| MVP:ERR-003 | Feature: Save errors / Scenario: Read-only directory | yes | CI fixture dir |
| MVP:ERR-004 | Feature: Bundle integrity / Scenario: Corrupt checksum | yes | |
| MVP:ERR-005 | Feature: API errors / Scenario: Backend down during sync | yes | `@error` |
| MVP:ERR-006 | — | unit-only | Invalid hex — color picker UI, no free text |
| MVP:ERR-007 | Feature: Bundle integrity / Scenario: Path traversal rejected | yes | malicious fixture |
| MVP:ERR-008 | Feature: Animation playback / Scenario: FPS clamp 0 and 25 | yes | |

### QA-001 paint (`QA-001:*`)

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| QA-001:HP-001 | Feature: Paint golden path / Scenario: Click-drag stroke | yes | |
| QA-001:HP-002 | Feature: Eraser / Scenario: Fix mistakes | yes | |
| QA-001:HP-003 | Feature: Eyedropper / Scenario: Sample then paint | yes | |
| QA-001:HP-004 | Feature: Fill and line / Scenario: Flood fill enclosed region | yes | |
| QA-001:HP-005 | Feature: Fill and line / Scenario: Bresenham line | yes | |
| QA-001:HP-006 | Feature: Undo redo / Scenario: Keyboard and toolbar | yes | |
| QA-001:HP-007 | Feature: Keyboard shortcuts / Scenario: Color keys 1–9 | yes | |
| QA-001:HP-008 | Feature: Zoom / Scenario: Grid at high zoom | yes | |
| QA-001:HP-009 | Feature: Keyboard shortcuts / Scenario: Tool keys B E I G L | yes | |
| QA-001:HP-010 | Feature: Eraser / Scenario: Drag stroke | yes | |
| QA-001:HP-011 | Feature: Fill and line / Scenario: Fill transparent pocket | yes | |
| QA-001:HP-012 | Feature: Undo redo / Scenario: Toolbar buttons | yes | |
| QA-001:HP-013 | Feature: Multi-frame paint / Scenario: Isolation across frames | yes | |
| QA-001:HP-014 | Feature: Eyedropper / Scenario: Sample transparent | yes | |
| QA-001:HP-015 | Feature: Palette click / Scenario: Swatch then paint | yes | |
| QA-001:HP-016 | Feature: Fill and line / Scenario: Diagonal line | yes | |
| QA-001:HP-017 | Feature: Undo redo / Scenario: Single undo reverts fill | yes | |
| QA-001:HP-018 | Feature: Undo redo / Scenario: Single undo reverts line | yes | |
| QA-001:RACE-001 | Feature: Paint races / Scenario: Tool switch mid-drag | yes | |
| QA-001:RACE-002 | Feature: Frame sync races / Scenario: Undo before PUT completes | yes | `@race` `@flaky` |
| QA-001:RACE-003 | Feature: Paint races / Scenario: Rapid same-cell clicks | yes | |
| QA-001:RACE-004 | Feature: Navigation guards / Scenario: New project mid-edit | yes | `@routing` — unsaved guard may be missing |
| QA-001:RACE-005 | Feature: Undo redo races / Scenario: Rapid undo redo spam | yes | |
| QA-001:RACE-006 | Feature: Multi-frame paint / Scenario: Switch frame after stroke | yes | |
| QA-001:RACE-007 | Feature: Frame sync races / Scenario: Stale PUT loses to newer edit | yes | `@flaky` route mock |
| QA-001:RACE-008 | Feature: Paint races / Scenario: Color keys during drag | yes | |
| QA-001:RACE-009 | Feature: Fill and line / Scenario: Line interrupted by tool switch | yes | |
| QA-001:RACE-010 | Feature: Fill and line / Scenario: Consecutive fill clicks | yes | |
| QA-001:RACE-011 | Feature: Zoom races / Scenario: Wheel zoom during drag | yes | |
| QA-001:RACE-012 | Feature: Multi-frame paint / Scenario: Frame switch before debounce | yes | |
| QA-001:EDGE-001 | Feature: Palette lock / Scenario: Paint blocked when locked | yes | |
| QA-001:EDGE-002 | Feature: Paint edge / Scenario: Same color same cell | yes | |
| QA-001:EDGE-003 | Feature: Eraser / Scenario: Click empty cell | yes | |
| QA-001:EDGE-004 | Feature: Fill and line / Scenario: Fill uniform canvas | yes | |
| QA-001:EDGE-005 | — | unit-only | Undo cap — vitest |
| QA-001:EDGE-006 | Feature: Animation playback / Scenario: Read-only blocks tools | yes | |
| QA-001:EDGE-007 | Feature: Paint edge / Scenario Outline: Corner cells | yes | |
| QA-001:EDGE-008 | Feature: Paint edge / Scenario: Non-primary button ignored | yes | |
| QA-001:EDGE-009 | Feature: Paint edge / Scenario: Hover without button | yes | |
| QA-001:EDGE-010 | — | unit-only | 4-connectivity — vitest flood-fill |
| QA-001:EDGE-011 | Feature: Palette lock / Scenario: Fill with valid locked color | yes | |
| QA-001:EDGE-012 | Feature: Fill and line / Scenario: Line single click | yes | |
| QA-001:EDGE-013 | Feature: Fill and line / Scenario: Line clipped at boundary | yes | |
| QA-001:EDGE-014 | Feature: Keyboard shortcuts / Scenario: Digit beyond palette | yes | |
| QA-001:EDGE-015 | Feature: Keyboard shortcuts / Scenario: Shortcuts blocked in inputs | yes | |
| QA-001:EDGE-016 | Feature: Undo redo / Scenario: Redo cleared after new edit | yes | |
| QA-001:EDGE-017 | Feature: Animation playback / Scenario: Undo disabled during play | yes | |
| QA-001:EDGE-018 | — | unit-only | Drag dedupe — pointer unit test |
| QA-001:EDGE-019 | Feature: Paint edge / Scenario Outline: 8×8 corners | yes | |
| QA-001:EDGE-020 | Feature: Color filters / Scenario: Lighting mode blocks paint | yes | |
| QA-001:EDGE-021 | Feature: Eyedropper / Scenario: No undo entry on sample | yes | |
| QA-001:EDGE-022 | Feature: Eraser / Scenario: Drag skips transparent | yes | |
| QA-001:EDGE-023 | Feature: Palette lock / Scenario: Fill blocked off-palette | yes | |
| QA-001:EDGE-024 | Feature: Palette lock / Scenario: Line blocked off-palette | yes | |
| QA-001:ERR-001 | Feature: API errors / Scenario: Paint when API unreachable | yes | `@offline` |
| QA-001:ERR-002 | Feature: API errors / Scenario: PUT 500 toast | yes | route mock |
| QA-001:ERR-003 | Feature: API errors / Scenario: No project guard | yes | `@routing` |
| QA-001:ERR-004 | Feature: API errors / Scenario: Redo while offline | yes | `@offline` |
| QA-001:ERR-005 | Feature: API errors / Scenario: Undo after PUT failure | yes | route mock |
| QA-001:ERR-006 | Feature: API errors / Scenario: Offline burst then reconnect | yes | `@offline` |
| QA-001:ERR-007 | Feature: API errors / Scenario: Sync failure allows more paint | yes | route mock |

### QA-002 import (`QA-002:*`)

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| QA-002:HP-001 | Feature: Casey import path / Scenario: Full wizard | yes | `@smoke` |
| QA-002:HP-002 | Feature: Casey import path / Scenario Outline: Resolution presets | yes | |
| QA-002:HP-003 | Feature: Casey import path / Scenario: Palette presets on preview | yes | |
| QA-002:HP-004 | Feature: Casey import path / Scenario: Remove background on | yes | |
| QA-002:HP-005 | Feature: Casey import path / Scenario: Remove background off | yes | |
| QA-002:HP-006 | Feature: Onboarding / Scenario: Skip overlay during import | yes | |
| QA-002:HP-007 | Feature: Casey import path / Scenario: Post-import cleanup paint | yes | |
| QA-002:RACE-001 | Feature: Import races / Scenario: Switch preset during pixelate | yes | `@flaky` |
| QA-002:RACE-002 | Feature: Import races / Scenario: Back during pixelate | yes | |
| QA-002:RACE-003 | Feature: Import races / Scenario: Accept then immediate Save | yes | |
| QA-002:RACE-004 | Feature: Import races / Scenario: Second drop replaces first | yes | |
| QA-002:EDGE-001 | Feature: Import edge / Scenario: Tiny image | yes | |
| QA-002:EDGE-002 | Feature: Casey import path / Scenario: 4K performance | yes | `@slow` |
| QA-002:EDGE-003 | Feature: Import edge / Scenario: PNG transparency | yes | |
| QA-002:EDGE-004 | Feature: New blank project / Scenario: Animated import 8 frames | yes | |
| QA-002:EDGE-005 | Feature: New blank project / Scenario: Custom canvas size | yes | |
| QA-002:ERR-001 | Feature: Import errors / Scenario: Unsupported file type | yes | |
| QA-002:ERR-002 | Feature: Import errors / Scenario: Corrupt image | yes | |
| QA-002:ERR-003 | Feature: Import errors / Scenario: Pixelate 500 | yes | route mock |
| QA-002:ERR-004 | Feature: Import errors / Scenario: Cancel file picker | yes | |

### QA-003 animation (`QA-003:*`)

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| QA-003:HP-001 | Feature: Duplicate frames / Scenario: Duplicate to 8 | yes | |
| QA-003:HP-002 | Feature: Duplicate frames / Scenario Outline: 16 and 32 | yes | |
| QA-003:HP-003 | Feature: Frame strip / Scenario: Switch active frame | yes | |
| QA-003:HP-004 | Feature: Multi-frame paint / Scenario: Paint on frame 2 only | yes | |
| QA-003:HP-005 | Feature: Animation playback / Scenario: Play and pause | yes | |
| QA-003:HP-006 | Feature: Animation playback / Scenario: FPS slider 12 | yes | |
| QA-003:HP-007 | Feature: Animation playback / Scenario: Loop off stops at end | yes | |
| QA-003:HP-008 | Feature: Onion skin / Scenario: Ghost prior frame | yes | |
| QA-003:HP-009 | Feature: Copy frame / Scenario: Copy frame 1 to 4 | yes | |
| QA-003:HP-010 | Feature: Frame reorder / Scenario: Drag frame 4 before 2 | yes | |
| QA-003:RACE-001 | Feature: Animation races / Scenario: Switch frame during play | yes | |
| QA-003:RACE-002 | Feature: Multi-frame paint / Scenario: Paint before frame load | yes | `@flaky` |
| QA-003:RACE-003 | Feature: Duplicate frames / Scenario: Duplicate during sync | yes | |
| QA-003:RACE-004 | Feature: Animation races / Scenario: Rapid play pause | yes | |
| QA-003:RACE-005 | Feature: Frame reorder / Scenario: Reorder before PUT | yes | `@flaky` |
| QA-003:EDGE-001 | Feature: Frame strip / Scenario: Strip hidden at 1 frame | yes | `@routing` |
| QA-003:EDGE-002 | Feature: Duplicate frames / Scenario: Blank duplicate to 8 | yes | |
| QA-003:EDGE-003 | Feature: Animation playback / Scenario: Identical frames play | yes | |
| QA-003:EDGE-004 | Feature: Animation playback / Scenario Outline: FPS boundaries | yes | |
| QA-003:EDGE-005 | Feature: Onion skin / Scenario: Frame 0 no ghost | yes | |
| QA-003:ERR-001 | Feature: Animation errors / Scenario: Duplicate API 500 | yes | route mock |
| QA-003:ERR-002 | Feature: Animation errors / Scenario: Frame load 404 | yes | route mock |
| QA-003:ERR-003 | Feature: Frame reorder / Scenario: Bad reorder response | yes | route mock |

### QA-004 project-io (`QA-004:*`)

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| QA-004:HP-001 | Feature: Save open / Scenario: First Save As | yes | |
| QA-004:HP-002 | Feature: Save open / Scenario: Save over existing | yes | |
| QA-004:HP-003 | Feature: Save open / Scenario: Save As new path | yes | |
| QA-004:HP-004 | Feature: Save open / Scenario: Open existing bundle | yes | |
| QA-004:HP-005 | Feature: Riley walk cycle / Scenario: Round-trip integrity | yes | `@smoke` |
| QA-004:HP-006 | Feature: Save As / Scenario: Asset type Character | yes | |
| QA-004:HP-007 | Feature: Export / Scenario: PNG current frame | yes | |
| QA-004:HP-008 | Feature: Export / Scenario: PNG spritesheet | yes | |
| QA-004:HP-009 | Feature: Export / Scenario: GIF export | yes | |
| QA-004:HP-010 | Feature: Riley walk cycle / Scenario: Cross-machine copy | yes | manual two-session |
| QA-004:RACE-001 | Feature: Save races / Scenario: Save during active sync | yes | |
| QA-004:RACE-002 | Feature: Navigation guards / Scenario: Open while unsaved | yes | `@routing` |
| QA-004:RACE-003 | Feature: Save open / Scenario: Overwrite confirm once | yes | |
| QA-004:RACE-004 | Feature: Save open / Scenario: Open immediately after save | yes | |
| QA-004:EDGE-001 | Feature: Save open / Scenario: Minimal bundle opens | yes | |
| QA-004:EDGE-002 | Feature: Save open / Scenario: Schema migration v1 | yes | legacy fixture |
| QA-004:EDGE-003 | Feature: Save open / Scenario: Unicode path round-trip | yes | |
| QA-004:EDGE-004 | Feature: Export / Scenario: Off-palette warning | yes | |
| QA-004:EDGE-005 | Feature: Navigation guards / Scenario: New without save | yes | `@routing` |
| QA-004:ERR-001 | Feature: Bundle integrity / Scenario: Corrupt ZIP | yes | |
| QA-004:ERR-002 | Feature: Bundle integrity / Scenario: Checksum mismatch | yes | |
| QA-004:ERR-003 | Feature: Bundle integrity / Scenario: Path traversal | yes | |
| QA-004:ERR-004 | Feature: Save errors / Scenario: Read-only Save As | yes | |
| QA-004:ERR-005 | Feature: Save open / Scenario: Wrong file type in picker | yes | |
| QA-004:ERR-006 | Feature: Save errors / Scenario: Disk full | deferred | needs ENOSPC simulation |

## Playwright notes

**Selectors** — No `data-testid` in MVP UI. Prefer:

- `page.getByRole('button', { name: 'Paint' })` and tool rail labels from `content/tools.ts` (`Fix mistakes`, `Eyedropper`, `Fill`, `Line`)
- `page.getByLabel('Pixel canvas')` for drawing (`canvas/Canvas.tsx`)
- File menu: `getByRole('menuitem', { name: 'Save As' })` etc. (`copy.fileMenu*`)
- Frame strip: `getByRole('button', { name: 'Frame 3' })` (`copy.frameThumbnail`)
- Import wizard steps: `getByText('Import image')`, `Continue`, `Use this result`
- Dialogs: `Save project as`, `Replace existing file?`, `Some pixels are off-palette`

**Canvas painting** — Dispatch pointer events on the canvas bounding box using cell math from grid dimensions and zoom, or expose a thin E2E helper that maps `(x,y)` to client coordinates. Wait for `PUT /api/projects/*/frames/*` via `page.waitForResponse` after strokes when testing sync.

**API mocking** — `page.route('**/api/projects/*/frames/*', route => { ... })` for delayed PUT (RACE cases), 500 errors (ERR cases), and out-of-order responses (stale PUT). Restore routes after each test.

**Offline** — `context.setOffline(true)` before paint; restore and wait for debounced sync (500 ms debounce + coordinator).

**Flaky races** — Tag `@flaky`; use `slowMo: 50` or explicit `route.continue()` delays (2000 ms for undo-before-PUT).

**Global setup** — Start `./scripts/dev.sh` or document manual prerequisite; `baseURL: 'http://127.0.0.1:5173'`.

**Reload persistence** — `page.reload()` or new browser context + Open dialog with saved path (Playwright cannot access native file picker without `setInputFiles` on hidden input if added).

---

```gherkin
@smoke
Feature: Riley MVP golden path — 8-frame walk cycle saved locally
  As Riley I want to draw a short loop and save a .pixelanea file
  so that my art survives copy and reopen.

  Background:
    Given the API and frontend are running at http://127.0.0.1:5173
    And I am on the "Start a new project" screen

  Scenario: Blank 32×32 animated project through save and round-trip
    # Matrix: MVP:HP-013, QA-004:HP-005, QA-004:HP-010
    When I choose "Start blank"
    And I set canvas size to 32×32
    And I choose "Animated" with 8 frames
    And I click "Create project"
    Then the editor opens with the paint tool active
  # Continue in same session — paint frame 1
    When I paint a horizontal stroke on row 0 of frame 1
    And I wait for the frame save request to complete
    And I click "Duplicate frames" in the tool rail
    And I choose "Copy art to all frames" and confirm "Duplicate frames"
    Then I see 8 frame thumbnails in the frame strip
    When I select frame 2
    And I paint a different mark on frame 2
    And I adjust animation speed to 8 fps
    And I press "Play animation"
    Then the canvas is read-only and frames advance
    When I press "Pause animation"
    And I open File → "Save As"
    And I enter path "/tmp/e2e-walk.pixelanea"
    And I choose asset type "Character"
    And I confirm "Save"
    Then I see toast "Project saved."
    When I reload the page
    And I open File → "Open"
    And I enter path "/tmp/e2e-walk.pixelanea"
    And I confirm "Open"
    Then frame 1 row 0 matches the saved stroke
    And frame 2 shows the frame-2 mark only
    And the project has 8 frames and Character asset type

@smoke @routing
Feature: Casey import path — photo to pixel grid under five minutes
  As Casey I want to import a photo and accept a pixelated preview
  so that I can clean up pixels in the editor quickly.

  Background:
    Given the API and frontend are running
    And I am on the "Start a new project" screen

  Scenario: Full import wizard with default background removal
    # Matrix: MVP:HP-002, MVP:HP-016, QA-002:HP-001, QA-002:HP-004
    When I choose "From image"
    Then I see "Import image"
    When I drop a valid PNG onto the drop zone
    And I click "Continue"
    And I select resolution preset 32×32
    And I click "Continue"
    And I select palette preset "Retro"
    And I click "Continue"
    And I wait until "Pixelating…" is not visible
    Then I see a pixelated preview grid
    And "Remove background" is on by default
    When I click "Use this result"
    Then the editor opens with imported pixels on the canvas
    And the task completed in under 5 minutes

  Scenario Outline: Resolution presets update preview
    # Matrix: MVP:HP-001, QA-002:HP-002
    Given I have started import with a sample photo on the resolution step
    When I select preset <preset>
    And I wait for preview to settle
    Then the preview grid dimensions match <preset>

    Examples:
      | preset |
      | 16×16  |
      | 32×32  |
      | 64×64  |

  @slow
  Scenario: 4K photo pixelates within performance target
    # Matrix: MVP:EDGE-007, QA-002:EDGE-002
    Given I have a 3840×2160 JPEG ready
    When I complete import wizard with 64×64 preset
    Then pixelation finishes in under 2 seconds

@routing
Feature: New blank project entry
  Background:
    Given the API and frontend are running
    And I am on the "Start a new project" screen

  Scenario: Create blank projects at standard presets
    # Matrix: MVP:HP-001
    When I choose "Start blank"
    And I set canvas size to 16×16
    And I choose "Single frame"
    And I click "Create project"
    Then the editor canvas is 16×16
    When I navigate to new project via File → "New"
    And I create blank 64×64 single frame
    Then the editor canvas is 64×64

  Scenario: Custom canvas size dialog
    # Matrix: QA-002:EDGE-005
    When I choose "Start blank"
    And I open "Custom" canvas size
    And I set width 48 and height 64
    And I confirm "Use this size"
    And I click "Create project"
    Then the editor canvas is 48×64

  Scenario: Animated new project with 8 frames from import path
    # Matrix: QA-002:EDGE-004
    When I choose "From image" and complete import with animation 8 frames enabled at project creation
    Then the editor opens with 8 frames in the strip

Feature: Onboarding overlay
  Scenario: Skip tour during first blank project
    # Matrix: QA-002:HP-006
    Given I create a new blank project for the first visit
    When I see onboarding step "Pick a color"
    And I click "Skip tour"
    Then onboarding does not block painting

@smoke
Feature: Paint golden path
  Background:
    Given I have a blank 32×32 project open
    And the paint tool is active with color 1 selected

  Scenario: Click-drag stroke syncs to the server
    # Matrix: MVP:HP-003, QA-001:HP-001, QA-001:HP-015
    When I paint a horizontal stroke across row 0
    And I wait for the frame save request to complete
    Then the painted cells remain visible
    When I reload the page and reopen the same project
    Then the same cells are still painted

  Scenario: Post-import cleanup paint and undo
    # Matrix: QA-002:HP-007
    Given I completed import wizard and the editor is open
    When I paint three cleanup pixels
    And I press Control+Z
    Then the last cleanup pixel is removed

Feature: Eraser — Fix mistakes
  Background:
    Given a 32×32 project with a painted row on the canvas
    And the eraser tool "Fix mistakes" is active

  Scenario: Click and drag clears painted cells
    # Matrix: MVP:HP-004, QA-001:HP-002, QA-001:HP-010
    When I click a painted cell and drag across the row
    Then cleared cells show the checkerboard
    And the tool rail shows label "Fix mistakes"

  Scenario: Eraser on empty cell is a no-op
    # Matrix: QA-001:EDGE-003
    When I click an empty cell with the eraser
    Then no error toast appears
    And undo remains disabled

  Scenario: Eraser drag skips transparent cells in a mixed row
    # Matrix: QA-001:EDGE-022
    Given a row with alternating painted and empty cells
    When I drag the eraser across the entire row
    Then only painted cells are cleared

Feature: Eyedropper samples color and switches to paint
  Background:
    Given a multi-color canvas in the editor

  Scenario: Sample colored cell then paint elsewhere
    # Matrix: MVP:HP-005, QA-001:HP-003
    When I activate "Eyedropper"
    And I click a colored cell
    Then the active tool switches to "Paint"
    And the active swatch matches the sampled color
    When I paint on another cell
    Then that cell uses the sampled color

  Scenario: Sample transparent cell
    # Matrix: QA-001:HP-014
    When I sample a transparent cell with the eyedropper
    Then the active tool switches to "Paint"
    And subsequent paint uses the transparent index

  Scenario: Eyedropper does not add undo entry
    # Matrix: QA-001:EDGE-021
    When I sample a colored cell
    Then undo remains disabled

Feature: Fill and line tools
  Background:
    Given a 32×32 project with a closed painted border

  Scenario: Flood fill enclosed region
    # Matrix: QA-001:HP-004, QA-001:HP-011
    When I activate "Fill"
    And I select a fill color different from the border
    And I click inside the enclosed transparent region
    Then all 4-connected transparent cells inside fill
    And the border pixels are unchanged

  Scenario: Line tool draws Bresenham path
    # Matrix: QA-001:HP-005, QA-001:HP-016
    When I activate "Line"
    And I pointer-down at cell (0,0) and pointer-up at (15,15) on a 16×16 canvas
    Then a continuous diagonal line appears without gaps

  Scenario: Single undo reverts entire fill
    # Matrix: QA-001:HP-017
    Given I flood-filled a region of at least 10 cells
    When I press Control+Z once
    Then the entire fill reverts

  Scenario: Single undo reverts entire line
    # Matrix: QA-001:HP-018
    Given I drew a multi-cell line
    When I press Control+Z once
    Then the whole line is removed

  Scenario: Line single click paints one pixel
    # Matrix: QA-001:EDGE-012
    When I pointer-down and pointer-up on the same cell with line tool
    Then exactly one pixel is painted

  Scenario: Line clipped at grid boundary
    # Matrix: QA-001:EDGE-013
    When I draw a line from inside the grid toward an out-of-bounds corner
    Then only in-bounds cells are painted

Feature: Palette editing and presets
  Background:
    Given the palette panel is expanded

  Scenario: Add edit remove colors and apply preset
    # Matrix: MVP:HP-006
    When I add a new color and click "Save color"
    And I edit a swatch and save
    And I remove a color not in use on canvas
    And I choose preset "Gameboy"
  # Then palette shows preset colors
    And I click "Save palette"
    Then palette changes persist after project reload

  Scenario: Click swatch then paint
    # Matrix: QA-001:HP-015
    Given the paint tool is active
    When I click the third palette swatch
    And I paint one cell
    Then that cell uses the third color

Feature: Palette lock
  Background:
    Given the palette has 4 colors and lock is off

  Scenario: Locked palette blocks off-palette paint
    # Matrix: MVP:HP-007, QA-001:EDGE-001, QA-001:EDGE-023, QA-001:EDGE-024
    When I enable "Lock palette"
    And I attempt to paint with an off-palette active index
    Then no off-palette pixels are placed
    When I attempt fill and line with off-palette index
    Then no fill or line commands apply

  Scenario: Fill works with valid locked palette color
    # Matrix: QA-001:EDGE-011
    Given palette lock is on and active color is within palette
    When I flood fill a region
    Then the region fills normally

  @race
  Scenario: Toggle palette lock during paint drag
    # Matrix: MVP:RACE-004
    When I start a paint drag with lock off
    And I toggle "Lock palette" mid-drag
    Then the app does not crash
    And the finished stroke colors are consistent with lock state at release

Feature: Undo redo and edit history
  Background:
    Given a blank 32×32 project with paint tool active

  Scenario: Keyboard undo and redo restore strokes
    # Matrix: MVP:HP-008, QA-001:HP-006
    When I paint several cells in one stroke
    And I press Control+Z
    Then the stroke is undone
    When I press Control+Shift+Z
    Then the stroke is restored

  Scenario: Toolbar undo and redo mirror keyboard
    # Matrix: QA-001:HP-012
    When I paint a stroke
    And I click "Undo" in the toolbar
    Then the stroke is undone
    When I click "Redo"
    Then the stroke is restored
    And undo and redo buttons enable and disable correctly

  Scenario: Redo stack cleared after new edit after undo
    # Matrix: QA-001:EDGE-016
    When I paint stroke A
    And I undo
    And I paint stroke B
    Then redo is disabled
    And stroke A cannot be restored

Feature: Keyboard shortcuts and zoom
  Background:
    Given canvas focus is on the pixel canvas not a text field

  Scenario: Tool keys B E I G L switch tools
    # Matrix: QA-001:HP-009
    When I press "B"
    Then "Paint" is active
    When I press "E"
    Then "Fix mistakes" is active
    When I press "I"
    Then "Eyedropper" is active
    When I press "G"
    Then "Fill" is active
    When I press "L"
    Then "Line" is active

  Scenario: Number keys 1–9 select palette slots
    # Matrix: QA-001:HP-007, QA-001:EDGE-014
    Given the palette has 3 colors
    When I press "2"
    And I paint one cell
    Then the cell uses the second swatch color
    When I press "9"
    Then no color change occurs

  Scenario: Shortcuts blocked when typing in path input
    # Matrix: QA-001:EDGE-015
    When I focus the project path field in Save As
    And I press "B" and "1"
    Then the active tool does not change to Paint
    And the path field receives the characters

  Scenario: Zoom in shows grid lines at high zoom
    # Matrix: QA-001:HP-008
    When I zoom in until grid lines are visible
    And I paint one cell
    Then the pointer maps to the correct cell under the cursor

  @edge
  Scenario Outline: Zoom extremes remain usable
    # Matrix: MVP:EDGE-003
    When I set zoom to <zoom>
    Then the pixel canvas remains visible
    And I can paint cell (0,0)

    Examples:
      | zoom   |
      | 25%    |
      | 3200%  |

Feature: Multi-frame paint isolation
  Background:
    Given an 8-frame 32×32 project with art on frame 1

  Scenario: Edits on frame 2 do not affect frame 1
    # Matrix: QA-001:HP-013, QA-003:HP-004
    When I select "Frame 2"
    And I paint a mark
    And I select "Frame 1"
    Then frame 1 pixels are unchanged
    When I select "Frame 2"
    Then the new mark is visible

Feature: Duplicate frames
  Background:
    Given a single-frame 32×32 project with art on frame 1

  Scenario: Duplicate to 8 with copy art
    # Matrix: MVP:HP-010, QA-003:HP-001
    When I click "Duplicate frames" in the tool rail
    And I choose "Copy art to all frames"
    And I confirm "Duplicate frames"
    Then I see 8 frame thumbnails
    And each thumbnail matches the source art

  Scenario Outline: Duplicate to 16 and 32
    # Matrix: QA-003:HP-002
    When I duplicate the current frame to <count> with copy art
    Then the project has <count> frames

    Examples:
      | count |
      | 16    |
      | 32    |

  Scenario: Duplicate blank leaves other frames empty
    # Matrix: QA-003:EDGE-002
    When I duplicate to 8 choosing "Blank other frames"
    Then frame 1 keeps art
    And frames 2–8 are empty

  @race
  Scenario: Rapid duplicate clicks stay at 8 frames
    # Matrix: MVP:RACE-003
    When I click duplicate to 8 twice in quick succession
    Then the project has exactly 8 frames
    And the UI is stable

  @race
  Scenario: Duplicate includes latest local pixels before sync
    # Matrix: QA-003:RACE-003
    When I paint on frame 1
    And I immediately duplicate to 8 before debounced sync completes
    Then duplicated frames include the latest painted pixels

Feature: Frame strip navigation
  Background:
    Given an 8-frame project

  Scenario: Click thumbnail switches active frame
    # Matrix: QA-003:HP-003, MVP:EDGE-005
    When I click "Frame 3"
    Then "Frame 3" is highlighted in the strip
    And the canvas shows frame 3 pixels
    When I click "Frame 1"
    And I click "Frame 8"
    Then navigation works at first and last frame

  Scenario: Frame strip hidden for single-frame project
    # Matrix: QA-003:EDGE-001
    Given a single-frame project is open
    Then the frame strip is not visible

Feature: Animation playback
  Background:
    Given an 8-frame project with different art on frames 1–3

  Scenario: Play pause with default speed
    # Matrix: MVP:HP-011, QA-003:HP-005
    When I press "Play animation"
    Then frames advance and the active thumbnail follows playback
    And the canvas is read-only
    When I press "Pause animation"
    Then I can paint again

  Scenario: FPS slider changes playback speed
    # Matrix: QA-003:HP-006
    When I set animation speed to 12 fps
    And I play the animation
    Then frames advance at the 12 fps rate

  Scenario: Loop off stops on last frame
    # Matrix: QA-003:HP-007
    When I turn "Loop animation" off
    And I play until the end
    Then playback stops on the last frame
    When I turn loop on and play
    Then animation cycles

  Scenario Outline: FPS boundary values
    # Matrix: MVP:EDGE-004, MVP:ERR-008, QA-003:EDGE-004
    When I set animation speed to <fps> fps
    And I play the animation
    Then playback uses <fps> fps without error

    Examples:
      | fps |
      | 1   |
      | 24  |

  Scenario: Identical frames play without error
    # Matrix: QA-003:EDGE-003
    Given all 8 frames have identical pixels
    When I play the animation
    Then no error toast appears

  Scenario: Undo and redo disabled during playback
    # Matrix: QA-001:EDGE-006, QA-001:EDGE-017
    When I press "Play animation"
    And I attempt paint erase fill and line
    Then the grid does not change
    When I press Control+Z and Control+Shift+Z
    Then the grid does not change
    And toolbar undo and redo are disabled

Feature: Onion skin
  Background:
    Given an 8-frame project with art on frame 1

  Scenario: Prior frame ghost at reduced opacity
    # Matrix: QA-003:HP-008
    When I select "Frame 2"
    And I enable "Onion skin"
    Then I see a ghost of frame 1 at reduced opacity while editing frame 2

  Scenario: Frame 1 has no n-1 ghost
    # Matrix: QA-003:EDGE-005
    When I select "Frame 1"
    And I enable "Onion skin"
    Then no crash occurs and no prior-frame ghost is shown

Feature: Copy frame and reorder
  Background:
    Given a 4-frame project with distinct art per frame

  Scenario: Copy frame 1 to frame 4
    # Matrix: QA-003:HP-009
    When I open frame menu "Copy from frame…"
    And I choose "Copy from frame 1" on frame 4
    Then frame 4 pixels match frame 1
    And I see toast "Frame copied."

  Scenario: Drag reorder updates frame order
    # Matrix: QA-003:HP-010
    When I drag frame 4 before frame 2 in the strip
    Then the strip order updates
    And persisted order matches after save and reopen

Feature: Save open and .pixelanea round-trip
  Background:
    Given a painted multi-frame project in the editor

  Scenario: First Save As writes bundle and toast
    # Matrix: QA-004:HP-001
    When I open File → "Save As"
    And I enter path "/tmp/e2e-first.pixelanea"
    And I choose asset type "Character"
    And I confirm "Save"
    Then I see "Project saved."

  Scenario: Save updates existing file
    # Matrix: QA-004:HP-002
    Given the project is saved at "/tmp/e2e-first.pixelanea"
    When I paint an additional cell
    And I open File → "Save"
    Then the file updates without error
    When I reopen the project
    Then the additional cell is present

  Scenario: Save As to new path leaves original untouched
    # Matrix: QA-004:HP-003
    When I open File → "Save As"
    And I save to "/tmp/e2e-copy.pixelanea"
    Then "/tmp/e2e-first.pixelanea" remains unchanged

  Scenario: Open loads frames palette and settings
    # Matrix: QA-004:HP-004, MVP:EDGE-008
    When I open File → "Open"
    And I enter path "/tmp/e2e-first.pixelanea"
    Then frames palette FPS and loop match saved state

  Scenario: Minimal empty bundle opens
    # Matrix: QA-004:EDGE-001
    Given a valid single-frame empty bundle on disk
    When I open it
    Then the editor loads without error

  Scenario: Unicode path round-trip
    # Matrix: QA-004:EDGE-003
    When I Save As to "/tmp/e2e-ünicode.pixelanea"
    And I reopen that path
    Then the project loads successfully

  Scenario: Schema migration on legacy v1 bundle
    # Matrix: QA-004:EDGE-002
    When I open legacy v1 fixture bundle
    Then migration succeeds and editor opens

Feature: Save As asset type
  Scenario: Character asset type persists on reopen
    # Matrix: MVP:HP-015, QA-004:HP-006
    When I Save As with asset type "Character"
    And I reopen the bundle
    Then asset type Character is preserved in project metadata

Feature: Export PNG spritesheet and GIF
  Background:
    Given a multi-frame painted project is saved

  Scenario: Export PNG of current frame
    # Matrix: MVP:HP-014, QA-004:HP-007
    When I export via File → "Export PNG"
    Then a PNG downloads matching current frame dimensions and pixels

  Scenario: Export spritesheet of all frames
    # Matrix: QA-004:HP-008
    When I export via File → "Export spritesheet"
    Then a spritesheet PNG downloads containing all frames

  Scenario: Export GIF with loop setting
    # Matrix: QA-004:HP-009
    When I export via File → "Export GIF"
    Then an animated GIF downloads
    And loop behavior matches project loop setting

  Scenario: Off-palette export warning
    # Matrix: QA-004:EDGE-004
    Given off-palette pixels exist on canvas
    When I export PNG
    Then I see dialog "Some pixels are off-palette"
    When I click "Export anyway"
    Then export proceeds

Feature: Theme and keyboard help
  Scenario: Theme toggle persists across reload
    # Matrix: MVP:HP-017
    When I click "Toggle theme"
    Then light or dark theme applies to chrome
    When I reload the page
    Then the chosen theme persists

  Scenario: Shortcuts overlay opens with question mark
    # Matrix: MVP:HP-018
    When I press "?"
    Then I see "Keyboard shortcuts"
    When I press Escape
    Then the overlay closes

Feature: Color filters lighting mode
  Scenario: Place lighting point instead of paint
    # Matrix: QA-001:EDGE-020
    When I enable "Place lighting" in color filters
    And I click the canvas
    Then a lighting point is placed
    And no paint command changes the grid

@offline
Feature: Offline operation after local install
  Scenario: Core flows without network
    # Matrix: MVP:HP-019, QA-001:ERR-001, QA-001:ERR-006
    Given the browser context is offline
    And the local API was reachable before offline
    When I create a blank project
    And I paint several cells
    Then local edits remain visible
    When I restore network
    And I wait for debounced sync
    Then server frame matches local grid without duplicate corruption

@race @sync
Feature: Frame sync under rapid edits
  Background:
    Given a blank 32×32 project is open

  Scenario: Undo before debounced frame PUT completes
    # Matrix: QA-001:RACE-002
    Given the API frame save is delayed by 2000ms
    When I paint a stroke
    And I press Control+Z before the save completes
    Then the canvas shows the pre-stroke grid
    And when the delayed save completes the server matches the undone grid
    And no error toast is shown

  Scenario: Newer stroke wins when PUT responses arrive out of order
    # Matrix: QA-001:RACE-007
    Given PUT responses can arrive out of order via route mock
    When I paint stroke A
    And I paint stroke B before A's PUT returns
    Then the server ends on B's pixels

  Scenario: Rapid paint then API GET matches latest
    # Matrix: MVP:HP-009
    When I paint rapidly across 10 cells
    And I wait for debounce and sync
    And I GET the active frame via API
    Then response pixels match the canvas

  Scenario: Frame switch before debounce targets correct frame
    # Matrix: QA-001:RACE-012
    When I paint 10 cells quickly on frame 1
    And I switch to frame 2 before debounce fires
    Then pending sync applies to frame 1
    And frame 2 remains unchanged

@race
Feature: Paint and input timing races
  Scenario: Rapid tool switch while dragging
    # Matrix: MVP:RACE-001, QA-001:RACE-001
    When I start a paint drag
    And I press "E" mid-drag
    Then no crash occurs
    And eraser behavior applies after the switch

  Scenario: Rapid same-cell color clicks
    # Matrix: QA-001:RACE-003
    When I click the same cell rapidly with alternating colors
    Then the final color matches the last click
    And undo stack stays coherent

  Scenario: Color keys during paint drag
    # Matrix: QA-001:RACE-008
    When I start a paint drag
    And I press "2" then "3" while holding the button
    Then cells painted after each key use the new color

  Scenario: Zoom wheel during drag
    # Matrix: QA-001:RACE-011
    When I start a paint drag
    And I scroll the zoom wheel
    Then the stroke continues on cells under the pointer without crash

  Scenario: Line tool interrupted by paint switch
    # Matrix: QA-001:RACE-009
    When I pointer-down with line tool
    And I press "B" before pointer-up
    Then no partial line remains
    And "Paint" is active

  Scenario: Consecutive fill clicks on two regions
    # Matrix: QA-001:RACE-010
    When I fill region A
    And I immediately fill region B
    Then both regions fill
    And undo requires two steps to revert both

  Scenario: Rapid undo redo spam
    # Matrix: QA-001:RACE-005
    When I paint five strokes
    And I press Control+Z five times rapidly
    And I press Control+Shift+Z three times rapidly
    Then the grid matches expected history without errors

@race
Feature: Import wizard timing
  Scenario: Switch preset during slow pixelate
    # Matrix: QA-002:RACE-001
    Given a large image is pixelating with throttled API
    When I select preset A then preset B before preview finishes
    Then the final preview matches preset B

  Scenario: Back navigation during pixelate
    # Matrix: QA-002:RACE-002
    When I start pixelate on preview step
    And I click "Back" quickly
    Then the prior step is shown without hung spinner

  Scenario: Accept import then immediate Save
    # Matrix: QA-002:RACE-003
    When I accept import preview
    And I immediately File → Save
    Then one valid bundle is written

  Scenario: Second file drop replaces first
    # Matrix: QA-002:RACE-004
    When I drop image A
    And I drop image B before A preview is ready
    Then preview shows image B only

@race
Feature: Animation and save timing
  Scenario: Switch frame during playback
    # Matrix: QA-003:RACE-001
    When I play animation
    And I click another frame thumbnail mid-play
    Then playback stops or switches cleanly without corrupt index

  Scenario: Paint before frame load completes
    # Matrix: QA-003:RACE-002
    Given frame GET is delayed via route mock
    When I switch frame and paint before load completes
    Then latest frame data wins without cross-frame bleed

  Scenario: Rapid play pause toggling
    # Matrix: QA-003:RACE-004
    When I toggle play and pause five times quickly
    Then read-only state is not stuck
    And player state is consistent

  Scenario: Reorder frames before PUT completes
    # Matrix: QA-003:RACE-005
    When I edit frame 2
    And I drag reorder before PUT completes
    Then final order and pixels persist correctly

@race
Feature: Save and navigation timing
  Scenario: Save during active paint and sync
    # Matrix: MVP:RACE-002, QA-004:RACE-001
    When I paint rapidly
    And I Save before sync settles
    Then the bundle includes the latest committed pixels

  Scenario: Overwrite confirm writes once
    # Matrix: QA-004:RACE-003
    When I Save As to an existing path
    And I confirm "Replace file"
    Then exactly one write occurs and ZIP is not truncated

  Scenario: Open immediately after save
    # Matrix: QA-004:RACE-004
    When I Save a large multi-frame project
    And I Open the same path without closing
    Then the project reloads cleanly or shows a clear blocking message

@routing
Feature: Navigation guards and unsaved work
  Scenario: New project mid-edit prompts or preserves work
    # Matrix: QA-001:RACE-004, QA-004:EDGE-005, QA-004:RACE-002
    Given I have unsaved paint changes on the editor
    When I trigger File → "New"
    Then I see a confirmation dialog with plain-language copy
    When I cancel the dialog
    Then I remain on the editor with changes intact

  Scenario: Open another file with unsaved edits
    # Matrix: QA-004:RACE-002
    Given I have unsaved edits
    When I File → "Open" another bundle path
    Then I am prompted to discard or cancel
    When I cancel
    Then current edits remain

@edge
Feature: Canvas boundaries and paint guards
  Scenario Outline: Corner cells on small grids
    # Matrix: QA-001:EDGE-007, QA-001:EDGE-019
    Given a <size> blank project is open
    When I paint cell (0,0) and cell (<max>,<max>)
    Then both cells show the active color

    Examples:
      | size  | max |
      | 16×16 | 15  |
      | 8×8   | 7   |

  Scenario: Paint same color on same cell adds no undo
    # Matrix: QA-001:EDGE-002
    When I click a cell already showing the active color
    Then undo remains disabled

  Scenario: Fill on uniform canvas is a no-op
    # Matrix: QA-001:EDGE-004
    Given the canvas is uniformly one color matching fill color
    When I flood fill anywhere
    Then no hang occurs

  Scenario: Non-primary pointer button does not paint
    # Matrix: QA-001:EDGE-008
    When I right-click a cell with paint tool
    Then no paint command applies

  Scenario: Pointer move without button does not paint
    # Matrix: QA-001:EDGE-009
    When I move the pointer across the grid without pressing
    Then no pixels are painted

  Scenario: Single-color palette paint and erase
    # Matrix: MVP:EDGE-001
    Given only one palette color remains
    When I paint and erase cells
    Then the canvas updates without crash

Feature: Import edge cases
  Scenario: Tiny image imports without crash
    # Matrix: QA-002:EDGE-001
    When I import a 2×2 PNG through the wizard
    Then preview upscales to chosen preset

  Scenario: PNG with transparency and background removal
    # Matrix: QA-002:EDGE-003
    When I import RGBA PNG with remove background on
    Then alpha is respected in the result

@error
Feature: API and sync failures
  Scenario: Frame PUT 500 shows toast and editor stays usable
    # Matrix: QA-001:ERR-002, MVP:ERR-005
    Given PUT /frames returns 500 via route mock
    When I paint a stroke
    Then I see a plain-language error toast
    When I paint a second stroke
    Then both strokes are visible locally

  Scenario: Undo after PUT failure still works
    # Matrix: QA-001:ERR-005
    Given PUT returns 500
    When I paint and press Control+Z
    Then local undo applies

  Scenario: Redo while API unreachable
    # Matrix: QA-001:ERR-004
    Given I undo a stroke while offline
    When I redo while still offline
    Then redo applies locally and sync error is surfaced without crash

  Scenario: Duplicate frames API failure
    # Matrix: QA-003:ERR-001
    Given duplicate endpoint returns 500
    When I attempt duplicate to 8
    Then I see an error toast
    And frame count is unchanged

  Scenario: Frame load failure on switch
    # Matrix: QA-003:ERR-002
    Given GET frame returns 404 for one index
    When I switch to that frame
    Then I see a plain-language error
    And I can continue editing other frames

@error
Feature: Import validation errors
  Scenario: Unsupported file type rejected
    # Matrix: MVP:ERR-002, QA-002:ERR-001
    When I drop a .txt file on import wizard
    Then I see "Use a PNG, JPEG, or BMP image."
    And I can pick another file

  Scenario: Corrupt image shows read error
    # Matrix: QA-002:ERR-002
    When I drop a truncated PNG
    Then I see "Couldn't read this image. Try another file."

  Scenario: Pixelate endpoint 500 on preview
    # Matrix: QA-002:ERR-003
    Given pixelate POST returns 500
    When I reach preview step
    Then I see "Couldn't pixelate this image. Try a different file or size."

  Scenario: Cancel file picker leaves wizard stable
    # Matrix: QA-002:ERR-004
    When I open file browse and cancel
    Then I remain on "Choose image" with no ghost project

@error
Feature: Bundle integrity and save failures
  Scenario: Corrupt ZIP rejected on open
    # Matrix: QA-004:ERR-001
    When I open truncated .pixelanea
    Then I see open failure message
    And no partial editor state loads

  Scenario: Checksum mismatch rejected
    # Matrix: MVP:HP-021, MVP:ERR-004, QA-004:ERR-002
    When I open tampered checksum bundle
    Then validation fails with plain-language damage message

  Scenario: Path traversal ZIP rejected
    # Matrix: MVP:ERR-007, QA-004:ERR-003
    When I open malicious path-traversal bundle
    Then open is rejected safely

  Scenario: Save As to read-only directory fails cleanly
    # Matrix: MVP:ERR-003, QA-004:ERR-004
    When I Save As to a read-only directory path
    Then I see "Couldn't save the project. Check the path and try again."
    And no truncated bundle remains

  Scenario: Open wrong file type blocked or errored
    # Matrix: QA-004:ERR-005
    When I attempt to open a .png via Open dialog
    Then picker filter blocks or shows clear error

  Scenario: No project — paint guard on fresh app
    # Matrix: QA-001:ERR-003
    Given I am on new project screen without an open project
    When I attempt to interact with canvas if shown
    Then no uncaught exception occurs
```
