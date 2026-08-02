# Gherkin E2E — Palette Section Rail (Batch 1)

## Goal

Validate that the right palette drawer section rail lets Riley reach Swatches, Presets, Shading, and Color filters in one click, with correct per-tab content, collapse/expand behavior, and regression-safe palette workflows.

## Source matrix

- **Path:** _(synthetic PR-* matrix for Palette Rail Batch 1 — no upstream `test_matrix_unit.md`)_
- **Backlog ID:** Palette Section Rail Batch 1 (product direction 2026-08-02)
- **Feature / layer:** editor / palette
- **Last matrix pass:** not run (authored with refactor)

## Prerequisites

- `./scripts/dev.sh` or Playwright `webServer` (`./scripts/e2e-webserver.sh`)
- Playwright Chromium (`pnpm test:e2e:install`)
- Test data: blank 32×32 single-frame project; 8-frame project for animation read-only case

## Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Critical golden path (PR-HP-*) |
| `@edge` | Boundary and guard behavior (PR-EDGE-*) |
| `@race` | Timing / rapid navigation (PR-RACE-*) |
| `@error` | Read-only and lock guards (PR-ERR-*) |
| `@regression` | MVP flows updated for section rail (PR-REG-*) |

## Matrix coverage

| Matrix ID | Gherkin location | E2E | Notes |
|-----------|------------------|-----|-------|
| PR-HP-001 | Feature: Default Swatches tab / Scenario: grid + actions visible | yes | Riley |
| PR-HP-002 | Feature: Section navigation / Scenario: exclusive content per tab | yes | Riley |
| PR-HP-003 | Feature: Shading workflow / Scenario: shade then paint | yes | Riley |
| PR-HP-004 | Feature: Color filters / Scenario: overlay apply | yes | Riley |
| PR-HP-005 | Feature: Presets / Scenario: Retro preset | yes | Casey |
| PR-HP-006 | Feature: Swatch actions / Scenario: add color dialog | yes | Riley |
| PR-HP-007 | Feature: Panel collapse / Scenario: expand returns to Swatches | yes | Casey |
| PR-HP-008 | Feature: Collapsed rail / Scenario: Shading icon expands | yes | Morgan |
| PR-EDGE-001 | Feature: Palette lock visibility / Scenario Outline: all tabs | yes | |
| PR-EDGE-002 | Feature: Filters sticky footer / Scenario: scroll lighting | yes | |
| PR-EDGE-003 | Feature: Swatch icon actions / Scenario: edit and remove | yes | |
| PR-EDGE-004 | Feature: No project / Scenario: placeholder only | yes | |
| PR-EDGE-005 | Feature: Section rail a11y / Scenario: aria-current | yes | |
| PR-RACE-001 | Feature: Rapid tab switching / Scenario: final tab wins | yes | |
| PR-RACE-002 | Feature: Collapse state / Scenario: Filters tab preserved | yes | |
| PR-RACE-003 | Feature: Active color / Scenario: survives tab hops | yes | |
| PR-ERR-001 | Feature: Animation read-only / Scenario: Apply disabled | yes | needs 8-frame + play |
| PR-ERR-002 | Feature: Palette locked / Scenario: icon actions disabled | yes | |
| PR-REG-001 | Feature: Regression paint flow / Scenario: section rail + Swatches | yes | maps MVP:HP-006 |
| PR-REG-002 | Feature: Regression palette lock / Scenario: lock in header | yes | maps MVP:HP-007 |
| PR-REG-003 | Feature: Helper compatibility / Scenario: selectPaletteColor | yes | `e2e/helpers.ts` |
| PR-UNIT-001 | — | unit-only | uiStore default `palettePanelSection` |
| PR-UNIT-002 | — | unit-only | Tooltip rendering |
| PR-UNIT-003 | — | unit-only | Shading algorithm math |

## Playwright notes

- **Panel:** `page.getByRole('complementary', { name: 'Palette' })` when expanded; collapsed shows `Expand palette panel` + `navigation[name=Palette sections]`.
- **Helpers:** `selectPaletteSection`, `collapsePalettePanel`, `expandPalettePanel` in `e2e/helpers.ts`.
- **Spec file:** `e2e/palette-panel.spec.ts` implements `@smoke` PR-HP-001–008.
- **PR-HP-004:** Paint first, enable overlay checkbox, click Apply; assert `waitForFramePut` + painted region still visible (pixels modified).
- **PR-ERR-001:** `createBlankProject({ frames: 8 })`, click `Play animation`, navigate Filters, assert `Apply to frame` disabled.
- **PR-EDGE-002:** Add lighting point (Place lighting + canvas click), scroll filter body; sticky footer buttons remain in viewport.
- **PR-RACE-001:** `for` loop clicking all four tabs quickly; assert final section content only.

