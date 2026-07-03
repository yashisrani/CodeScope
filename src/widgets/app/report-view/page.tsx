'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ReportData {
  path: string;
  reportGenerated: boolean;
  html: string;
  summary: {
    totalFiles: number;
    totalLines: number;
    complexFunctions: number;
    securityIssues: number;
    deadCodeItems: number;
    circularDependencies: number;
    hotspots: number;
  };
}

export default function ReportView() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ReportData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading report...
      </div>
    );
  }

  if (!data.reportGenerated || !data.html) {
    return (
      <div style={{
        padding: '24px',
        background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
        borderRadius: '8px',
        color: theme === 'dark' ? '#e2e8f0' : '#000',
        textAlign: 'center',
      }}>
        <p>Failed to generate report</p>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#e2e8f0' : '#000',
      overflow: 'auto',
    }}>
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        padding: '16px',
        background: isDark ? '#1e293b' : '#f8fafc',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}>
        {/* Files Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Files
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#3b82f6',
            }}
          >
            {data.summary.totalFiles}
          </div>
        </div>

        {/* Lines Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Lines
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#3b82f6',
            }}
          >
            {data.summary.totalLines}
          </div>
        </div>

        {/* Complex Functions Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Complex Funcs
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#3b82f6',
            }}
          >
            {data.summary.complexFunctions}
          </div>
        </div>

        {/* Security Issues Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Security Issues
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: data.summary.securityIssues > 0 ? '#ef4444' : '#3b82f6',
            }}
          >
            {data.summary.securityIssues}
          </div>
        </div>

        {/* Dead Code Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Dead Code
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#3b82f6',
            }}
          >
            {data.summary.deadCodeItems}
          </div>
        </div>

        {/* Circular Dependencies Card */}
        <div
          style={{
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Circular Deps
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: data.summary.circularDependencies > 0 ? '#ef4444' : '#3b82f6',
            }}
          >
            {data.summary.circularDependencies}
          </div>
        </div>
      </div>

      {/* HTML Report Iframe */}
      <div style={{
        padding: '16px',
        height: 'calc(100% - 120px)',
        overflow: 'auto',
      }}>
        <iframe
          srcDoc={data.html}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px',
            background: isDark ? '#0f172a' : '#ffffff',
          }}
          title="Code Analysis Report"
        />
      </div>
    </div>
  );
}
