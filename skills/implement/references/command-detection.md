# Command detection (step 3)

Find four commands: **unit test**, **integration test**, **lint** and **vet/typecheck**. Do not hard-code a language. Run the cascade for each command. The first match is the result. Print the found set, so that the user can see what the engine will run. The user can change it in the settings.

## Cascade (first match wins)

1. **Settings override.** A non-empty `cmd_test_unit` / `cmd_test_integration` / `cmd_lint` / `cmd_vet` in `.claude/sdd.local.md` stops the cascade. This is the escape hatch for unusual repos.
2. **Architecture-map frontmatter.** If `docs/architecture-map.md` exists and its frontmatter has a non-empty `test_cmd` / `lint_cmd`, use it. `survey` recorded these values from what the repo really uses. `""` means unknown. In that case, go to the next step for that command.
3. **Makefile targets.** If a `Makefile` exists, grep its targets. Use this convention:
   - `test` / `test-unit` → unit.
   - `test-integration` / `integration` / `test-e2e` → integration.
   - `lint` → lint.
   - `vet` / `typecheck` / `check` → vet.
   - A `Makefile` target has priority over a raw tool, because it contains the wiring of the repo (flags, build tags, env).
4. **`package.json` scripts.** If the file exists, read `scripts`:
   - `test` / `test:unit` → unit.
   - `test:integration` / `test:e2e` → integration.
   - `lint` → lint.
   - `typecheck` / `tsc` → vet.
   - Run them with the package manager of the repo. Detect `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json`.
5. **Language manifests.** This is the broad fallback. Select the toolchain that the manifest shows:
   - `go.mod` → unit `go test ./...`; integration `go test -tags=integration ./...`; vet `go vet ./...`; lint `golangci-lint run` (if installed).
   - `Cargo.toml` → `cargo test` / `cargo test -- --ignored` / `cargo clippy` / `cargo check`.
   - `pyproject.toml` / `setup.cfg` → `pytest` / `pytest -m integration` / `ruff check` (or `flake8`) / `mypy`.
   - `pom.xml` / `build.gradle` → `mvn test` / `mvn verify` / (checkstyle/spotless) / `mvn -q compile`.
   - `composer.json` → `vendor/bin/phpunit` (or the `scripts.test` entry) / the tagged integration suite of the repo / `vendor/bin/phpcs` or `php-cs-fixer` / `vendor/bin/phpstan` or `psalm` (the one that is configured).
   - `Gemfile` → `bundle exec rspec` / `bundle exec rspec --tag integration` / `rubocop` / (no conventional typecheck — skip).
   - `*.csproj` / `*.sln` → `dotnet test` / `dotnet test --filter <integration category>` / `dotnet format --verify-no-changes` / `dotnet build`.
   - Any other manifest → there is no convention that you can trust. **Ask the user for the commands.** Offer to save them to `.claude/sdd.local.md`. Never guess.
6. **Integration tier — Docker probe.** The integration command can come from any step. Before you trust it, make sure that a Docker daemon is reachable (`docker info` succeeds). Most integration suites start an ephemeral dependency (testcontainers-style). Give the probe result to `require_integration` (see [`settings.md`](./settings.md)):
   - `auto` → run if reachable, else NON-red.
   - `always` → BLOCK if unreachable.
   - `never` → skip.

## Reporting

After detection, print a block like this:

```
detected commands:
  unit         = make test
  integration  = make test-integration   (docker: reachable)
  lint         = golangci-lint run        (binary: present)
  vet          = make vet
```

If the engine cannot find a command:

- Lint or vet is missing → skip that gate with a one-line warning. Do not fail the run.
- Unit is missing → **stop**. TDD must have a unit runner.
- Integration is missing → `require_integration` controls the result.

## Notes

- Detection is read-only. Never install tools. If `golangci-lint` (or a different linter) is not on PATH, record this and skip lint locally. CI can enforce it.
- Keep the found set in a cache for the full run. Do not detect again for each task.
