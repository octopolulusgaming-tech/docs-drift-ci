# Basic Adoption Template

Copy this template into a target repository when you want the smallest useful Docs Drift setup.

## Included files

- [templates/basic/docs-drift.config.json](docs-drift.config.json)
- [templates/basic/docs/verified-examples.md](docs/verified-examples.md)
- [templates/basic/.github/workflows/docs-drift.yml](.github/workflows/docs-drift.yml)

## How to use it

1. Copy the three files into your repo.
2. Replace `your-org/docs-drift-ci` in the workflow with the published repository path for this project.
3. Adjust `http.allowHosts` in `docs-drift.config.json` to match the public hosts your docs really call.
4. Start with the shell snippet in `docs/verified-examples.md`.
5. Add HTTP snippets only after the first shell example is green.

## Recommended first commit

- keep the shell example as-is
- set `http.allowHosts` only if your repo already has HTTP examples
- keep CI overrides minimal

## Why this template is conservative

It is designed to avoid the most common first-week mistakes:

- adding too many snippets at once
- relying on implicit network access
- moving every knob into CI instead of checking config into the repo
- introducing HTTP examples before the team has one green local example

## Pilot-ready rollout

When you try Docs Drift in a real repo:

1. start with one docs file or one README section
2. commit a small `docs-drift.config.json`
3. enable the Action with defaults first
4. only add `http-allow-hosts` for hosts your verified snippets already use
5. expand to another docs file after the first green CI run

Pilot advice:

- do not try to verify the whole repo on day one
- keep the first example dependency-light
- use the feedback templates if something feels confusing
