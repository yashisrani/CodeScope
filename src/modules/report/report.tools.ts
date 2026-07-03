import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';
import { AnalyzeTools } from '../analyze/analyze.tools.js';

/**
 * Report Tools
 * 
 * Generates comprehensive HTML reports aggregating findings from all 7 analysis tools
 */
@Injectable({ deps: [AnalyzeTools] })
export class ReportTools {
  constructor(private analyzeTools: AnalyzeTools) {}

  /**
   * Generate HTML Report
   * Aggregates findings from all 7 analysis tools and generates a comprehensive HTML report
   */
  @Tool({
    name: 'generate-html-report',
    description: 'Generate a comprehensive HTML report aggregating findings from all 7 analysis tools: analyze-project, find-complex-functions, security-audit, find-dead-code, detect-circular-dependencies, and find-hotspots',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory to analyze'),
    }),
  })
  @Widget({ route: 'report-view' })
  async generateHtmlReport(input: { path: string }, context: ExecutionContext) {
    try {
      // Call all 7 analysis tools
      const projectAnalysis = await this.analyzeTools.analyzeProject({ path: input.path }, context);
      const complexFunctions = await this.analyzeTools.findComplexFunctions({ path: input.path, threshold: 5 }, context);
      const securityAudit = await this.analyzeTools.securityAudit({ path: input.path }, context);
      const deadCode = await this.analyzeTools.findDeadCode({ path: input.path }, context);
      const circularDeps = await this.analyzeTools.detectCircularDependencies({ path: input.path }, context);
      const hotspots = await this.analyzeTools.findHotspots({ path: input.path, metric: 'complexity' }, context);

      // Generate HTML report
      const htmlReport = this.generateReportHTML({
        path: input.path,
        projectAnalysis: projectAnalysis as any,
        complexFunctions: complexFunctions as any,
        securityAudit: securityAudit as any,
        deadCode: deadCode as any,
        circularDeps: circularDeps as any,
        hotspots: hotspots as any,
      });

      return {
        path: input.path,
        reportGenerated: true,
        html: htmlReport,
        summary: {
          totalFiles: (projectAnalysis as any).files || 0,
          totalLines: (projectAnalysis as any).lines || 0,
          complexFunctions: (complexFunctions as any).count || 0,
          securityIssues: (securityAudit as any).totalIssues || 0,
          deadCodeItems: (deadCode as any).totalItems || 0,
          circularDependencies: (circularDeps as any).totalCycles || 0,
          hotspots: (hotspots as any).totalFiles || 0,
        },
      } as any;
    } catch (error) {
      context.logger.error('Error generating HTML report: ' + String(error));
      return {
        error: String(error),
        reportGenerated: false,
        html: '',
      } as any;
    }
  }

  private generateReportHTML(data: {
    path: string;
    projectAnalysis: any;
    complexFunctions: any;
    securityAudit: any;
    deadCode: any;
    circularDeps: any;
    hotspots: any;
  }): string {
    const timestamp = new Date().toISOString();
    const projectAnalysis = data.projectAnalysis || {};
    const complexFunctions = data.complexFunctions || {};
    const securityAudit = data.securityAudit || {};
    const deadCode = data.deadCode || {};
    const circularDeps = data.circularDeps || {};
    const hotspots = data.hotspots || {};

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codescope - Code Analysis Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            margin-bottom: 3rem;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 2rem;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            color: #3b82f6;
        }
        
        .subtitle {
            color: #94a3b8;
            font-size: 1rem;
        }
        
        .timestamp {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 1rem;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        
        .summary-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 1.5rem;
            transition: all 0.3s ease;
        }
        
        .summary-card:hover {
            border-color: #3b82f6;
            background: #1e293b;
        }
        
        .summary-card-label {
            color: #94a3b8;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        
        .summary-card-value {
            font-size: 2rem;
            font-weight: bold;
            color: #3b82f6;
        }
        
        .section {
            margin-bottom: 3rem;
        }
        
        h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            color: #e2e8f0;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 0.75rem;
        }
        
        .chart-container {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            gap: 1rem;
            height: 200px;
            margin-bottom: 1rem;
        }
        
        .bar {
            flex: 1;
            background: linear-gradient(to top, #3b82f6, #60a5fa);
            border-radius: 0.25rem 0.25rem 0 0;
            position: relative;
            min-height: 20px;
        }
        
        .bar-label {
            position: absolute;
            bottom: -1.5rem;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.75rem;
            color: #94a3b8;
        }
        
        .bar-value {
            position: absolute;
            top: -1.5rem;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.875rem;
            font-weight: bold;
            color: #3b82f6;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            overflow: hidden;
        }
        
        thead {
            background: #0f172a;
            border-bottom: 2px solid #334155;
        }
        
        th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }
        
        td {
            padding: 1rem;
            border-bottom: 1px solid #334155;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        tr:hover {
            background: #0f172a;
        }
        
        .severity-high {
            color: #ef4444;
            font-weight: 600;
        }
        
        .severity-medium {
            color: #f59e0b;
            font-weight: 600;
        }
        
        .severity-low {
            color: #10b981;
            font-weight: 600;
        }
        
        .code {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 0.25rem;
            padding: 0.25rem 0.5rem;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            color: #60a5fa;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: #64748b;
        }
        
        .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #334155;
        }
        
        .metric-row:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #94a3b8;
        }
        
        .metric-value {
            font-weight: 600;
            color: #3b82f6;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .badge-high {
            background: #7f1d1d;
            color: #fca5a5;
        }
        
        .badge-medium {
            background: #78350f;
            color: #fcd34d;
        }
        
        .badge-low {
            background: #064e3b;
            color: #86efac;
        }
        
        .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #1e293b;
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Codescope Analysis Report</h1>
            <p class="subtitle">Comprehensive code quality and security analysis</p>
            <p class="timestamp">Generated: ${timestamp}</p>
            <p class="timestamp">Project: <code class="code">${this.escapeHtml(data.path)}</code></p>
        </header>
        
        <!-- Summary Cards -->
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-card-label">Total Files</div>
                <div class="summary-card-value">${projectAnalysis.files || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-label">Lines of Code</div>
                <div class="summary-card-value">${(projectAnalysis.lines || 0).toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-label">Complexity Score</div>
                <div class="summary-card-value">${projectAnalysis.complexity || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-label">Security Issues</div>
                <div class="summary-card-value" style="color: ${(securityAudit.totalIssues || 0) > 0 ? '#ef4444' : '#10b981'}">${securityAudit.totalIssues || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-label">Dead Code Items</div>
                <div class="summary-card-value">${deadCode.totalItems || 0}</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-label">Circular Dependencies</div>
                <div class="summary-card-value" style="color: ${(circularDeps.totalCycles || 0) > 0 ? '#ef4444' : '#10b981'}">${circularDeps.totalCycles || 0}</div>
            </div>
        </div>
        
        <!-- Project Metrics -->
        <section class="section">
            <h2>📈 Project Metrics</h2>
            <div class="chart-container">
                <div class="metric-row">
                    <span class="metric-label">Total Files</span>
                    <span class="metric-value">${projectAnalysis.files || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Lines of Code</span>
                    <span class="metric-value">${(projectAnalysis.lines || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Total Complexity</span>
                    <span class="metric-value">${projectAnalysis.complexity || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Average Complexity per File</span>
                    <span class="metric-value">${projectAnalysis.averageComplexity || 0}</span>
                </div>
            </div>
        </section>
        
        <!-- Complex Functions -->
        <section class="section">
            <h2>🔴 Complex Functions (Top 20)</h2>
            ${this.renderComplexFunctionsTable(complexFunctions)}
        </section>
        
        <!-- Security Audit -->
        <section class="section">
            <h2>🔒 Security Audit Results</h2>
            <div class="chart-container">
                <div class="metric-row">
                    <span class="metric-label">Total Issues</span>
                    <span class="metric-value">${securityAudit.totalIssues || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label"><span class="badge badge-high">High</span></span>
                    <span class="metric-value">${securityAudit.highSeverity || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label"><span class="badge badge-medium">Medium</span></span>
                    <span class="metric-value">${securityAudit.mediumSeverity || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label"><span class="badge badge-low">Low</span></span>
                    <span class="metric-value">${securityAudit.lowSeverity || 0}</span>
                </div>
            </div>
            ${this.renderSecurityIssuesTable(securityAudit)}
        </section>
        
        <!-- Dead Code -->
        <section class="section">
            <h2>💀 Dead Code Analysis</h2>
            <div class="chart-container">
                <div class="metric-row">
                    <span class="metric-label">Total Items</span>
                    <span class="metric-value">${deadCode.totalItems || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Unused Exports</span>
                    <span class="metric-value">${deadCode.unusedExports || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Unreachable Code</span>
                    <span class="metric-value">${deadCode.unreachableCode || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Unused Variables</span>
                    <span class="metric-value">${deadCode.unusedVariables || 0}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Duplicate Imports</span>
                    <span class="metric-value">${deadCode.duplicateImports || 0}</span>
                </div>
            </div>
            ${this.renderDeadCodeTable(deadCode)}
        </section>
        
        <!-- Circular Dependencies -->
        <section class="section">
            <h2>🔄 Circular Dependencies</h2>
            <div class="chart-container">
                <div class="metric-row">
                    <span class="metric-label">Total Cycles Found</span>
                    <span class="metric-value">${circularDeps.totalCycles || 0}</span>
                </div>
            </div>
            ${this.renderCircularDepsTable(circularDeps)}
        </section>
        
        <!-- Hotspots -->
        <section class="section">
            <h2>🔥 Complexity Hotspots (Top 20)</h2>
            ${this.renderHotspotsTable(hotspots)}
        </section>
        
        <footer class="footer">
            <p>Generated by Codescope - Code Analysis Tool</p>
            <p>For more information, visit <a href="https://codescope.dev" style="color: #3b82f6;">codescope.dev</a></p>
        </footer>
    </div>
</body>
</html>`;
  }

  private renderComplexFunctionsTable(data: any): string {
    const functions = data.functions || [];
    
    if (functions.length === 0) {
      return '<div class="empty-state">No complex functions found. Great job! 🎉</div>';
    }
    
    return `<table>
      <thead>
        <tr>
          <th>File</th>
          <th>Function</th>
          <th>Complexity</th>
          <th>Line</th>
        </tr>
      </thead>
      <tbody>
        ${functions.map((f: any) => `
          <tr>
            <td><code class="code">${this.escapeHtml(f.file)}</code></td>
            <td>${this.escapeHtml(f.name)}</td>
            <td><strong style="color: ${f.complexity > 10 ? '#ef4444' : f.complexity > 5 ? '#f59e0b' : '#10b981'}">${f.complexity}</strong></td>
            <td>${f.line}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  private renderSecurityIssuesTable(data: any): string {
    const issues = data.issues || [];
    
    if (issues.length === 0) {
      return '<div class="empty-state">No security issues found. Excellent! 🔒</div>';
    }
    
    return `<table>
      <thead>
        <tr>
          <th>File</th>
          <th>Line</th>
          <th>Type</th>
          <th>Severity</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map((i: any) => `
          <tr>
            <td><code class="code">${this.escapeHtml(i.file)}</code></td>
            <td>${i.line}</td>
            <td><code class="code">${this.escapeHtml(i.type)}</code></td>
            <td><span class="severity-${i.severity}">${i.severity.toUpperCase()}</span></td>
            <td>${this.escapeHtml(i.description)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  private renderDeadCodeTable(data: any): string {
    const items = data.items || [];
    
    if (items.length === 0) {
      return '<div class="empty-state">No dead code found. Clean code! ✨</div>';
    }
    
    return `<table>
      <thead>
        <tr>
          <th>File</th>
          <th>Line</th>
          <th>Type</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((i: any) => `
          <tr>
            <td><code class="code">${this.escapeHtml(i.file)}</code></td>
            <td>${i.line}</td>
            <td><code class="code">${this.escapeHtml(i.type)}</code></td>
            <td>${this.escapeHtml(i.name)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  private renderCircularDepsTable(data: any): string {
    const cycles = data.cycles || [];
    
    if (cycles.length === 0) {
      return '<div class="empty-state">No circular dependencies found. Great architecture! 🏗️</div>';
    }
    
    return `<table>
      <thead>
        <tr>
          <th>Cycle</th>
          <th>Length</th>
        </tr>
      </thead>
      <tbody>
        ${cycles.map((c: any) => `
          <tr>
            <td><code class="code">${this.escapeHtml(c.cycle.join(' → '))}</code></td>
            <td>${c.length}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  private renderHotspotsTable(data: any): string {
    const hotspots = data.hotspots || [];
    
    if (hotspots.length === 0) {
      return '<div class="empty-state">No hotspots found. Well-balanced codebase! ⚖️</div>';
    }
    
    return `<table>
      <thead>
        <tr>
          <th>File</th>
          <th>Complexity</th>
          <th>Lines</th>
          <th>Functions</th>
        </tr>
      </thead>
      <tbody>
        ${hotspots.map((h: any) => `
          <tr>
            <td><code class="code">${this.escapeHtml(h.file)}</code></td>
            <td><strong style="color: ${h.details.complexity > 50 ? '#ef4444' : h.details.complexity > 20 ? '#f59e0b' : '#10b981'}">${h.details.complexity}</strong></td>
            <td>${h.details.lines}</td>
            <td>${h.details.functions}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  @Tool({
    name: 'generate-code-health-score',
    description: 'Compute an overall 0-100 code health score with letter grade and ranked recommendations',
    inputSchema: z.object({
      path: z.string().describe('Path to the project directory to analyze'),
    }),
  })
  async generateCodeHealthScore(input: { path: string }, context: ExecutionContext) {
    try {
      const projectAnalysis = await this.analyzeTools.analyzeProject({ path: input.path }, context);
      const complexFunctions = await this.analyzeTools.findComplexFunctions({ path: input.path, threshold: 10 }, context);
      const securityAudit = await this.analyzeTools.securityAudit({ path: input.path }, context);
      const deadCode = await this.analyzeTools.findDeadCode({ path: input.path }, context);
      const circularDeps = await this.analyzeTools.detectCircularDependencies({ path: input.path }, context);

      const pa = projectAnalysis as any;
      const cf = complexFunctions as any;
      const sa = securityAudit as any;
      const dc = deadCode as any;
      const cd = circularDeps as any;

      const totalFiles = pa.files || 1;
      const avgComplexity = pa.averageComplexity || 0;
      const securityIssues = sa.totalIssues || 0;
      const deadCodeItems = dc.totalItems || 0;
      const circularDepCycles = cd.totalCycles || 0;
      const complexFuncCount = cf.count || 0;

      let complexityScore = 25;
      if (avgComplexity > 50) complexityScore = 5;
      else if (avgComplexity > 20) complexityScore = 10;
      else if (avgComplexity > 10) complexityScore = 15;
      else if (avgComplexity > 5) complexityScore = 20;

      let securityScore = 25;
      if (securityIssues === 0) securityScore = 25;
      else if (sa.lowSeverity === securityIssues) securityScore = 20;
      else if (sa.highSeverity > 0) securityScore = Math.max(5, 25 - securityIssues * 2);
      else securityScore = Math.max(10, 25 - securityIssues);

      const deadCodePenalty = Math.min(deadCodeItems / totalFiles, 1);
      const deadCodeScore = Math.max(5, Math.round(20 * (1 - deadCodePenalty)));

      const circularPenalty = Math.min(circularDepCycles / totalFiles, 1);
      const circularScore = circularDepCycles === 0 ? 15 : Math.max(3, Math.round(15 * (1 - circularPenalty)));

      const complexPenalty = Math.min(complexFuncCount / totalFiles, 1);
      const qualityScore = Math.max(3, Math.round(15 * (1 - complexPenalty)));

      const score = complexityScore + securityScore + deadCodeScore + circularScore + qualityScore;

      let grade: string;
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'F';

      const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; message: string }> = [];
      if (securityIssues > 0) {
        recommendations.push({ priority: 'high', message: `Fix ${securityIssues} security issue${securityIssues > 1 ? 's' : ''} (highest priority)` });
      }
      if (circularDepCycles > 0) {
        recommendations.push({ priority: 'high', message: `Refactor ${circularDepCycles} circular dependenc${circularDepCycles > 1 ? 'ies' : 'y'}` });
      }
      if (avgComplexity > 10) {
        recommendations.push({ priority: 'medium', message: `Average complexity ${avgComplexity} is high. Consider breaking down complex files` });
      }
      if (complexFuncCount > 0) {
        recommendations.push({ priority: 'medium', message: `Refactor ${complexFuncCount} complex function${complexFuncCount > 1 ? 's' : ''} with high cyclomatic complexity` });
      }
      if (deadCodeItems > 0) {
        recommendations.push({ priority: 'low', message: `Remove ${deadCodeItems} dead code item${deadCodeItems > 1 ? 's' : ''}` });
      }
      if (score >= 90) {
        recommendations.push({ priority: 'low', message: 'Great shape! Focus on maintaining code quality' });
      }

      return {
        path: input.path,
        score,
        grade,
        breakdown: {
          complexity: { score: complexityScore, max: 25, detail: `Average complexity: ${avgComplexity}` },
          security: { score: securityScore, max: 25, detail: `${securityIssues} issue${securityIssues !== 1 ? 's' : ''}` },
          deadCode: { score: deadCodeScore, max: 20, detail: `${deadCodeItems} item${deadCodeItems !== 1 ? 's' : ''}` },
          circularDependencies: { score: circularScore, max: 15, detail: `${circularDepCycles} cycle${circularDepCycles !== 1 ? 's' : ''}` },
          codeQuality: { score: qualityScore, max: 15, detail: `${complexFuncCount} complex function${complexFuncCount !== 1 ? 's' : ''}` },
        },
        recommendations,
      } as any;
    } catch (error) {
      context.logger.error('Error generating code health score: ' + String(error));
      return { error: String(error), score: 0, grade: 'N/A', recommendations: [] } as any;
    }
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
