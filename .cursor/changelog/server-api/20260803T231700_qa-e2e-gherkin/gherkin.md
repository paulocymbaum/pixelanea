# Gherkin E2E — API modularization (Batch 3+4) integration

## Goal

Validate that frame, import, and export handler modules wired through thin `api_server.cpp` preserve HTTP semantics end-to-end: paint sync via binary PUT, frame duplication, import pixelate, debounced sync races, and error surfaces observable in the browser or API.

## Source matrix

- **Path:** derived (no formal `test_matrix_unit.md`); cases synthesized from:
  - `.cursor/skill-outputs/server/api/20260803T015500_api-modularization/batch-03-04-integrate-prompt.md`
  - `server/tests/frame_binary_api_test.cpp` (`[api][frame_binary]`, `[api][frame_delta]`)
  - `.cursor/skill-outputs/server/api/20260803T020300_pixelanea-cpp-standards/04_code-review.md`
- **Backlog ID:** API-MOD-34
- **Feature / layer:** server-api / api
- **Last matrix pass:** not run (derived matrix)

## Prerequisites

- `./scripts/dev.sh` (API `8787`, Vite `5173`)
- Playwright browsers installed (`pnpm exec playwright install`)
- E2E fixtures: `e2e/fixtures/sample.png`, `e2e/fixtures/sample-alpha.png`
- Writable save path: `/tmp/pixelanea-e2e-save.pixelanea` (see `e2e/helpers.ts`)

## Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Critical golden path through modularized handlers |
| `@race` | Timing / concurrency on frame PUT sync |
| `@routing` | Navigation and session lifecycle |
| `@edge` | Accept headers, binary lane, patch cells, import transparency |
| `@error` | API failure and user-visible rejection |
| `@api-only` | Playwright `page.request` or Catch2 — no dedicated UI flow |
| `@slow` | Multi-step wizard or delayed route mock |

## Matrix coverage

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| HP-001 | Feature: Paint and persist / Scenario: click-drag syncs via PUT | yes | `e2e/smoke.spec.ts` — paint PUT |
| HP-002 | Feature: Multi-frame round-trip / Scenario: duplicate to 8 frames | yes | `e2e/smoke.spec.ts` — `POST …/frames/duplicate` |
| HP-003 | Feature: Multi-frame round-trip / Scenario: save reload open | yes | `e2e/smoke.spec.ts` — full Riley flow |
| HP-004 | Feature: Import image / Scenario: wizard happy path | yes | `e2e/smoke.spec.ts` — Casey import |
| HP-005 | Feature: Frame content negotiation / Scenario: default JSON GET | yes | `getFramePixels` in helpers uses JSON GET |
| HP-006 | Feature: Frame content negotiation / Scenario: binary GET with headers | api-only | Catch2 `frame_binary_api_test`; E2E via `page.request` |
| HP-007 | Feature: Frame content negotiation / Scenario: JSON PUT round-trip | unit-only | Catch2 backward-compat test |
| HP-008 | Feature: Frame operations / Scenario: copy frame between indices | unit-only | `animationMatrix.test.tsx`; no Playwright spec |
| HP-009 | Feature: Frame operations / Scenario: reorder frame strip | unit-only | `BottomFrameStrip` + vitest; no Playwright spec |
| HP-010 | Feature: Export animation / Scenario: GIF via server handler | manual-only | `POST …/export/gif` wired; `e2e/export.spec.ts` covers PNG only |
| HP-011 | Feature: Frame operations / Scenario: list frames after duplicate | yes | implicit in HP-002/003 frame strip visibility |
| RACE-001 | Feature: Frame sync under rapid edits / Scenario: undo during delayed PUT | yes | `e2e/race.spec.ts` RACE-002 mapping |
| RACE-002 | Feature: Frame sync under rapid edits / Scenario: newer edit wins | yes | `e2e/race.spec.ts` RACE-007 |
| EDGE-001 | Feature: Frame content negotiation / Scenario Outline: Accept q-values | unit-only | Catch2 q-value test; no browser Accept UI |
| EDGE-002 | Feature: Frame content negotiation / Scenario: binary GET headers | api-only | Playwright `page.request` with `Accept: application/octet-stream` |
| EDGE-003 | Feature: Incremental frame edits / Scenario: PATCH cells round-trip | unit-only | Catch2 `[api][frame_delta]`; editor uses PUT binary for paint |
| EDGE-004 | Feature: Import transparency / Scenario: RGBA PNG keeps index 0 | yes | `e2e/import.spec.ts` EDGE-003 |
| EDGE-005 | Feature: Binary PUT guards / Scenario: wrong byte count returns 400 | unit-only | Catch2 size rejection |
| EDGE-006 | Feature: Binary PUT guards / Scenario: repeat PUT idempotent updatedAt | unit-only | Catch2 perf case 64×64/128×128 |
| ERR-001 | Feature: Import rejection / Scenario: unsupported file | yes | `e2e/import.spec.ts` ERR-001 |
| ERR-002 | Feature: Cell conflict / Scenario: PATCH returns 409 | unit-only | Catch2 conflict test; no UI optimistic-concurrency path |
| ERR-003 | Feature: Frame not found / Scenario: GET out-of-range frame 404 | unit-only | Catch2 or page.request; no UI path |
| ERR-004 | Feature: Import API failure / Scenario: pixelate 500 surfaces toast | unit-only | `importMatrix.test.tsx` ERR-003; no Playwright |

