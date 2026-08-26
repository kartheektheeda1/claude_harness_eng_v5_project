# Backend Verification and Coverage Baseline

Command: `./mvnw verify` (Windows: `.\mvnw.cmd verify`)

The verified baseline contains 45 JUnit tests across 12 test classes. JaCoCo analyzed 46 application classes and enforced the build thresholds configured in `pom.xml`.

| Metric | Verified result | Enforced minimum |
|---|---:|---:|
| Instruction coverage | 88.72% | Reported |
| Line coverage | 88.63% | 80% |
| Branch coverage | 70.07% | 60% |
| Test failures | 0 | 0 |
| Test errors | 0 | 0 |

Machine-readable `jacoco.xml` and `jacoco.csv` are committed beside this summary and regenerated from the verified backend gate. Ephemeral Maven build output remains excluded from version control.
