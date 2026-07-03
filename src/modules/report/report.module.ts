import { Module } from '@nitrostack/core';
import { ReportTools } from './report.tools.js';
import { ReportResources } from './report.resources.js';
import { ReportPrompts } from './report.prompts.js';

@Module({
  name: 'report',
  description: 'Report generation module for creating comprehensive HTML analysis reports',
  controllers: [ReportTools, ReportResources, ReportPrompts],
})
export class ReportModule {}
