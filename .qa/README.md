# Hero IDE QA System

## Directory Structure

```
.qa/
├── README.md              # This file
├── BUG_TEMPLATE.md        # Template for bug reports
├── bugs/                  # Individual bug reports from agents
│   ├── auth/              # Authentication bugs
│   ├── kanban/            # Kanban/Board bugs
│   ├── chat/              # Chat/AI bugs
│   ├── github/            # GitHub integration bugs
│   ├── agent/             # Agent execution bugs
│   ├── ui/                # UI/UX bugs
│   ├── performance/       # Performance bugs
│   └── security/          # Security bugs
├── reports/               # Agent session reports
│   └── {AGENT_ID}_report.md
└── consolidated/          # Consolidated analysis
    └── CONSOLIDATED_BUGS.md
```

## Bug Naming Convention

Files should be named: `{CATEGORY}/{BUG-ID}.md`

Example: `bugs/auth/BUG-AUTH-001.md`

## Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| **Critical** | System crash, data loss, security hole | Fix immediately |
| **High** | Feature completely broken | Fix this sprint |
| **Medium** | Feature partially broken, workaround exists | Fix next sprint |
| **Low** | Minor issue, cosmetic | Backlog |

## Agent Report Format

Each agent should create a report at `reports/{AGENT_ID}_report.md` with:

1. **Test Coverage Summary** - What was tested
2. **Bugs Found** - List of bug IDs with summaries
3. **Pass/Fail Summary** - What worked vs what didn't
4. **Recommendations** - Suggested improvements
5. **Time Spent** - Duration of testing session

## Consolidation Process

After all agents complete:

1. Collect all bugs from `bugs/` subdirectories
2. Deduplicate similar issues
3. Prioritize by severity and frequency
4. Create `consolidated/CONSOLIDATED_BUGS.md`
5. Update `docs/ATOMIC_ROADMAP.md` with new issues
