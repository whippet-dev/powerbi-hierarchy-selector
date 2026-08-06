# Multi-Field Selector

Multi-Field Selector is a Power BI custom visual for selecting and filtering
across multiple related fields within one compact visual.

Typical field combinations include:

- Region → Office → Team
- Category → Product → Variant
- Service → Journey → Stage
- Year → Month → Week

The fields do not need to be configured as a formal Power BI hierarchy.

## Status

**Internal beta — under active development**

The visual has been tested against clean hierarchies, blanks, skipped levels,
duplicate labels, Unicode and long text, dimension members without fact rows,
external filtering and higher-cardinality data.

## Getting started

1. Import the packaged `.pbiviz` into Power BI Desktop.
2. Add related grouping fields in the order they should be interpreted.
3. Choose **Single** or **Multiple** under **Format visual → Selection**.
4. Resize and format the visual to suit the report layout.

Field order matters. For example:

```text
Continent → Country → Region → City → Site
```

## Selection behaviour

### Single mode

A selection represents one hierarchy branch. Selecting an alternative value
replaces the relevant part of the current branch.

### Multiple mode

Multiple branches and mixed-depth selections can coexist.

The visual uses four states:

- **Explicit (`✓`)** — directly selected endpoint.
- **Inherited (`↳`)** — included because a higher-level value is selected.
- **Partial (`−`)** — contains one or more selected descendants.
- **Unselected** — not currently included.

**Select all** selects compatible values in a field. While searching,
**Select matches** selects all values matching the current field search.

## Search and sorting

Each field has an independent, case-insensitive partial search.

Under **Format visual → Values**, values can use:

- Data order
- A–Z
- Z–A

Compatible values remain above alternative values.

## Blank hierarchy values

Genuine null or empty hierarchy values are retained rather than discarded.

The visual generates a display label for them, defaulting to:

```text
(No value)
```

Change this under:

```text
Format visual → Values → Blank value label
```

This setting affects genuine blanks only. Literal source text such as
`(Blank)`, `Unknown` or `N/A` is not changed.

Blank intermediate levels remain part of the hierarchy so populated descendants
are still selectable.

## Duplicate labels and full paths

Identical visible labels under different parents remain separate Power BI
identities.

For example, several values called `Springfield` or `Main Office` can be
selected independently when they belong to different paths.

Hover over a value, or move keyboard focus to it, to see its full path:

```text
North America › United States › Illinois › Springfield › Main Office
```

Tooltip behaviour is configured under:

```text
Format visual → Tooltips (style under General)
```

Tooltip appearance — including font, text colours, background and transparency —
uses Power BI's native settings under:

```text
Format visual → General → Tooltips
```

## Show items with no data

Power BI controls which hierarchy members are supplied to the visual.

When using fields from a dimension table and members with no matching fact rows
must remain visible:

1. Select the Multi-Field Selector.
2. Open the dropdown beside a hierarchy field in the **Build visual** field
   well.
3. Choose **Show items with no data**.
4. Repeat for related fields if Power BI has not applied it automatically.

This allows the selector to retain dimension members whose measures are blank
or which have no related fact row.

A zero-valued fact remains distinct from a blank measure or a missing fact row.

## Current features

- Multiple related fields displayed in one selector
- Single and multiple selection modes
- Select all compatible values and select matching search results
- Context-aware compatible and alternative values
- Explicit, inherited and partial selection states
- Independent search for each field
- Configurable value sorting
- Full hierarchy-path tooltips
- Configurable blank-value label
- Per-field clear and Clear all controls
- Selection persistence when reports are saved and reopened
- Bookmark support
- External filtering from other report visuals
- Power BI **Show items with no data** support
- Configurable fonts, colours, spacing and field containers
- Keyboard-focusable buttons, searches and controls
- Native Power BI context menus for hierarchy values and empty visual space
- Optional value-label wrapping
- Screen-reader-friendly labels and hierarchy path descriptions
- Accessible keyboard navigation with roving focus and focus restoration
- Power BI high-contrast theme support

## Deferred enhancements

Potential future improvements include:

- an optional apply/batch-selection mode if real reports expose expensive
  recalculation;
- further accessibility and high-contrast testing;
- Microsoft certification.

## Development checks

Install the project packages once after cloning or changing dependencies:

```text
npm install
```

Before sharing or packaging a change, run:

```text
npm run eslint
npm run package
```

For a prospective certification build, use the stricter package audit:

```text
npm run package:certification
```

The Power BI build commands are pinned to a known version of
`powerbi-visuals-tools` so different developers use the same packaging tool.

## Versioning

Power BI visual releases use four-part versions in `pbiviz.json`, for example
`1.1.0.2`. The npm project metadata uses valid three-part semantic versioning,
so the corresponding `package.json` version is `1.1.0`.

## Support

See the [support policy](SUPPORT.md) for help, defect reporting and security
contact details.

Issues and feedback can be raised through the GitHub repository:

https://github.com/whippet-dev/powerbi-multi-field-selector

The visual's handling of report and support data is described in the
[privacy policy](PRIVACY.md).
