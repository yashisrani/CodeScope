import ts from 'typescript';

export interface FunctionInfo {
  name: string;
  line: number;
  complexity: number;
}

export interface SecurityIssue {
  file: string;
  line: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface DeadCodeItem {
  file: string;
  line: number;
  type: 'unused-export' | 'unreachable-code' | 'unused-variable' | 'duplicate-import';
  name: string;
}

export function createSourceFile(fileName: string, content: string): ts.SourceFile {
  let kind = ts.ScriptKind.TS;
  if (fileName.endsWith('.tsx')) kind = ts.ScriptKind.TSX;
  else if (fileName.endsWith('.jsx')) kind = ts.ScriptKind.JSX;
  else if (fileName.endsWith('.js')) kind = ts.ScriptKind.JS;
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, kind);
}

export function isRelevantFile(fileName: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(fileName);
}

export function getLineForNode(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

export function calculateComplexity(root: ts.Node): number {
  let complexity = 1;
  function visit(node: ts.Node) {
    if (ts.isIfStatement(node)) {
      complexity++;
    } else if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node)
    ) {
      complexity++;
    } else if (ts.isCaseClause(node)) {
      complexity++;
    } else if (ts.isCatchClause(node)) {
      complexity++;
    } else if (ts.isConditionalExpression(node)) {
      complexity++;
    } else if (ts.isBinaryExpression(node)) {
      if (
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken
      ) {
        complexity++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return complexity;
}

export function extractFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      functions.push({
        name: node.name.text,
        line: getLineForNode(node, sourceFile),
        complexity: calculateComplexity(node.body),
      });
    } else if (ts.isMethodDeclaration(node) && node.name && node.body) {
      const name = ts.isIdentifier(node.name) ? node.name.text : sourceFile.text.slice(node.name.pos, node.name.end);
      functions.push({
        name,
        line: getLineForNode(node, sourceFile),
        complexity: calculateComplexity(node.body),
      });
    } else if (ts.isArrowFunction(node) && node.body) {
      const funcName = findAssignedName(node, sourceFile);
      if (funcName) {
        functions.push({
          name: funcName,
          line: getLineForNode(node, sourceFile),
          complexity: ts.isBlock(node.body) ? calculateComplexity(node.body) : calculateComplexity(node),
        });
      }
    } else if (ts.isFunctionExpression(node) && node.body) {
      const funcName = node.name ? node.name.text : findAssignedName(node, sourceFile);
      if (funcName) {
        functions.push({
          name: funcName,
          line: getLineForNode(node, sourceFile),
          complexity: calculateComplexity(node.body),
        });
      }
    } else if (ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
      if (node.name && node.body) {
        const name = ts.isIdentifier(node.name) ? node.name.text : 'accessor';
        functions.push({
          name: `${ts.isGetAccessor(node) ? 'get' : 'set'} ${name}`,
          line: getLineForNode(node, sourceFile),
          complexity: calculateComplexity(node.body),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return functions;
}

function findAssignedName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (!node.parent) return null;
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  if (ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  if (ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    if (ts.isIdentifier(node.parent.left)) {
      return node.parent.left.text;
    }
  }
  return null;
}

export function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      imports.push(stmt.moduleSpecifier.text);
    }
  }
  return imports;
}

export interface ImportGraphEntry {
  file: string;
  imports: string[];
}

export function extractImportGraph(sourceFile: ts.SourceFile, relativePath: string): ImportGraphEntry {
  return {
    file: relativePath,
    imports: extractImports(sourceFile),
  };
}

export function findSecurityIssues(content: string, sourceFile: ts.SourceFile, relativePath: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = content.split('\n');
  function visit(node: ts.Node) {
    const lineNum = getLineForNode(node, sourceFile);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
      issues.push({ file: relativePath, line: lineNum, type: 'eval-usage', severity: 'high', description: 'Use of eval() is a security risk' });
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'innerHTML') {
        issues.push({ file: relativePath, line: lineNum, type: 'innerHTML-usage', severity: 'medium', description: 'innerHTML assignment can lead to XSS vulnerabilities' });
      }
    } else if (ts.isDebuggerStatement(node)) {
      issues.push({ file: relativePath, line: lineNum, type: 'debugger-statement', severity: 'low', description: 'Debugger statement left in code' });
    } else if (ts.isVariableDeclaration(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      if (ts.isIdentifier(node.name)) {
        const name = node.name.text.toLowerCase();
        const secretPatterns = ['password', 'api_key', 'apikey', 'api-key', 'secret', 'token', 'private_key', 'privatekey', 'access_key', 'accesskey'];
        if (secretPatterns.some(p => name.includes(p))) {
          issues.push({ file: relativePath, line: lineNum, type: 'hardcoded-secret', severity: 'high', description: `Potential hardcoded secret: ${node.name.text}` });
        }
      }
    } else if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      if (ts.isIdentifier(node.name)) {
        const name = node.name.text.toLowerCase();
        const secretPatterns = ['password', 'api_key', 'apikey', 'api-key', 'secret', 'token', 'private_key', 'privatekey', 'access_key', 'accesskey'];
        if (secretPatterns.some(p => name.includes(p))) {
          issues.push({ file: relativePath, line: lineNum, type: 'hardcoded-secret', severity: 'high', description: `Potential hardcoded secret: ${node.name.text}` });
        }
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const text = node.getText().toLowerCase();
      if (/select|insert|update|delete/i.test(text)) {
        issues.push({ file: relativePath, line: lineNum, type: 'sql-injection-risk', severity: 'high', description: 'Potential SQL injection via string concatenation' });
      }
    }
    if (ts.isTemplateExpression(node)) {
      const text = sourceFile.text.slice(node.pos, node.end).toLowerCase();
      if (/select|insert|update|delete/i.test(text)) {
        issues.push({ file: relativePath, line: getLineForNode(node, sourceFile), type: 'sql-injection-risk', severity: 'high', description: 'Potential SQL injection via template literal' });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return issues;
}

export function findDeadCode(content: string, sourceFile: ts.SourceFile, relativePath: string): DeadCodeItem[] {
  const items: DeadCodeItem[] = [];
  const lines = content.split('\n');
  const allIdentifiers = collectAllIdentifiers(sourceFile);
  function visit(node: ts.Node, insideFunction = false) {
    const lineNum = getLineForNode(node, sourceFile);
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      if (!isNameReferencedElsewhere(node.name.text, node.name.getStart(), allIdentifiers)) {
        items.push({ file: relativePath, line: lineNum, type: 'unused-export', name: node.name.text });
      }
    } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && !isNameReferencedElsewhere(decl.name.text, decl.name.getStart(), allIdentifiers)) {
          items.push({ file: relativePath, line: getLineForNode(decl, sourceFile), type: 'unused-export', name: decl.name.text });
        }
      }
    } else if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      if (!isNameReferencedElsewhere(node.name.text, node.name.getStart(), allIdentifiers)) {
        items.push({ file: relativePath, line: lineNum, type: 'unused-export', name: node.name.text });
      }
    } else if (ts.isVariableDeclaration(node) && !insideFunction && ts.isIdentifier(node.name)) {
      const parentStmt = findParentVariableStatement(node);
      if (!parentStmt || !hasExportModifier(parentStmt)) {
        if (!isNameReferencedElsewhere(node.name.text, node.name.getStart(), allIdentifiers)) {
          items.push({ file: relativePath, line: lineNum, type: 'unused-variable', name: node.name.text });
        }
      }
    }
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isModuleBlock(node) ||
        (ts.isCaseClause(node)) || (ts.isDefaultClause(node))) {
      const stmts = getStatements(node);
      for (let i = 0; i < stmts.length - 1; i++) {
        const stmt = stmts[i];
        const nextStmt = stmts[i + 1];
        if (isUnconditionalJump(stmt) && nextStmt) {
          if (!ts.isCaseClause(nextStmt) && !ts.isDefaultClause(nextStmt)) {
            items.push({ file: relativePath, line: getLineForNode(nextStmt, sourceFile), type: 'unreachable-code', name: 'unreachable statement' });
          }
        }
      }
    }
    const nowInside = insideFunction || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node) || ts.isFunctionExpression(node);
    ts.forEachChild(node, (child) => visit(child, nowInside));
  }
  const duplicateImports = findDuplicateImports(sourceFile, relativePath);
  items.push(...duplicateImports);
  visit(sourceFile);
  return items;
}