## Playwright notes

### Spec file mapping

| Spec file | Tags (grep) | Matrix IDs | Notes |
|-----------|-------------|------------|-------|
| `e2e/smoke.spec.ts` | `@smoke` | HP-001, HP-002, HP-003, HP-004, HP-011 | `waitForFramePut` matches `PUT /api/projects/{id}/frames/{index}`; duplicate waits on `POST …/frames/duplicate` |
| `e2e/import.spec.ts` | `@error @import`, `@edge @import` | ERR-001, EDGE-004 | Import wizard: landing **From image** → `Import image` heading; alert `Use a PNG, JPEG, or BMP image.` |
| `e2e/export.spec.ts` | `@export` | — (HP-010 gap) | Client-side PNG only; does not hit `POST …/export/gif` |
| `e2e/race.spec.ts` | `@race @sync` | RACE-001, RACE-002 | `page.route('**/api/projects/*/frames/*')` gates first PUT; uses `paintStroke`, `paintFrame2Mark`, `getFramePixels` |
| `e2e/errors.spec.ts` | `@errors` | — | Project open errors; out of API-mod scope |
| `e2e/routing.spec.ts` | `@routing` | — | Navigation guards; orthogonal to handler wiring |

### Selectors and helpers (`e2e/helpers.ts`)

- **Landing:** `Start blank`, `From image`, `Open existing project`
- **Editor:** `Pixel canvas` label, `Duplicate frames` button/dialog, `Frame {n}` buttons, status `All changes saved`
- **File menu:** `File` → `Export` → `GIF animation` (server path; not yet covered in specs)
- **Import:** `input[type="file"]`, `Continue`, tabs `Resolution` / `Palette`, `Use this result`
- **API helpers:** `getFramePixels` / `countPaintedPixels` call `GET /api/projects/{id}/frames/{index}` (JSON lane)
- **Save/open:** `mockProjectPicker`, `saveProjectToPath`, `closeProjectSession`, `E2E_SAVE_PATH`

### API mocking patterns

```typescript
// RACE-001: hold first frame PUT (race.spec.ts pattern)
await page.route("**/api/projects/*/frames/*", async (route) => {
  if (route.request().method() === "PUT") { /* gate first PUT */ }
  await route.continue();
});

// EDGE-002: binary GET via Playwright request context (manual scenario)
const res = await page.request.get(`/api/projects/${id}/frames/0`, {
  headers: { Accept: "application/octet-stream" },
});
// assert res.headers()["content-type"], X-Frame-Width, body byte length
```

### `@flaky` guidance

- `@race` scenarios need route interception; mark `@flaky` without throttling or 600ms+ debounce waits.
- HP-010 GIF export: add new spec under `e2e/export.spec.ts` with `page.waitForResponse` on `POST …/export/gif` and download/assert `GIF89a` magic bytes.

### Catch2 parity (`ctest -R frame_binary`)

Run server integration tests after handler changes:

```bash
cd server/build && ctest --output-on-failure -R 'frame_binary|frame_delta'
```

Maps to HP-006, HP-007, EDGE-001, EDGE-003, EDGE-005, EDGE-006, ERR-002.

---

