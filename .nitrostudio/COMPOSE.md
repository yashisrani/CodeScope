---
status: building
updatedAt: 2026-07-03T09:18:05.770Z
sessionId: cmps_1782992651499_qx10021
---

# Goal
Update the plan to include these 3 missing tools:

1. find-dead-code
   Input: { path: string }
   Output: Array of { file, line, type, name }
   Detect: unused exports, unreachable code after return/throw/break, unused variables, duplicate imports

2. detect-circular-dependencies
   Input: { path: string, maxDepth?: number }
   Output: Array of { cycle: string[], length: number }
   Build import graph from all JS/TS files, use DFS with recursion stack to find cycles

3. find-hotspots
   Input: { path: string, metric: "complexity" | "si

# Plan
**Project name**: `codescope`

**Elevator pitch**
Analy

# Build checklist
- [ ] Create analy
- [x] Create analy
- [x] Smoke test analy
- [x] Run full conversation test flow
- [x] Fix test cases to match actual tool architecture

# Progress notes
_No notes yet._
