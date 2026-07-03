# Codescope

**Automated TypeScript/JavaScript code analysis powered by AST parsing.**

Codescope is an MCP (Model Context Protocol) server that analyzes project source code — not just vendored assets — and returns actionable metrics. It uses the TypeScript compiler API for AST-level analysis instead of regex, delivering accurate cyclomatic complexity, security auditing, dead code detection, circular dependency analysis, and more.

Built on [NitroStack](https://nitrostack.ai), Codescope exposes analysis results as MCP tools and renders interactive visualizations via built-in widgets.

---

## Features

### 1. Project Overview

**Tool:** `analyze-project`

Scans every source file and returns summary metrics:

- Total file count and lines of code
- Aggregate cyclomatic complexity
- Security issue count
- Dead code item count

### 2. Complexity Analysis

**Tool:** `find-complex-functions`

Walks the AST of each function body and counts real decision points (`if`, `for`, `while`, `switch`/`case`, `catch`, `&&`, `||`, ternary). Returns functions exceeding a configurable threshold, sorted by complexity.

- Configurable threshold (default: 5)
- Top 20 results by default
- Per-function scope — not per-file

### 3. Security Audit

**Tool:** `security-audit`

Identifies security vulnerabilities by inspecting AST node types:

| Pattern | Detection Method | Severity |
|---|---|---|
| Hardcoded secrets | Variable/PropertyAssignment with `StringLiteral` and secret-like key names | High |
| `eval()` calls | `CallExpression` with `eval` identifier | High |
| SQL injection via string concat | `BinaryExpression` with `+` containing SQL keywords | High |
| SQL injection via template literal | `TemplateExpression` containing SQL keywords | High |
| `innerHTML` assignment | `BinaryExpression` with `PropertyAccessExpression` on `innerHTML` | Medium |
| `debugger` statements | `DebuggerStatement` node | Low |

### 4. Dead Code Detection

**Tool:** `find-dead-code`

Four categories, all AST-based:

- **Unused exports** — exported declarations with no identifier references elsewhere in the file
- **Unused variables** — non-exported declarations with no downstream references
- **Unreachable code** — statements following `return`/`throw`/`break`/`continue` within the same block
- **Duplicate imports** — same module imported more than once in a file

### 5. Circular Dependency Detection

**Tool:** `detect-circular-dependencies`

Builds an import graph from AST-extracted import declarations and runs a DFS cycle detection algorithm.

- Configurable max search depth (default: 10)
- Deduplicates equivalent cycles
- Top 20 results by default

### 6. Hotspot Identification

**Tool:** `find-hotspots`

Ranks files by either AST-based complexity or line count, surfacing the most maintenance-intensive files first.

- Two metrics: `complexity` or `size`
- Top 20 results by default

### 7. Interactive Dependency Graph

**Tool:** `generate-dependency-graph`

Returns structured graph data and renders an interactive SVG widget.

- **Layered layout** — auto-arranges files by dependency depth
- **Pan & zoom** — drag to pan, scroll to zoom
- **Clickable nodes** — shows full path and complexity score
- **Color coding** — green (low) → yellow → orange → red (critical)
- **Widget** — `@Widget({ route: 'dependency-graph' })` renders the graph in NitroStudio

Also returns Mermaid.js markup for use in any Mermaid-compatible renderer.

### 8. HTML Analysis Report

**Tool:** `generate-html-report`

Aggregates all analysis tools into a single dark-themed HTML report with:

- Summary cards (files, LOC, complexity, security, dead code, circular deps)
- Detailed tables for complex functions, security issues, dead code, circular deps, hotspots
- Severity badges as color-coded labels
- Responsive layout

### 9. Code Health Score

**Tool:** `generate-code-health-score`

Runs all analysis tools and computes a weighted 0–100 health score with a letter grade (A–F) and ranked recommendations.

**Scoring breakdown:**

| Category | Max Points |
|---|---|
| Complexity (avg per file) | 25 |
| Security (issues found) | 25 |
| Dead code (items per file) | 20 |
| Circular dependencies (cycles) | 15 |
| Code quality (complex functions) | 15 |

No API key required — purely algorithmic.

---

## Tools Summary

| Tool | Module | Input | Output |
|---|---|---|---|
| `analyze-project` | analyze | `{ path }` | Project-level metrics |
| `find-complex-functions` | analyze | `{ path, threshold? }` | Functions sorted by complexity |
| `security-audit` | analyze | `{ path }` | Security issues with severity |
| `find-dead-code` | analyze | `{ path }` | Dead code items by category |
| `detect-circular-dependencies` | analyze | `{ path, maxDepth? }` | Circular import chains |
| `find-hotspots` | analyze | `{ path, metric }` | Files ranked by score |
| `generate-dependency-graph` | analyze | `{ path, maxNodes? }` | Mermaid.js + interactive widget |
| `generate-html-report` | report | `{ path }` | Full HTML report |
| `generate-code-health-score` | report | `{ path }` | Score, grade, recommendations |

---

## Accuracy

Codescope uses the TypeScript compiler API (`ts.createSourceFile`) for all code analysis. This means:

- **No regex false positives** — identifiers inside strings or comments are not mistaken for code
- **Per-function scope** — complexity is measured within each function body, not across entire files
- **AST node types** — security patterns are matched by actual syntax (`CallExpression`, `BinaryExpression`, etc.) rather than line-level patterns
- **Structured import graph** — imports are extracted from `ImportDeclaration` nodes and resolved using file-system-aware path resolution

Third-party/vendored code (static assets, minified bundles, `node_modules`) is automatically excluded from analysis.

---

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (STDIO transport)
npm run dev

# Production build
npm run build

# Production start
npm start
```

---

## Configuration

Transport is configured automatically based on `NODE_ENV`:

- **Development** (`NODE_ENV=development`): STDIO only
- **Production** (`NODE_ENV=production`): Dual transport (STDIO + HTTP SSE)

Environment variables are loaded from `.env` via `dotenv`.

---

## Project Structure

```
src/
├── index.ts                       # Entry point
├── app.module.ts                  # Root MCP module
├── shared/
│   └── ast-utils.ts               # TypeScript AST helpers
├── modules/
│   ├── analyze/
│   │   ├── analyze.module.ts      # Module definition
│   │   ├── analyze.tools.ts       # 7 analysis tools
│   │   ├── analyze.resources.ts   # MCP resources
│   │   └── analyze.prompts.ts     # MCP prompts
│   └── report/
│       ├── report.module.ts       # Module definition
│       ├── report.tools.ts        # Report generation tools
│       ├── report.resources.ts    # MCP resources
│       └── report.prompts.ts      # MCP prompts
├── health/
│   └── system.health.ts           # System health check
└── widgets/
    └── app/
        ├── layout.tsx             # Widget layout
        ├── report-view/
        │   └── page.tsx           # HTML report widget
        ├── dependency-graph/
        │   └── page.tsx           # Interactive graph widget
        └── calculator-result/
            └── page.tsx           # Calculator widget
```

---

## Dependencies

- `@nitrostack/core` — MCP framework with decorators and DI
- `@nitrostack/cli` — Build tooling
- `typescript` — Compiler API for AST parsing
- `zod` — Input schema validation
- `@nitrostack/widgets` — Widget SDK for interactive views
- `next`, `react`, `react-dom` — Widget rendering

---

## Links

- [NitroStack Documentation](https://docs.nitrostack.ai)
- [NitroStudio](https://nitrostack.ai/studio)
- [GitHub](https://github.com/nitrocloudofficial/nitrostack)