```gherkin
@smoke
Feature: Paint and persist through modularized frame handlers
  As Riley I want strokes to sync via the frame PUT handler
  so that modular routing does not break autosave.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project with 1 frame
    And the paint tool is active with color 1 selected

  Scenario: Click-drag stroke syncs via PUT and shows saved status
    # Matrix: HP-001
    When I paint a diagonal stroke on the pixel canvas
    And I wait for a successful PUT to "/api/projects/{projectId}/frames/0"
    Then the status region shows "All changes saved"
    And a GET of frame 0 returns JSON pixels with at least one non-zero index

@smoke @routing
Feature: Multi-frame round-trip through duplicate and project handlers
  As Riley I want duplicated frames and painted pixels to survive save and reopen
  so that frame_handlers and project_handlers stay wired after modularization.

  Background:
    Given the API and frontend are running
    And the native project picker is mocked for save and open at "/tmp/pixelanea-e2e-save.pixelanea"
    And I open a new blank 32×32 project with 1 frame

  Scenario: Duplicate source frame into 8 frames
    # Matrix: HP-002, HP-011
    Given I have painted a stroke on frame 1
    And the frame PUT has completed
    When I open the "Duplicate frames" dialog
    And I confirm duplicate to 8 frames
    Then a successful POST to "/api/projects/{projectId}/frames/duplicate" completes
    And I see frame buttons "Frame 1" through "Frame 8" in the frame strip

  Scenario: Save, close session, reload, and open preserves both painted frames
    # Matrix: HP-003, HP-005
    Given I have duplicated to 8 frames after painting frame 1
    And I select frame 2 and paint a distinct mark
    And both frame PUTs have completed
    When I save the project to the mocked path
    Then I see "Project saved."
    When I close the server session for the project
    And I reload the app and open the saved project from the file menu
    Then the loaded project reports 8 frames and asset type "character"
    And frame 1 JSON pixels contain painted cells
    And frame 2 JSON pixels differ from frame 1 and contain painted cells

@smoke @slow
Feature: Import image through modularized pixelate handler
  As Casey I want the import wizard to call POST import/pixelate and land in the editor
  so that import_handlers delegation preserves the happy path.

  Background:
    Given the API and frontend are running

  Scenario: Full import wizard opens editor with pixelated grid
    # Matrix: HP-004
    When I start import from the landing page via "From image"
    And I upload "e2e/fixtures/sample.png"
    And I advance through Resolution and Palette steps
    And I click "Use this result"
    Then the editor header shows "Imported project"
    And the pixel canvas is visible

@edge @api-only
Feature: Frame content negotiation on GET and PUT
  As an API client I want JSON and octet-stream lanes on the same routes
  so that handle_get_frame and handle_put_frame preserve Accept and Content-Type semantics.

  Background:
    Given the API is running
    And a 4×4 project exists with known pixels on frame 0

  Scenario: Default GET returns JSON frame document
    # Matrix: HP-005, HP-007
    When I GET "/api/projects/{projectId}/frames/0" without an Accept header
    Then the response status is 200
    And the Content-Type is "application/json"
    And the JSON body includes "width", "height", and "pixels" array

  Scenario: GET with Accept application/octet-stream returns raw bytes and metadata headers
    # Matrix: HP-006, EDGE-002
    When I GET "/api/projects/{projectId}/frames/0" with header Accept "application/octet-stream"
    Then the response status is 200
    And the Content-Type starts with "application/octet-stream"
    And the response body length equals width times height
    And response headers include "X-Frame-Width", "X-Frame-Height", "X-Frame-Index", and "X-Frame-Updated-At"

  Scenario Outline: Accept q-values select the higher-weighted representation
    # Matrix: EDGE-001
    When I GET "/api/projects/{projectId}/frames/0" with Accept "<accept>"
    Then the response Content-Type starts with "<expected_type>"

    Examples:
      | accept                                                              | expected_type              |
      | application/octet-stream;q=0.8, application/json;q=0.9              | application/json           |
      | application/json;q=0.8, application/octet-stream;q=0.9            | application/octet-stream |

@edge
Feature: Import transparency preserved after pixelate handler
  As Casey I want transparent PNG regions to remain palette index 0
  so that import_handlers does not fill alpha with opaque pixels.

  Background:
    Given the API and frontend are running

  Scenario: RGBA PNG keeps transparent corner pixels after import
    # Matrix: EDGE-004
    When I run the import wizard with "e2e/fixtures/sample-alpha.png"
    And I accept the preview into the editor
    Then frame 0 JSON pixels include both zero and non-zero indices
    And the first and last pixel indices are 0

@edge @api-only
Feature: Incremental frame edits via PATCH cells handler
  As the sync layer I want cell-level patches to update the grid without full PUT
  so that handle_patch_frame_cells remains available for small deltas.

  Background:
    Given the API is running
    And a 4×4 blank project exists on frame 0

  Scenario: PATCH cells applies batched changes readable via binary GET
    # Matrix: EDGE-003
    When I PATCH "/api/projects/{projectId}/frames/0/cells" with body:
      """
      [
        {"x":0,"y":0,"previous":0,"next":2},
        {"x":1,"y":1,"previous":0,"next":4}
      ]
      """
    Then the response status is 200
    When I GET frame 0 with Accept "application/octet-stream"
    Then byte at (0,0) equals 2
    And byte at (1,1) equals 4

@edge @api-only
Feature: Binary PUT validation on frame handler
  As the API I reject malformed binary payloads before touching the repository.

  Scenario: PUT with wrong octet-stream byte count returns 400
    # Matrix: EDGE-005
    Given a 4×4 project exists
    When I PUT "/api/projects/{projectId}/frames/0" with Content-Type "application/octet-stream" and body "abc"
    Then the response status is 400

  Scenario: Repeat identical binary PUT returns stable updatedAt metadata
    # Matrix: EDGE-006
    Given a 64×64 project exists
    When I PUT valid binary pixels twice to frame 0
    Then both responses are 200
    And the "updatedAt" field in the second response equals the first

@race @sync
Feature: Frame sync under rapid edits
  As Riley I want debounced binary PUT sync to stay correct when edits overlap
  so that handle_put_frame wiring does not regress coalescing behavior.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project with 1 frame

  @flaky
  Scenario: Undo before delayed frame PUT completes leaves server matching undone grid
    # Matrix: RACE-001
    # Playwright: page.route gate on first PUT; release after Undo; expect 2 PUTs and no alert
    Given the first frame PUT is held by a route mock
    When I paint a stroke on the canvas
    And I wait until Undo is enabled
    And I press Undo before the held PUT is released
    And I release the held PUT and wait for subsequent PUT responses
    Then the status shows "All changes saved"
    And no error alert is visible
    And server frame 0 painted pixel count matches the canvas after undo

  @flaky
  Scenario: Newer stroke wins when PUT responses arrive out of order
    # Matrix: RACE-002
    # Playwright: hold first PUT, paint second mark, release, compare getFramePixels to countPaintedPixels
    Given the first frame PUT is held by a route mock
    When I paint a diagonal stroke
    And I paint a second distinct mark before the first PUT completes
    And I release the held PUT and wait for all PUT responses
    Then server frame 0 non-zero pixel count matches the editor painted count

@error @import
Feature: Import rejection before pixelate handler is called
  As Casey I want invalid files blocked in the wizard
  so that unsupported uploads never reach POST import/pixelate.

  Background:
    Given the API and frontend are running
    And I opened the import wizard from "From image"

  Scenario: Unsupported file shows alert and blocks Continue
    # Matrix: ERR-001
    When I select a text file named "notes.txt"
    Then I see alert text "Use a PNG, JPEG, or BMP image."
    And the "Continue" button is disabled
    When I select a valid PNG image
    Then the alert is dismissed
    And the "Continue" button is enabled

@error @api-only
Feature: Frame not found on modularized GET handler
  As the API I return 404 when the frame index does not exist
  so that handle_get_frame preserves project/frame error mapping.

  Background:
    Given the API is running
    And a project exists with 1 frame

  Scenario: GET frame index beyond count returns 404
    # Matrix: ERR-003
    When I GET "/api/projects/{projectId}/frames/99"
    Then the response status is 404

@error @api-only
Feature: Cell conflict on optimistic PATCH
  As the API I return 409 when previous cell value does not match
  so that handle_patch_frame_cells preserves concurrency semantics.

  Background:
    Given the API is running
    And a 4×4 project exists with cell (0,0) equal to 2

  Scenario: Second PATCH with stale previous returns 409
    # Matrix: ERR-002
    When I PATCH cells at (0,0) from previous 0 to next 3
    Then the response status is 409
    And no further user-visible UI path exists for this conflict today

@smoke @manual-only
Feature: Export animated GIF through modularized export handler
  As Riley I want File → Export → GIF animation to return server-encoded bytes
  so that handle_export_gif remains reachable after route extraction.

  Background:
    Given the API and frontend are running
    And I open a blank project with at least 2 frames

  Scenario: GIF export downloads valid GIF89a animation
    # Matrix: HP-010
    Given I have painted distinct content on frames 1 and 2
    And frame PUTs have completed
    When I choose File → Export → "GIF animation"
    Then a successful POST to "/api/projects/{projectId}/export/gif" completes
    And a file download begins with suggested name ending in ".gif"
    And the downloaded bytes start with "GIF89a"
    And I see toast text matching "Exported {filename}."
```
