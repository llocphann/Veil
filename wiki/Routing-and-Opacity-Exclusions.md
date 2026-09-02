# Routing and Opacity Exclusions

Routing is Veil's most advanced feature. It lets the active note or system context choose a wallpaper or complete Scene automatically.

## Active context

At the top of **Routing**, **Active context** shows what Veil currently resolved for the active window, for example:

```text
Projects/Client A.md → Focus · pool (folder)
```

or:

```text
Workspace → default appearance
```

When a rule does not seem to work, check this line first.

## Wallpaper routing priority

Wallpaper rules do **not** behave as one single top-to-bottom list. Veil first separates ordinary note-context rules from adaptive system fallbacks.

The actual priority is:

1. **Manual Scene override** from `Veil: Switch scene`.
2. **Ordinary wallpaper rules**: note name, exact path, folder, tag, and normal frontmatter property. First matching rule in list order wins.
3. **Adaptive system fallbacks**: `@theme`, `@time`, `@day`, and `@schedule`. First matching fallback in list order wins.
4. **Default appearance**.

This means an `@theme=dark` rule remains a fallback even if you drag it above a note-specific rule. A matching ordinary rule still wins first.

Within the ordinary tier, list order matters. Within the adaptive tier, list order also matters.

Veil supports up to **96 wallpaper rules**.

## Rule fields

Each wallpaper rule has:

- **Enabled** — disabled rules are ignored.
- **Match by** — what context field Veil should compare.
- A match value/path.
- **Appearance source** — either a Scene or `Inline wallpaper — use global appearance`.
- **Wallpaper file** — visible only in inline mode.

A rule must have valid match syntax and a valid media source before it is considered ready.

## Match types

### Note name

Matches a note by basename. The `.md` extension is optional.

```text
Homepage
```

matches a note named `Homepage.md` regardless of which folder contains it.

Use **Exact path** instead if duplicate note names exist in different folders.

### Exact path

Matches one vault file exactly.

```text
Projects/Client A.md
```

The path is vault-relative.

### Folder

Matches every descendant note inside a folder.

```text
Projects
```

matches `Projects/A.md`, `Projects/Client/B.md`, and deeper descendants.

### Tag

A leading `#` is optional. Matching is case-insensitive, and a parent tag also matches nested tags.

A rule for:

```text
#media
```

matches both `#media` and `#media/movie`.

### Frontmatter property

Use **Property / system context** as the match type.

To match an exact scalar/array value, use:

```text
veil=focus
rating=5
published=true
mood=dark
```

Property keys and scalar values are compared case-insensitively. String, number, and boolean values are supported; arrays are checked item-by-item.

To match only the **existence** of a property, omit `=`:

```text
featured
```

This matches any note whose frontmatter contains a `featured` property, regardless of its value.

## System-context fallbacks

System fallbacks also use **Property / system context**, but their keys begin with `@`.

Only these reserved forms are valid:

### Theme

```text
@theme=dark
@theme=light
```

Veil resolves theme independently for each Obsidian window.

### Time

```text
@time=08:00-18:00
@time=22:00-06:00
```

Times use the computer's local clock. The start is included and the end is excluded.

Overnight ranges are supported. `22:00-06:00` matches from 22:00 through the following morning until 06:00.

If start and end are the same, the range represents the full day.

### Day

Examples:

```text
@day=weekday
@day=weekend
@day=mon,wed,fri
@day=mon-fri
@day=daily
```

Accepted day names are case-insensitive and include common short and long English forms such as `mon`/`monday`, `tue`/`tuesday`, and so on.

Special values:

- `weekday` / `weekdays` → Monday through Friday.
- `weekend` / `weekends` → Saturday and Sunday.
- `daily`, `everyday`, or `*` → every day.

Comma lists and day ranges are supported.

### Schedule

A schedule combines days and a clock range:

```text
@schedule=mon-fri 08:00-18:00
@schedule=weekend 10:00-23:00
@schedule=mon-fri 22:00-06:00
```

Overnight schedules belong to the day on which the range starts. For example, `mon-fri 22:00-06:00` includes Friday 22:00 through Saturday 06:00.

Veil does not continuously poll the clock. It calculates the next relevant boundary and schedules one timer for that boundary. If no time/day/schedule rule exists, no scheduling timer is kept.

## Example routing setup

Suppose you have these Scenes:

- `Focus`
- `Cinema`
- `Night`

A useful ordered rule set could be:

| Order | Match | Appearance source | Result |
| --- | --- | --- | --- |
| 1 | Folder `Projects` | Scene `Focus` | Project notes always use Focus. |
| 2 | Tag `#media/movie` | Scene `Cinema` | Movie notes use Cinema unless an earlier ordinary rule already matched. |
| 3 | Property `veil=focus` | Scene `Focus` | Explicit frontmatter opt-in. |
| 4 | `@theme=dark` | Scene `Night` | Dark-theme fallback only when no ordinary rule matched. |

Dragging the dark-theme rule to the top does not make it outrank the first three ordinary rules.

## Scene source vs inline source

When **Appearance source** points to a Scene, the rule switches the complete Scene including its pool, framing, opacity, effects, transition, and video behavior.

When **Appearance source** is **Inline wallpaper — use global appearance**, the rule changes only its selected wallpaper file. It continues using the global/default appearance and intentionally does not use the global wallpaper pool.

See [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md).

# Opacity exclusions

Opacity exclusions use the same match types, including frontmatter and system context, but they do not choose a wallpaper.

Instead, they selectively cancel one or both pane-opacity effects for matching contexts.

## Exclude pane background opacity

When enabled, matching contexts use a fully opaque pane surface (`100%`) instead of the pane-background opacity from the resolved default appearance or Scene.

Wallpaper opacity and whole-pane content opacity are unaffected.

## Exclude pane & content opacity

When enabled, matching contexts keep the entire pane group—nested backgrounds, text, icons, and images—at full opacity.

Pane-background opacity can still be applied separately unless the first exclusion option also matches.

## Exclusions are additive

Unlike wallpaper routing, opacity exclusions do not use first-match-wins. Veil evaluates every enabled matching exclusion.

If one rule excludes pane background opacity and another matching rule excludes pane & content opacity, both effects are excluded.

This is useful for combinations such as:

- keep all notes tagged `#reading` fully readable;
- keep pane backgrounds opaque during `@time=08:00-18:00`;
- combine both automatically when a reading note is open during that period.

Veil supports up to **96 opacity exclusions**.

## Common routing mistakes

### An adaptive rule appears above a note rule but still loses

Expected behavior. Ordinary rules always resolve before `@...` fallbacks.

### A Scene rule changes more settings than expected

Expected behavior. A Scene is a complete appearance. Use an inline wallpaper source if you only want the media file to change.

### A pool works globally but stops on an inline rule

Expected behavior. Inline rules do not inherit the global pool.

### A property rule never matches

Check that **Match by** is **Property / system context**, the key is present in frontmatter, and `key=value` uses a scalar/array value. For existence-only matching, use just `key`.

### Duplicate note names route incorrectly

Use **Exact path** instead of **Note name**.

### A rule works in one pop-out but not another

Each window resolves its own active root note and theme context. This is intentional.
