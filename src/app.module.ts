import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AnalyzeModule } from './modules/analyze/analyze.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'codescope',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module for Codescope code analysis',
  imports: [
    ConfigModule.forRoot(),
    AnalyzeModule,
    ReportModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

