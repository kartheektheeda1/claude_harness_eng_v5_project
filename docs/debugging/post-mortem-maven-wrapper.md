# Post-Mortem: Maven Command Unavailable on Windows

## Symptom

The project verification command failed before compilation because `mvn` was not recognized in the Windows terminal.

## Environment-First Diagnosis

The failure was not treated as a product-code defect. The repository depended on a globally installed Maven executable, while the workstation did not expose Maven on `PATH`.

## Resolution

The Maven Wrapper was added and verification changed to `mvnw.cmd` on Windows and `./mvnw` on Unix. This pins the build tool, removes a workstation-specific prerequisite, and makes local and CI execution consistent.

## Prevention Encoded

- Root scripts call the wrapper rather than global Maven.
- CI uses the checked-in wrapper.
- README troubleshooting distinguishes tool bootstrap failures from test failures.
- Harness verification commands use platform-aware wrapper selection.
