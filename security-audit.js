#!/usr/bin/env node
/**
 * Comprehensive Security Audit Script
 * Run this before going live to ensure security best practices
 */

const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(type, message, file = null) {
    const entry = { type, message, file, timestamp: new Date().toISOString() };
    if (type === 'ERROR') {
      this.issues.push(entry);
    } else if (type === 'WARNING') {
      this.warnings.push(entry);
    } else {
      this.passed.push(entry);
    }
    console.log(`[${type}] ${message}${file ? ` (${file})` : ''}`);
  }

  checkPackageJson() {
    console.log('\n🔍 Checking package.json security...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for known vulnerable packages
      const vulnerablePackages = ['lodash', 'moment', 'request'];
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      vulnerablePackages.forEach(pkg => {
        if (dependencies[pkg]) {
          this.log('WARNING', `Consider replacing ${pkg} with safer alternatives`);
        }
      });

      // Check Next.js version
      const nextVersion = dependencies['next'];
      if (nextVersion && !nextVersion.includes('14.2.32')) {
        this.log('WARNING', `Next.js version ${nextVersion} - ensure it's patched for security vulnerabilities`);
      } else {
        this.log('PASS', 'Next.js version is secure (14.2.32)');
      }

      this.log('PASS', 'package.json security check completed');
    } catch (error) {
      this.log('ERROR', 'Failed to read package.json', error.message);
    }
  }

  checkEnvironmentFiles() {
    console.log('\n🔍 Checking environment file security...');
    
    const envFiles = ['.env', '.env.local', '.env.production'];
    let hasEnvFiles = false;

    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        hasEnvFiles = true;
        this.log('WARNING', `Environment file ${file} detected - ensure it's in .gitignore`);
        
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('sk_test_') || content.includes('pk_test_')) {
            this.log('WARNING', 'Test Stripe keys detected - ensure production uses live keys', file);
          }
          if (content.includes('localhost')) {
            this.log('WARNING', 'Localhost URLs detected - update for production', file);
          }
        } catch (error) {
          this.log('ERROR', `Cannot read ${file}`, error.message);
        }
      }
    });

    if (!hasEnvFiles) {
      this.log('WARNING', 'No environment files found - ensure environment variables are properly configured');
    }
  }

  checkApiRoutes() {
    console.log('\n🔍 Checking API route security...');
    
    const apiDir = 'app/api';
    if (!fs.existsSync(apiDir)) {
      this.log('WARNING', 'No API routes found');
      return;
    }

    const checkApiFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      // Check for rate limiting
      if (!content.includes('rate') && !content.includes('limit')) {
        this.log('WARNING', 'No rate limiting detected', relativePath);
      } else {
        this.log('PASS', 'Rate limiting implemented', relativePath);
      }

      // Check for input validation
      if (!content.includes('sanitize') && !content.includes('validate')) {
        this.log('WARNING', 'No input validation detected', relativePath);
      } else {
        this.log('PASS', 'Input validation implemented', relativePath);
      }

      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        this.log('WARNING', 'No proper error handling detected', relativePath);
      } else {
        this.log('PASS', 'Error handling implemented', relativePath);
      }

      // Check for origin validation
      if (content.includes('checkout') || content.includes('payment')) {
        if (!content.includes('origin')) {
          this.log('WARNING', 'No origin validation for payment routes', relativePath);
        } else {
          this.log('PASS', 'Origin validation implemented', relativePath);
        }
      }
    };

    const traverseDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          traverseDir(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          checkApiFile(filePath);
        }
      });
    };

    traverseDir(apiDir);
  }

  checkSecurityHeaders() {
    console.log('\n🔍 Checking security headers configuration...');
    
    // Check next.config.js
    const nextConfigPath = 'next.config.js';
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      
      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Content-Security-Policy'
      ];

      requiredHeaders.forEach(header => {
        if (content.includes(header)) {
          this.log('PASS', `${header} configured`, nextConfigPath);
        } else {
          this.log('WARNING', `${header} not configured`, nextConfigPath);
        }
      });
    } else {
      this.log('WARNING', 'next.config.js not found - security headers may not be configured');
    }

    // Check middleware
    const middlewarePath = 'middleware.ts';
    if (fs.existsSync(middlewarePath)) {
      this.log('PASS', 'Middleware file found', middlewarePath);
      const content = fs.readFileSync(middlewarePath, 'utf8');
      if (content.includes('security') || content.includes('headers')) {
        this.log('PASS', 'Security middleware implemented', middlewarePath);
      }
    } else {
      this.log('WARNING', 'No middleware.ts found - consider adding security middleware');
    }
  }

  checkGitIgnore() {
    console.log('\n🔍 Checking .gitignore security...');
    
    const gitignorePath = '.gitignore';
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      
      const requiredPatterns = ['.env', '.env.local', 'node_modules'];
      requiredPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          this.log('PASS', `${pattern} is ignored`, gitignorePath);
        } else {
          this.log('ERROR', `${pattern} should be in .gitignore`, gitignorePath);
        }
      });
    } else {
      this.log('ERROR', '.gitignore file not found');
    }
  }

  checkClientSideCode() {
    console.log('\n🔍 Checking client-side code security...');
    
    const checkClientFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      // Check for exposed secrets
      if (content.includes('sk_') && !content.includes('NEXT_PUBLIC')) {
        this.log('ERROR', 'Potential secret key exposed in client code', relativePath);
      }

      // Check for console.log in production builds
      if (content.includes('console.log') && !content.includes('development')) {
        this.log('WARNING', 'console.log found - consider removing for production', relativePath);
      }

      // Check for eval or dangerous functions
      if (content.includes('eval(') || content.includes('Function(')) {
        this.log('ERROR', 'Dangerous function usage detected', relativePath);
      }
    };

    const traverseDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          traverseDir(filePath);
        } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.endsWith('.d.ts')) {
          checkClientFile(filePath);
        }
      });
    };

    traverseDir('app');
  }

  generateReport() {
    console.log('\n📊 SECURITY AUDIT REPORT');
    console.log('========================');
    
    console.log(`\n✅ Passed Checks: ${this.passed.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Critical Issues: ${this.issues.length}`);

    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES TO FIX:');
      this.issues.forEach(issue => {
        console.log(`  - ${issue.message}${issue.file ? ` (${issue.file})` : ''}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS TO REVIEW:');
      this.warnings.forEach(warning => {
        console.log(`  - ${warning.message}${warning.file ? ` (${warning.file})` : ''}`);
      });
    }

    console.log('\n🎯 DEPLOYMENT READINESS:');
    if (this.issues.length === 0) {
      console.log('✅ Ready for production deployment');
    } else {
      console.log('❌ Fix critical issues before deploying');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.passed.length,
        warnings: this.warnings.length,
        critical: this.issues.length
      },
      issues: this.issues,
      warnings: this.warnings,
      passed: this.passed
    };

    fs.writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to security-audit-report.json');
  }

  run() {
    console.log('🔐 Starting comprehensive security audit...');
    
    this.checkPackageJson();
    this.checkEnvironmentFiles();
    this.checkApiRoutes();
    this.checkSecurityHeaders();
    this.checkGitIgnore();
    this.checkClientSideCode();
    
    this.generateReport();
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.run();
