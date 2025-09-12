#!/usr/bin/env node
/**
 * Comprehensive Code Audit Script
 * Identifies unused imports, redundant comments, and optimization opportunities
 */

const fs = require("fs");
const path = require("path");

class CodeAuditor {
  constructor() {
    this.issues = [];
    this.optimizations = [];
    this.unusedImports = [];
    this.redundantComments = [];
  }

  log(type, message, file = null, line = null) {
    const entry = { type, message, file, line, timestamp: new Date().toISOString() };
    if (type === "UNUSED") {
      this.unusedImports.push(entry);
    } else if (type === "COMMENT") {
      this.redundantComments.push(entry);
    } else if (type === "OPTIMIZE") {
      this.optimizations.push(entry);
    } else {
      this.issues.push(entry);
    }
    console.log(`[${type}] ${message}${file ? ` (${file}${line ? `:${line}` : ""})` : ""}`);
  }

  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const relativePath = path.relative(process.cwd(), filePath);

    // Check for unused imports
    this.checkUnusedImports(content, relativePath);

    // Check for redundant comments
    this.checkRedundantComments(lines, relativePath);

    // Check for performance issues
    this.checkPerformanceIssues(content, relativePath);

    // Check for code smells
    this.checkCodeSmells(content, relativePath);
  }

  checkUnusedImports(content, filePath) {
    const importRegex =
      /import\s+(?:(?:\{[^}]*\})|(?:[^,\s]+))(?:\s*,\s*(?:\{[^}]*\}|[^,\s]+))*\s+from\s+['"][^'"]+['"];?/g;
    const imports = content.match(importRegex) || [];

    imports.forEach((importStatement) => {
      // Extract imported names
      const namedImportMatch = importStatement.match(/\{([^}]+)\}/);
      const defaultImportMatch = importStatement.match(/import\s+([^,\s{]+)/);

      if (namedImportMatch) {
        const namedImports = namedImportMatch[1].split(",").map((s) => s.trim().split(" as ")[0]);
        namedImports.forEach((importName) => {
          if (importName && !this.isImportUsed(content, importName, importStatement)) {
            this.log("UNUSED", `Named import '${importName}' appears unused`, filePath);
          }
        });
      }

      if (defaultImportMatch) {
        const defaultImport = defaultImportMatch[1];
        if (!this.isImportUsed(content, defaultImport, importStatement)) {
          this.log("UNUSED", `Default import '${defaultImport}' appears unused`, filePath);
        }
      }
    });
  }

  isImportUsed(content, importName, importStatement) {
    // Remove the import statement itself from content for checking
    const contentWithoutImport = content.replace(importStatement, "");

    // Check if import is used (basic check - could have false positives/negatives)
    const usageRegex = new RegExp(`\\b${importName}\\b`, "g");
    const matches = contentWithoutImport.match(usageRegex);

    return matches && matches.length > 0;
  }

  checkRedundantComments(lines, filePath) {
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines and non-comment lines
      if (
        !trimmedLine.startsWith("//") &&
        !trimmedLine.startsWith("/*") &&
        !trimmedLine.includes("*/")
      ) {
        return;
      }

      const lineNumber = index + 1;
      const nextLine = lines[index + 1]?.trim() || "";

      // Check for redundant comments that just repeat the code
      if (this.isRedundantComment(trimmedLine, nextLine)) {
        this.log("COMMENT", `Redundant comment: "${trimmedLine}"`, filePath, lineNumber);
      }

      // Check for TODO/FIXME comments
      if (trimmedLine.includes("TODO") || trimmedLine.includes("FIXME")) {
        this.log("OPTIMIZE", `Found TODO/FIXME: "${trimmedLine}"`, filePath, lineNumber);
      }
    });
  }

  isRedundantComment(comment, nextLine) {
    // Remove comment markers and clean up
    const cleanComment = comment
      .replace(/^\/\/\s*/, "")
      .replace(/^\/\*\s*/, "")
      .replace(/\*\/\s*$/, "")
      .toLowerCase();

    // Skip if it's a meaningful comment (contains explanation words)
    const meaningfulWords = [
      "because",
      "why",
      "note",
      "warning",
      "important",
      "todo",
      "fixme",
      "hack",
      "workaround",
    ];
    if (meaningfulWords.some((word) => cleanComment.includes(word))) {
      return false;
    }

    // Check if comment just repeats what the code does
    const codeWords = nextLine
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
    const commentWords = cleanComment.split(/[^a-z]+/).filter(Boolean);

    if (commentWords.length === 0) return false;

    // If more than 60% of comment words appear in the next line, it's likely redundant
    const overlap = commentWords.filter((word) => codeWords.includes(word)).length;
    return overlap / commentWords.length > 0.6;
  }

  checkPerformanceIssues(content, filePath) {
    // Check for potential performance issues

    // Large images without optimization
    if (content.includes("<img") && !content.includes("Image from")) {
      this.log("OPTIMIZE", "Consider using Next.js Image component for optimization", filePath);
    }

    // Inline styles (should use CSS modules or Tailwind)
    const inlineStyleMatches = content.match(/style\s*=\s*\{/g);
    if (inlineStyleMatches && inlineStyleMatches.length > 5) {
      this.log(
        "OPTIMIZE",
        `${inlineStyleMatches.length} inline styles found - consider CSS modules`,
        filePath
      );
    }

    // useEffect without dependencies
    if (
      content.includes("useEffect(") &&
      content.includes("useEffect(() => {") &&
      !content.includes(", []")
    ) {
      this.log(
        "OPTIMIZE",
        "useEffect without dependency array may cause performance issues",
        filePath
      );
    }

    // Large bundle imports
    if (content.includes("import * as")) {
      this.log("OPTIMIZE", "Wildcard import may increase bundle size", filePath);
    }
  }

  checkCodeSmells(content, filePath) {
    // Check for code smells

    // Console logs in production files
    const consoleMatches = content.match(/console\.(log|warn|error)/g);
    if (consoleMatches && !content.includes("NODE_ENV")) {
      this.log(
        "OPTIMIZE",
        `${consoleMatches.length} console statements found - add environment checks`,
        filePath
      );
    }

    // Hardcoded URLs
    const urlMatches = content.match(/https?:\/\/[^\s'"]+/g);
    if (urlMatches && urlMatches.length > 3) {
      this.log("OPTIMIZE", "Multiple hardcoded URLs - consider environment variables", filePath);
    }

    // Long files (>500 lines)
    const lineCount = content.split("\n").length;
    if (lineCount > 500) {
      this.log("OPTIMIZE", `Large file (${lineCount} lines) - consider splitting`, filePath);
    }

    // Duplicate code patterns
    const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=/g);
    if (functionMatches && functionMatches.length > 20) {
      this.log("OPTIMIZE", "Many functions in single file - consider refactoring", filePath);
    }
  }

  traverseDirectory(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
        this.traverseDirectory(filePath, extensions);
      } else if (extensions.some((ext) => file.endsWith(ext))) {
        this.analyzeFile(filePath);
      }
    });
  }

  generateReport() {
    console.log("\n📊 CODE AUDIT REPORT");
    console.log("====================");

    console.log(`\n🧹 Unused Imports: ${this.unusedImports.length}`);
    console.log(`💬 Redundant Comments: ${this.redundantComments.length}`);
    console.log(`⚡ Performance Issues: ${this.optimizations.length}`);
    console.log(`🔍 Other Issues: ${this.issues.length}`);

    if (this.unusedImports.length > 0) {
      console.log("\n🧹 UNUSED IMPORTS:");
      this.unusedImports.slice(0, 10).forEach((item) => {
        console.log(`  - ${item.message} (${item.file})`);
      });
      if (this.unusedImports.length > 10) {
        console.log(`  ... and ${this.unusedImports.length - 10} more`);
      }
    }

    if (this.redundantComments.length > 0) {
      console.log("\n💬 REDUNDANT COMMENTS:");
      this.redundantComments.slice(0, 5).forEach((item) => {
        console.log(`  - ${item.message} (${item.file}:${item.line})`);
      });
      if (this.redundantComments.length > 5) {
        console.log(`  ... and ${this.redundantComments.length - 5} more`);
      }
    }

    if (this.optimizations.length > 0) {
      console.log("\n⚡ OPTIMIZATION OPPORTUNITIES:");
      this.optimizations.slice(0, 10).forEach((item) => {
        console.log(`  - ${item.message} (${item.file})`);
      });
      if (this.optimizations.length > 10) {
        console.log(`  ... and ${this.optimizations.length - 10} more`);
      }
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        unusedImports: this.unusedImports.length,
        redundantComments: this.redundantComments.length,
        optimizations: this.optimizations.length,
        issues: this.issues.length,
      },
      details: {
        unusedImports: this.unusedImports,
        redundantComments: this.redundantComments,
        optimizations: this.optimizations,
        issues: this.issues,
      },
    };

    fs.writeFileSync("code-audit-report.json", JSON.stringify(report, null, 2));
    console.log("\n📄 Detailed report saved to code-audit-report.json");
  }

  run() {
    console.log("🔍 Starting comprehensive code audit...");

    // Analyze main source directories
    this.traverseDirectory("app");
    this.traverseDirectory("lib");
    this.traverseDirectory("components"); // if exists

    this.generateReport();
  }
}

// Run the audit
const auditor = new CodeAuditor();
auditor.run();
