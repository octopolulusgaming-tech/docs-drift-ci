# Pilot Adoption

This guide is for running Docs Drift in three real repos with the goal of learning, not just proving the idea.

## When Docs Drift fits well today

| Repo shape | Fit | Why |
|---|---|---|
| README-heavy repo with runnable examples | Strong | Easy to start with one snippet and one workflow |
| Repo with shell quickstarts | Strong | Shell assertions are simple and useful immediately |
| Repo with public or stable HTTP examples | Strong | `curl` verification catches drift that users notice fast |
| Repo with checked-in docs config | Strong | Keeps the team aligned on what should be verified |
| Repo with internal APIs and stable CI access | Good | Works if allowlist and private-network policy are explicit |

## When it does not fit well yet

| Repo shape | Why not yet |
|---|---|
| Docs with many brittle environment dependencies | First failures are noisy and hard to interpret |
| HTTP docs that depend on dynamic private DNS resolution | Policy does not inspect DNS resolution |
| Repos expecting full `curl` compatibility | `runner-http` is a controlled subset |
| Repos with lots of undocumented setup steps | The first week becomes setup archaeology instead of signal |

## Pilot checklist

Start with the smallest useful surface:

1. pick one README or one docs file
2. add one shell snippet or one HTTP snippet
3. commit `docs-drift.config.json`
4. keep HTTP allowlists explicit
5. enable the GitHub Action in CI
6. run the first verification locally
7. only expand after the first green run

## Rollout strategy

Recommended rollout:

1. verify a single snippet locally
2. get the Action green in CI
3. add one more docs file if the first signal is good
4. keep the config file small and reviewed
5. use CI overrides only when the environment truly differs

Avoid trying to verify the whole repo on day one.

## Repo suitability matrix

| Question | Good pilot sign | Bad pilot sign |
|---|---|---|
| README and docs have runnable examples? | Yes, a few clear snippets | No, docs are mostly prose |
| HTTP docs are public or stable? | Yes | They require hidden network paths |
| Team can edit docs and CI quickly? | Yes | Changes require a long release cycle |
| Docs config already exists or can be added? | Yes | Configuration is disputed or unowned |
| Team wants actionable drift detection? | Yes | Team wants a generic linter only |

## Success criteria

Use these as a lightweight rubric:

| Signal | Good pilot outcome |
|---|---|
| Time to first success | Under 30 minutes |
| Time to first CI run | Under 1 hour |
| Number of initial doc/config changes | 1 to 3 |
| Error clarity | Team can tell what failed without asking the author |
| False positives | Rare enough to not block adoption |
| User perception | “Useful, not noisy” |

## What to watch during the pilot

- whether people understand the allowlist and sandbox model quickly
- whether the first failure is readable
- whether the team can fix drift without changing the tool
- whether the Action works without custom glue
- whether the repo needs a broader docs cleanup before expanding coverage

## Expected first-integration issues

Expect a few of these in the first repo:

- host allowlist misses one real HTTP endpoint
- timeout is too low for a slow example
- `blockPrivateNetworks` is stricter than the local experiment setup
- the first snippet depends on a hidden setup step
- the example is valid but the surrounding docs are not yet stable enough

These are not failures of the pilot. They are useful signals.

## Sharp edges to tell pilots up front

- `runner-http` is a controlled subset of `curl`
- private-network policy applies only to literal IPs
- no DNS resolution is performed by the policy
- redirect semantics are intentionally minimal
- the repo-first / Action-first path is the supported beta route today

## How to judge pilot success

A pilot is successful if:

1. the team can run Docs Drift without the author sitting next to them
2. the first error messages are understandable
3. the team can configure CI with only small docs or config edits
4. the tool catches at least one real drift or gives clear confidence on a stable doc surface
5. the team can summarize the adoption in a short feedback report

If the pilot produced mostly setup friction with no useful signal, it is not ready to expand yet.

## Feedback handoff

When the pilot is done, use:

- bug/runtime reports for actual failures
- onboarding/DX reports for friction in setup or config
- pilot summary reports for outcome and next-step decisions

See:

- [docs/maintainers/v0.1.1-triage.md](../maintainers/v0.1.1-triage.md)
- [README.md](../../README.md)
