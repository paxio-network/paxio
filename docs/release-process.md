# Release Process

Paxio monorepo uses **Changesets** for per-package versioning and a tag-triggered release workflow (`release-tools.yml`) that fans out to npm + JSR + PyPI + crates.io + GitHub Releases.

## Semver policy

- `0.0.*` — placeholder releases (reserve names, do not use)
- `0.1.*-alpha.*` — Phase 0 alpha (no API stability)
- `0.1.*-beta.*` — Phase 1 beta (API may change with minor bumps)
- `0.1.*` stable — first feature-complete release of each SDK
- `1.0.0` — public launch. API stable under semver (major = breaking).

**All Paxio packages ship the same version in lockstep** until each graduates to independent versioning (post-launch).

## Local release flow

```bash
# 1. Make your change in feature branch, land on dev as usual.
#
# 2. On dev, describe the change:
pnpm changeset
# Interactive — select packages + version bump (patch/minor/major) + summary.
# Creates .changeset/<random-name>.md. Commit this.
#
# 3. When ready to release, bump versions:
pnpm changeset version
# Updates all affected package.json versions + consolidates CHANGELOGs.
#
# 4. Commit bumps, push to main, tag:
git add .
git commit -m "release: v0.1.0-alpha.0"
git push origin main
git tag v0.1.0-alpha.0
git push origin v0.1.0-alpha.0
#
# 5. GitHub Actions (release-tools.yml) triggers on tag:
#    - builds CLI binaries (5 platforms)
#    - publishes @paxio/* to npm
#    - publishes @paxio/sdk to JSR via OIDC
#    - publishes paxio-sdk to PyPI
#    - publishes paxio-cli to crates.io
#    - creates GitHub Release with binaries + checksums
#    - runs smoke tests (pip install, npm install)
```

## Version consistency check

`release-tools.yml` has a `verify-versions` job that FAILS if the git tag doesn't match all package.json / Cargo.toml versions. This prevents releasing a tag where versions drift.

Mirrors the pattern in `complior/.github/workflows/release.yml`.

## Rollback a bad release

npm:
```bash
npm unpublish @paxio/sdk@0.1.0-alpha.5 --registry https://registry.npmjs.org
# Only works within 72 hours. After that, publish a new patch.
```

PyPI:
```bash
# Can't unpublish. Yank instead:
uv tool run twine upload --skip-existing  # (can't delete, only replace)
# Or use PyPI web UI → Manage → Yank (hides from `pip install`, users still get warning)
```

crates.io:
```bash
cargo yank --vers 0.1.0-alpha.5
# Reverse: cargo yank --vers 0.1.0-alpha.5 --undo
```

JSR:
Deprecate via dashboard; cannot delete.

GitHub Release:
```bash
gh release delete v0.1.0-alpha.5 --yes
```

## Placeholder versions (reserve name only)

On 2026-04-22, `paxio-sdk` 0.0.1a0 was uploaded to PyPI to reserve the name. Do not increment this number — the first real release will be `0.1.0-alpha.0` (skipping 0.0.*).

Same pattern for other registries once org tokens are ready:
- npm `@paxio/sdk` 0.0.1 — reserve name, non-functional
- JSR `@paxio/sdk` placeholder — already done
- crates.io `paxio-cli` 0.0.1 — reserve name, panics on invocation

## GitHub PR release notes

`release-tools.yml` uses `softprops/action-gh-release@v2` with `generate_release_notes: true` — pulls PR titles + authors automatically from commits since previous tag.

For manual polish, edit the release on GitHub dashboard after it's created.