function hasExportModifier(node: ts.Node): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    if (modifiers) {
      return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    }
  }
  return false;
}

function isUnconditionalJump(node: ts.Node): boolean {
  if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) return true;
  if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
    if (!(node.label)) return true;
  }
  return false;
}

function getStatements(node: ts.Node): readonly ts.Statement[] {
  if (ts.isBlock(node)) return node.statements;
  if (ts.isSourceFile(node)) return node.statements;
  if (ts.isModuleBlock(node)) return node.statements;
  if (ts.isCaseClause(node)) return node.statements;
  if (ts.isDefaultClause(node)) return node.statements;
  return [];
}

function findParentVariableStatement(node: ts.Node): ts.VariableStatement | null {
  let current = node.parent;
  while (current) {
    if (ts.isVariableStatement(current)) return current;
    if (ts.isSourceFile(current) || ts.isBlock(current) || ts.isModuleBlock(current)) return null;
    current = current.parent;
  }
  return null;
}

function collectAllIdentifiers(sourceFile: ts.SourceFile): Map<string, number[]> {
  const identifiers = new Map<string, number[]>();
  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      const existing = identifiers.get(node.text) || [];
      existing.push(node.getStart());
      identifiers.set(node.text, existing);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return identifiers;
}

function isNameReferencedElsewhere(name: string, declStart: number, allIdentifiers: Map<string, number[]>): boolean {
  const positions = allIdentifiers.get(name);
  if (!positions) return false;
  if (positions.length === 0) return false;
  if (positions.length === 1 && positions[0] === declStart) return false;
  for (const pos of positions) {
    if (pos !== declStart) return true;
  }
  return false;
}

function findDuplicateImports(sourceFile: ts.SourceFile, relativePath: string): DeadCodeItem[] {
  const items: DeadCodeItem[] = [];
  const seenModules = new Map<string, number>();
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const modulePath = stmt.moduleSpecifier.text;
      const lineNum = getLineForNode(stmt, sourceFile);
      if (seenModules.has(modulePath)) {
        items.push({ file: relativePath, line: lineNum, type: 'duplicate-import', name: modulePath });
      } else {
        seenModules.set(modulePath, lineNum);
      }
    }
  }
  return items;
}
