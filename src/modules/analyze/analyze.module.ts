import { Module } from '@nitrostack/core';
import { AnalyzeTools } from './analyze.tools.js';
import { AnalyzeResources } from './analyze.resources.js';
import { AnalyzePrompts } from './analyze.prompts.js';

@Module({
  name: 'analyze',
  description: 'Code analysis module providing tools for complexity, security, dead code, and dependency analysis',
  controllers: [AnalyzeTools, AnalyzeResources, AnalyzePrompts],
})
export class AnalyzeModule {}
