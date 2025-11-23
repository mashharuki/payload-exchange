# Blueprint - Gold Truth Documentation

**Purpose**: Absolute source of truth for project architecture, patterns, and rules. These files are reviewed line-by-line and kept up-to-date.

## Structure

See `MANIFEST.md` for complete directory and last updated dates.

## Quick Start

1. **New to project?** Start with:
   - `00-core/quick-start.md` - Get running in 5 minutes
   - `00-core/project-structure.md` - Understand the codebase
   - `10-data/type-contracts.md` - **CRITICAL** - Type rules

2. **Working on features?** Check:
   - `30-api/api-conventions.md` - API patterns
   - `40-frontend/component-patterns.md` - Component rules
   - `20-auth/protected-routes.md` - Auth patterns

3. **Reviewing code?** Check:
   - `60-quality/code-review-checklist.md` - Pre-commit checks

## Maintenance
- **Naming**: start every file with a number (blueprint/00-core/00_project-structure.md, 30-api/30_something.md)
- **Update Frequency**: Critical files (10-data, 20-auth, 30-api) reviewed monthly. Others quarterly.
- **Update Trigger**: Update immediately when:
  - Database schema changes
  - New API patterns introduced
  - Breaking changes to core libraries
  - Critical bugs reveal missing rules
- **Size Limit**: No file should exceed 300 lines. Split if needed.

## How to Update

1. Make changes to relevant blueprint file
2. Update `MANIFEST.md` with new date
3. Update `AGENTS.md` if structure changed
4. Commit with message: `blueprint:update [file-name]`


## Related

- `/docs/` - Architecture docs pending review
- `/notes/` - Daily work notes
- `AGENTS.md` - AI agent context (includes blueprint directory)


