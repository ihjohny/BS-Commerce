# Project Rules & Persistent Memory

## Strict Execution Constraints

1. **No Auto-Deployment to VPS**:
   - Do NOT deploy, sync, or trigger any deployment commands on the remote VPS (`10.112.185.133` or any remote server) without an explicit, direct command from the user.

2. **No Unprompted Git Commits**:
   - Do NOT run `git commit` or commit any code changes unless the user explicitly commands to do so.
   - All code edits must remain local working-tree changes until explicit commit instructions are provided.
