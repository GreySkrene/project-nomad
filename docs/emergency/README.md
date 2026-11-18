# Emergency Profile Documentation

This directory contains the measured reports and test evidence behind the
[Family Emergency Library Profile](../../EMERGENCY_LIBRARY_PROFILE.md).

- [Setup report](NOMAD_SETUP_REPORT.md) — installed services, storage, content,
  verified limitations, and remaining offline tests.
- [Completion plan](NOMAD_COMPLETION_PLAN.md) — resumable checklist and current
  project state.
- [Resource manifest](RESOURCE_MANIFEST.csv) — what was selected, why, source
  or publisher, date, storage estimate, and integration status.
- [AI/RAG acceptance report](NOMAD_ACCEPTANCE_TEST_REPORT.md) — evidence for
  keeping source search ahead of generated safety instructions.
- [UI audit](NOMAD_UI_AUDIT.md) — design investigation that led to the Night
  Operations + Field Manual interface.
- [Emergency prompt](NOMAD_EMERGENCY_SYSTEM_PROMPT.md) and
  [safety prompt](NOMAD_SAFETY_PROMPT.md) — retained for reproducibility; prompt
  rules alone did not make the tested small models safe enough.
- [`evidence/`](evidence/) — raw fixed-query model outputs used by the acceptance
  report.
- [`images/`](images/) — final interface screenshots used by public docs.

Downloaded PDFs, ZIMs, maps, Kolibri channels, database files, and credentials
are intentionally excluded from Git.
