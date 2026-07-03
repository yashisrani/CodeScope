import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import {
  createSourceFile,
  isRelevantFile,
  calculateComplexity,
  extractFunctions,
  extractImports,
  findSecurityIssues,
  findDeadCode,
  extractImportGraph,
} from '../../shared/ast-utils.js';

@Injectable()
export class AnalyzeTools {
  @Tool({
    name: 'analyze-project',
    description: 'Analyze a TypeScript/JavaScript project and return overall metrics including file count, lines of code, complexity score, and security issues',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory to analyze'),
    }),
  })
  async analyzeProject(input: { path: string }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);

      if (!fs.existsSync(projectPath)) {
        return {
          error: `Path does not exist: ${input.path}`,
          files: 0, lines: 0, complexity: 0, securityIssues: 0, deadCodeItems: 0,
        } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      let totalLines = 0;
      let totalComplexity = 0;
      let securityIssues = 0;
      let deadCodeItems = 0;

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const lines = content.split('\n').length;
        totalLines += lines;

        const sourceFile = createSourceFile(file, content);

        const complexity = calculateComplexity(sourceFile);
        totalComplexity += complexity;

        const relPath = path.relative(projectPath, file);
        securityIssues += findSecurityIssues(content, sourceFile, relPath).length;
        deadCodeItems += findDeadCode(content, sourceFile, relPath).length;
      }

      return {
        path: input.path,
        files: tsJsFiles.length,
        lines: totalLines,
        complexity: totalComplexity,
        securityIssues,
        deadCodeItems,
        averageComplexity: tsJsFiles.length > 0
          ? parseFloat((totalComplexity / tsJsFiles.length).toFixed(2))
          : 0,
      } as any;
    } catch (error) {
      context.logger.error('Error analyzing project: ' + String(error));
      return { error: String(error), files: 0, lines: 0, complexity: 0, securityIssues: 0, deadCodeItems: 0 } as any;
    }
  }

  @Tool({
    name: 'find-complex-functions',
    description: 'Find functions with high cyclomatic complexity in a project',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
      threshold: z.number().optional().describe('Complexity threshold (default: 5)'),
    }),
  })
  async findComplexFunctions(input: { path: string; threshold?: number }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);
      const threshold = input.threshold || 5;

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, functions: [] } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const complexFunctions: Array<{
        file: string;
        name: string;
        complexity: number;
        line: number;
      }> = [];

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const sourceFile = createSourceFile(file, content);
        const functions = extractFunctions(sourceFile);

        for (const func of functions) {
          if (func.complexity >= threshold) {
            complexFunctions.push({
              file: path.relative(projectPath, file),
              name: func.name,
              complexity: func.complexity,
              line: func.line,
            });
          }
        }
      }

      complexFunctions.sort((a, b) => b.complexity - a.complexity);

      return {
        path: input.path,
        threshold,
        count: complexFunctions.length,
        functions: complexFunctions.slice(0, 20),
      } as any;
    } catch (error) {
      context.logger.error('Error finding complex functions: ' + String(error));
      return { error: String(error), functions: [] } as any;
    }
  }

  @Tool({
    name: 'security-audit',
    description: 'Audit a project for common security vulnerabilities including hardcoded secrets, eval usage, innerHTML, SQL injection risks, and debugger statements',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
    }),
  })
  async securityAudit(input: { path: string }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, issues: [] } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const allIssues: Array<{
        file: string;
        line: number;
        type: string;
        severity: 'high' | 'medium' | 'low';
        description: string;
      }> = [];

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const sourceFile = createSourceFile(file, content);
        const relPath = path.relative(projectPath, file);
        const issues = findSecurityIssues(content, sourceFile, relPath);
        allIssues.push(...issues);
      }

      return {
        path: input.path,
        totalIssues: allIssues.length,
        highSeverity: allIssues.filter(i => i.severity === 'high').length,
        mediumSeverity: allIssues.filter(i => i.severity === 'medium').length,
        lowSeverity: allIssues.filter(i => i.severity === 'low').length,
        issues: allIssues.slice(0, 50),
      } as any;
    } catch (error) {
      context.logger.error('Error in security audit: ' + String(error));
      return { error: String(error), issues: [] } as any;
    }
  }

  @Tool({
    name: 'find-dead-code',
    description: 'Find dead code including unused exports, unreachable code, unused variables, and duplicate imports',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
    }),
  })
  async findDeadCode(input: { path: string }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, items: [] } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const allItems: Array<{
        file: string;
        line: number;
        type: 'unused-export' | 'unreachable-code' | 'unused-variable' | 'duplicate-import';
        name: string;
      }> = [];

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const sourceFile = createSourceFile(file, content);
        const relPath = path.relative(projectPath, file);
        const items = findDeadCode(content, sourceFile, relPath);
        allItems.push(...items);
      }

      return {
        path: input.path,
        totalItems: allItems.length,
        unusedExports: allItems.filter(i => i.type === 'unused-export').length,
        unreachableCode: allItems.filter(i => i.type === 'unreachable-code').length,
        unusedVariables: allItems.filter(i => i.type === 'unused-variable').length,
        duplicateImports: allItems.filter(i => i.type === 'duplicate-import').length,
        items: allItems.slice(0, 50),
      } as any;
    } catch (error) {
      context.logger.error('Error finding dead code: ' + String(error));
      return { error: String(error), items: [] } as any;
    }
  }

  @Tool({
    name: 'detect-circular-dependencies',
    description: 'Detect circular dependencies in a project using depth-first search',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
      maxDepth: z.number().optional().describe('Maximum depth for cycle detection (default: 10)'),
    }),
  })
  async detectCircularDependencies(input: { path: string; maxDepth?: number }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);
      const maxDepth = input.maxDepth || 10;

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, cycles: [] } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const importGraph = new Map<string, Set<string>>();

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const relPath = path.relative(projectPath, file);
        const sourceFile = createSourceFile(file, content);
        const graphEntry = extractImportGraph(sourceFile, relPath);

        if (!importGraph.has(graphEntry.file)) {
          importGraph.set(graphEntry.file, new Set());
        }

        for (const imp of graphEntry.imports) {
          const resolvedPath = this.resolveImportPath(imp, path.dirname(file), projectPath);
          if (resolvedPath) {
            importGraph.get(graphEntry.file)!.add(path.relative(projectPath, resolvedPath));
          }
        }
      }

      const cycles: Array<{ cycle: string[]; length: number }> = [];
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const dfs = (node: string, pathStack: string[], depth: number): void => {
        if (depth > maxDepth) return;

        visited.add(node);
        recursionStack.add(node);
        pathStack.push(node);

        const neighbors = importGraph.get(node) || new Set();

        for (const neighbor of neighbors) {
          if (recursionStack.has(neighbor)) {
            const cycleStart = pathStack.indexOf(neighbor);
            const cycle = pathStack.slice(cycleStart).concat([neighbor]);
            cycles.push({ cycle, length: cycle.length });
          } else if (!visited.has(neighbor)) {
            dfs(neighbor, [...pathStack], depth + 1);
          }
        }

        recursionStack.delete(node);
      };

      for (const node of importGraph.keys()) {
        if (!visited.has(node)) {
          dfs(node, [], 0);
        }
      }

      const uniqueCycles = Array.from(new Map(
        cycles.map(c => [c.cycle.join('->'), c])
      ).values());

      return {
        path: input.path,
        totalCycles: uniqueCycles.length,
        cycles: uniqueCycles.slice(0, 20),
      } as any;
    } catch (error) {
      context.logger.error('Error detecting circular dependencies: ' + String(error));
      return { error: String(error), cycles: [] } as any;
    }
  }

  @Tool({
    name: 'find-hotspots',
    description: 'Find hotspots in a project ranked by complexity or file size',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
      metric: z.enum(['complexity', 'size']).describe('Metric to rank by: complexity or size'),
    }),
  })
  async findHotspots(input: { path: string; metric: 'complexity' | 'size' }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, hotspots: [] } as any;
      }

      const files = this.getAllFiles(projectPath);
      const tsJsFiles = files.filter(f => isRelevantFile(f));

      const fileContents = await Promise.all(
        tsJsFiles.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const hotspots: Array<{
        file: string;
        score: number;
        details: { lines?: number; complexity?: number; functions?: number };
      }> = [];

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const lines = content.split('\n').length;
        const sourceFile = createSourceFile(file, content);
        const complexity = calculateComplexity(sourceFile);
        const functions = extractFunctions(sourceFile).length;

        let score = 0;
        const details: any = {};

        if (input.metric === 'complexity') {
          score = complexity;
          details.complexity = complexity;
          details.lines = lines;
          details.functions = functions;
        } else {
          score = lines;
          details.lines = lines;
          details.complexity = complexity;
          details.functions = functions;
        }

        hotspots.push({
          file: path.relative(projectPath, file),
          score,
          details,
        });
      }

      hotspots.sort((a, b) => b.score - a.score);

      return {
        path: input.path,
        metric: input.metric,
        totalFiles: hotspots.length,
        hotspots: hotspots.slice(0, 20),
      } as any;
    } catch (error) {
      context.logger.error('Error finding hotspots: ' + String(error));
      return { error: String(error), hotspots: [] } as any;
    }
  }

  @Tool({
    name: 'generate-dependency-graph',
    description: 'Generate an interactive dependency graph showing file relationships color-coded by complexity',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory'),
      maxNodes: z.number().optional().describe('Maximum nodes to include (default: 30)'),
    }),
  })
  @Widget({ route: 'dependency-graph' })
  async generateDependencyGraph(input: { path: string; maxNodes?: number }, context: ExecutionContext) {
    try {
      const projectPath = this.resolvePath(input.path);
      const maxNodes = input.maxNodes || 30;

      if (!fs.existsSync(projectPath)) {
        return { error: `Path does not exist: ${input.path}`, mermaid: '', nodes: 0, edges: 0, graphData: { nodes: [], edges: [] } } as any;
      }

      const files = this.getAllFiles(projectPath);
      const fileContents = await Promise.all(
        files.map(async (file) => {
          try {
            return { file, content: await fs.promises.readFile(file, 'utf-8') };
          } catch {
            return { file, content: '' };
          }
        })
      );

      const nodeData = new Map<string, { complexity: number; imports: string[] }>();
      const nodeIds = new Map<string, string>();
      const edgeSet = new Set<string>();
      let idCounter = 0;

      for (const { file, content } of fileContents) {
        if (!content) continue;
        const relPath = path.relative(projectPath, file);
        const sourceFile = createSourceFile(file, content);
        const complexity = calculateComplexity(sourceFile);
        const imports = extractImports(sourceFile).filter(i => i.startsWith('.'));
        nodeData.set(relPath, { complexity, imports });
        nodeIds.set(relPath, `n${idCounter++}`);
      }

      const sortedNodes = [...nodeData.entries()].sort((a, b) => b[1].complexity - a[1].complexity);
      const topNodes = new Set(sortedNodes.slice(0, maxNodes).map(([k]) => k));
      const topNodeList = [...topNodes];

      for (const [file, data] of nodeData) {
        if (!topNodes.has(file)) continue;
        for (const imp of data.imports) {
          const resolvedPath = this.resolveImportPath(imp, path.join(projectPath, path.dirname(file)), projectPath);
          if (resolvedPath) {
            const resolvedRel = path.relative(projectPath, resolvedPath);
            if (nodeData.has(resolvedRel) && topNodes.has(resolvedRel)) {
              const edgeKey = `${file}->${resolvedRel}`;
              edgeSet.add(edgeKey);
            }
          }
        }
      }

      let mermaid = 'graph TD\n';
      for (const file of topNodeList) {
        const id = nodeIds.get(file)!;
        const label = file.replace(/"/g, "'");
        mermaid += `    ${id}["${label}"]\n`;
      }
      for (const edge of edgeSet) {
        const [from, to] = edge.split('->');
        mermaid += `    ${nodeIds.get(from)} --> ${nodeIds.get(to)}\n`;
      }
      for (const file of topNodeList) {
        const id = nodeIds.get(file)!;
        const complexity = nodeData.get(file)!.complexity;
        let fill: string;
        if (complexity < 10) fill = '#d5f5e3';
        else if (complexity < 30) fill = '#fef9e7';
        else if (complexity < 50) fill = '#fdebd0';
        else fill = '#fadbd8';
        const stroke = complexity < 10 ? '#27ae60' : complexity < 30 ? '#f39c12' : '#c0392b';
        mermaid += `    style ${id} fill:${fill},stroke:${stroke},stroke-width:2px\n`;
      }

      const graphNodes = topNodeList.map(file => ({
        id: nodeIds.get(file),
        label: file,
        complexity: nodeData.get(file)!.complexity,
      }));
      const graphEdges = [...edgeSet].map(edge => {
        const [from, to] = edge.split('->');
        return { from: nodeIds.get(from), to: nodeIds.get(to) };
      });

      return { mermaid, nodes: topNodeList.length, edges: edgeSet.size, graphData: { nodes: graphNodes, edges: graphEdges } } as any;
    } catch (error) {
      context.logger.error('Error generating dependency graph: ' + String(error));
      return { error: String(error), mermaid: '', nodes: 0, edges: 0, graphData: { nodes: [], edges: [] } } as any;
    }
  }

  private resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    return path.resolve(process.cwd(), inputPath);
  }

  private readonly IGNORE_DIRS = new Set([
    'node_modules', 'dist', '.git', '.next', 'build', 'coverage',
    'static', 'assets', 'vendor', 'third_party', 'public', 'uploads',
    '.cache', '.temp', 'tmp',
  ]);

  private readonly MINIFIED_THRESHOLD = 300 * 1024; // 300KB

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.getAllFiles(fullPath));
        } else if (this.shouldIncludeFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Silently skip inaccessible directories
    }
    return files;
  }

  private shouldIncludeFile(filePath: string): boolean {
    if (!isRelevantFile(filePath)) return false;
    if (/\.min\.(js|ts|jsx|tsx)$/.test(filePath)) return false;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > this.MINIFIED_THRESHOLD) {
        const firstChunk = Buffer.alloc(4096);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, firstChunk, 0, 4096, 0);
        fs.closeSync(fd);
        const content = firstChunk.toString('utf-8');
        const newlines = content.split('\n').length;
        if (newlines <= 3 && stat.size > 100 * 1024) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private resolveImportPath(importPath: string, fromDir: string, projectRoot: string): string | null {
    if (!importPath.startsWith('.')) return null;
    const resolved = path.resolve(fromDir, importPath);

    try {
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isFile()) return resolved;
        for (const indexFile of ['/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
          const fullPath = resolved + indexFile;
          if (fs.existsSync(fullPath)) return fullPath;
        }
      }
    } catch {
      // fall through
    }

    if (importPath.endsWith('.js')) {
      const tsPath = resolved.slice(0, -3) + '.ts';
      try { if (fs.existsSync(tsPath)) return tsPath; } catch {}
    }

    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
      const fullPath = resolved + ext;
      try {
        if (fs.existsSync(fullPath)) return fullPath;
      } catch {}
    }

    return null;
  }
}