---

```gherkin
@smoke
Feature: Palette section rail — default Swatches experience
  As Riley I want the swatch grid and compact actions on the default tab
  so that I can pick colors without scrolling.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And the palette panel is expanded

  Scenario: Swatches tab is active by default with grid and icon actions visible
    # Matrix: PR-HP-001
    Then the "Swatches" section button has aria-current "true"
    And within the palette panel I see the "Palette colors" listbox
    And I see icon buttons "Add color", "Edit color", and "Remove color"
    And the listbox and Add color button are within the panel viewport without scrolling

@smoke
Feature: Palette section navigation shows exclusive content
  As Riley I want one section visible at a time
  so that I am not hunting through a long scroll stack.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Each of the four section tabs shows only its content
    # Matrix: PR-HP-002
    When I select the "Swatches" palette section
    Then I see the "Palette colors" listbox
    And I do not see the "Retro" preset button
    And I do not see the "Color filters" region

    When I select the "Presets" palette section
    Then I see the "Retro" preset button
    And I do not see the "Palette colors" listbox

    When I select the "Shading palettes" palette section
    Then I see text "Shading palettes"
    And I see the "Generated shades" listbox
    And I do not see the "Palette colors" listbox

    When I select the "Color filters" palette section
    Then I see the region labeled "Color filters"
    And I see buttons "Apply to frame" and "Reset filters"
    And I do not see the "Palette colors" listbox

@smoke
Feature: Shading pick then paint on Swatches
  As Riley I want to generate a shade and paint in one flow
  so that daily shading work stays fast.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Select swatch, pick shade, return to Swatches, paint persists
    # Matrix: PR-HP-003
    Given I select palette color 1
    When I select the "Shading palettes" palette section
    And I pick the first generated shade
    And I select the "Swatches" palette section
    And I fit the canvas to view
    And I paint a stroke on the canvas
    And I wait for the frame save request to complete
    Then the painted region is visible on the canvas
    And the status shows "All changes saved"

@smoke
Feature: Color filters overlay apply
  As Riley I want to apply a color overlay to the frame
  so that I can preview filter effects on my art.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And I have painted a stroke on the canvas

  Scenario: Enable overlay and apply changes frame pixels
    # Matrix: PR-HP-004
    When I select the "Color filters" palette section
    And I check "Enable overlay"
    And I click "Apply to frame"
    And I wait for the frame save request to complete
    Then the canvas still shows painted pixels in the stroke region

@smoke
Feature: Palette presets on Presets tab
  As Casey I want one-click preset palettes
  so that I can restyle my project quickly.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Apply Retro preset updates swatches
    # Matrix: PR-HP-005
    When I select the "Presets" palette section
    And I click the "Retro" preset button
    And I select the "Swatches" palette section
    Then the palette listbox shows 8 color options

@smoke
Feature: Add color from Swatches icon actions
  As Riley I want compact add/edit/remove controls
  so that swatch management stays at hand.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And the "Swatches" palette section is active

  Scenario: Add color opens dialog and appends a swatch
    # Matrix: PR-HP-006
    When I click "Add color"
    Then I see a dialog titled "Add color"
    When I click "Save color" in the dialog
    Then the palette listbox has one more color option than before

@smoke
Feature: Palette panel collapse and expand
  As Casey I want to reclaim canvas space and return quickly
  so that the palette does not dominate the viewport.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Collapse then expand returns to Swatches with grid
    # Matrix: PR-HP-007
    When I collapse the palette panel
    And I expand the palette panel
    Then the "Swatches" section button has aria-current "true"
    And I see the "Palette colors" listbox

@smoke
Feature: Collapsed section rail expands to selected tab
  As Morgan I want section icons usable while collapsed
  so that I can discover shading without expanding first.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And the palette panel is collapsed

  Scenario: Clicking Shading icon expands panel on Shading tab
    # Matrix: PR-HP-008
    When I click the "Shading palettes" section button in the collapsed rail
    Then the palette panel is expanded
    And the "Shading palettes" section button has aria-current "true"
    And I see the "Generated shades" listbox

@edge
Feature: Palette lock visible on every section
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario Outline: Lock toggle stays in header across sections
    # Matrix: PR-EDGE-001
    When I select the <section> palette section
    Then I see the palette lock toggle in the panel header

    Examples:
      | section            |
      | Swatches           |
      | Presets            |
      | Shading palettes   |
      | Color filters      |

@edge
Feature: Filters sticky Apply and Reset footer
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And I select the "Color filters" palette section

  Scenario: Apply and Reset remain visible after scrolling lighting controls
    # Matrix: PR-EDGE-002
    Given I have placed at least one lighting point on the canvas
    When I scroll the filters section body
    Then "Apply to frame" remains visible in the viewport
    And "Reset filters" remains visible in the viewport

@edge
Feature: Swatches edit and remove icon actions
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And the "Swatches" palette section is active

  Scenario: Edit color dialog opens from icon button
    # Matrix: PR-EDGE-003
    When I click "Edit color"
    Then I see a dialog titled "Edit color"

  Scenario: Remove color reduces swatch count when allowed
    # Matrix: PR-EDGE-003
    Given the palette has more than one color
    When I click "Remove color"
    Then the palette listbox has one fewer color option

@edge
Feature: Palette panel without a loaded project
  Background:
    Given the API and frontend are running
    And I am on the landing page without opening a project

  Scenario: Placeholder shown and section content hidden
    # Matrix: PR-EDGE-004
    Then I see placeholder text "Palette swatches will appear here."
    And I do not see the "Palette sections" navigation
    And I do not see the "Palette colors" listbox

@edge
Feature: Active section aria-current on rail
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Only the active section button has aria-current true
    # Matrix: PR-EDGE-005
    When I select the "Presets" palette section
    Then the "Presets" section button has aria-current "true"
    And the "Swatches" section button does not have aria-current

@race
Feature: Rapid section tab switching
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Final tab content wins after rapid clicks
    # Matrix: PR-RACE-001
    When I rapidly click through Swatches, Presets, Shading palettes, and Color filters ending on Color filters
    Then I see the region labeled "Color filters"
    And I do not see the "Palette colors" listbox

@race @sync
Feature: Collapse preserves active section
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Collapse on Filters tab then expand stays on Filters
    # Matrix: PR-RACE-002
    Given I select the "Color filters" palette section
    When I collapse the palette panel
    And I expand the palette panel
    Then the "Color filters" section button has aria-current "true"
    And I see the region labeled "Color filters"

@race
Feature: Active color survives section hops
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Selected swatch unchanged after Presets round-trip
    # Matrix: PR-RACE-003
    Given I select palette color 2
    When I select the "Presets" palette section
    And I select the "Swatches" palette section
    Then palette color 2 remains selected

@error
Feature: Filters disabled during animation playback
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project with 8 frames

  Scenario: Apply to frame is disabled while animation plays
    # Matrix: PR-ERR-001
    When I start animation playback
    And I select the "Color filters" palette section
    Then the "Apply to frame" button is disabled

@error
Feature: Palette lock disables swatch icon actions
  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project
    And the "Swatches" palette section is active

  Scenario: Add Edit Remove disabled when palette is locked
    # Matrix: PR-ERR-002
    When I lock the palette from the header toggle
    Then the "Add color" button is disabled
    And the "Edit color" button is disabled
    And the "Remove color" button is disabled

@regression
Feature: Paint golden path uses Swatches section rail
  As Riley I still paint from the default Swatches tab
  so that MVP paint flows keep working.

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Paint stroke from Swatches tab syncs to server
    # Matrix: PR-REG-001 (MVP:HP-006 / QA-001:HP-015)
    Given the "Swatches" palette section is active
    When I select palette color 1
    And I paint a stroke on the canvas
    And I wait for the frame save request to complete
    Then the status shows "All changes saved"

@regression
Feature: Palette lock regression with section rail
  # Matrix: PR-REG-002 (MVP:HP-007)

  Background:
    Given the API and frontend are running
    And I open a new blank 32×32 project

  Scenario: Lock in header blocks off-palette paint from Swatches
    When I lock the palette from the header toggle
    And I select palette color 1 on the Swatches tab
    And I attempt to paint on the canvas
    Then no new pixels are painted

@regression
Feature: selectPaletteColor helper with section rail
  # Matrix: PR-REG-003

  Scenario: Helper selects color on default Swatches tab
    Given the API and frontend are running
    And I open a new blank 32×32 project
    When the test helper selects palette color 1
    Then palette color 1 is selected
```

---
