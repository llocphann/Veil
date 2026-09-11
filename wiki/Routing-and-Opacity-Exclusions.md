# Routing and Opacity Exclusions

Routing lets Veil choose a wallpaper or Scene from the active note and system context.

## Check Active context first

**Routing → Active context** shows what currently won. Use it first when debugging a rule.

## Priority

1. Manual Scene override.
2. Note/path/folder/tag/frontmatter rules — first match wins.
3. `@theme`, `@time`, `@day`, `@schedule` fallbacks — first match wins.
4. Default appearance.

An adaptive `@...` rule never outranks an ordinary note rule, even if it appears above it in the list.

Veil supports up to **96 wallpaper rules**.

## Match types

- **Note name** — basename, `.md` optional.
- **Exact path** — one vault-relative file path.
- **Folder** — all descendant notes.
- **Tag** — `#` optional; parent tags also match nested tags.
- **Frontmatter property** — `key=value` for a value, or `key` for property existence.

Examples:

```text
veil=focus
rating=5
published=true
featured
```

## System fallbacks

Use the frontmatter/system-context field with these reserved forms:

```text
@theme=dark
@theme=light
@time=08:00-18:00
@time=22:00-06:00
@day=weekday
@day=weekend
@day=mon,wed,fri
@schedule=mon-fri 08:00-18:00
@schedule=mon-fri 22:00-06:00
```

Time uses the local computer clock. Overnight ranges are supported. Veil schedules the next meaningful boundary instead of polling continuously.

## Scene or inline source?

A **Scene** route switches the complete appearance, including pool, framing, opacity, effects, transition, and video behavior.

**Inline wallpaper — use global appearance** changes only the wallpaper file and keeps the global appearance. Inline rules do not use the global pool.

# Opacity exclusions

Opacity exclusions use the same match types but do not choose a wallpaper.

They can independently keep these at 100% opacity:

- **Pane background**
- **Pane & content**

Exclusions are **additive**: every matching enabled exclusion is evaluated. Veil supports up to **96 opacity exclusions**.

## Common mistakes

- `@theme`/time rule loses to a note rule → expected; adaptive rules are fallbacks.
- Wallpaper changes but effects do not → the rule is inline; use a Scene.
- Pool stops on an inline rule → expected; inline rules have no pool.
- Duplicate note names match the wrong note → use **Exact path**.
