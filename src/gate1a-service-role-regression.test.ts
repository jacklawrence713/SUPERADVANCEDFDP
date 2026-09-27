import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GATE 1A: Service-Role Credential Exposure Prevention', () => {
  describe('Frontend Bundle Security', () => {
    it('should NOT expose VITE_SUPABASE_SERVICE_KEY in environment', () => {
      // Service key should never be in frontend environment
      const shouldNotIncludeServiceKey = !import.meta.env.VITE_SUPABASE_SERVICE_KEY;
      expect(shouldNotIncludeServiceKey).toBe(true);
    });
  });

  describe('Frontend Source Code', () => {
    it('should not reference VITE_SUPABASE_SERVICE_KEY in afdp.tsx', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).not.toContain('VITE_SUPABASE_SERVICE_KEY');
    });

    it('should reference safe VITE_ keys', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).toContain('VITE_SUPABASE_URL');
      expect(afdpContent).toContain('VITE_SUPABASE_ANON_KEY');
    });

    it('should not reference analyticsReadClient (removed in Gate 1A)', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).not.toContain('analyticsReadClient');
      expect(afdpContent).not.toContain('const SUPA_SVC');
    });
  });

  describe('GitHub Actions Workflow', () => {
    it('should not inject VITE_SUPABASE_SERVICE_KEY in deploy.yml', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'deploy.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      expect(workflowContent).not.toContain('VITE_SUPABASE_SERVICE_KEY');
    });

    it('should only inject safe VITE_ variables in deploy.yml', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'deploy.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      expect(workflowContent).toContain('VITE_SUPABASE_URL');
      expect(workflowContent).toContain('VITE_SUPABASE_ANON_KEY');
    });
  });

  describe('Edge Function Configuration', () => {
    it('should require verify_jwt=true for user-JWT functions', () => {
      const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
      const configContent = fs.readFileSync(configPath, 'utf-8');

      const userFunctions = [
        'send-email',
        'fetch-odds',
        'analyze-trade',
        'trade-quota-status',
        'create-checkout',
        'cancel-subscription'
      ];

      userFunctions.forEach(fn => {
        const pattern = `[functions.${fn}]`;
        expect(configContent).toContain(pattern);
        const fnSection = configContent.split(pattern)[1].split('[')[0];
        expect(fnSection).toContain('verify_jwt = true');
      });
    });
  });

  describe('Dead Code Removal', () => {
    it('should have removed analytics functions', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).not.toContain('loadPublicStats');
      expect(afdpContent).not.toContain('loadAnalyticsData');
      expect(afdpContent).not.toContain('analyticsReadClient');
    });

    it('should have removed analytics state variables', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).not.toContain('setAnalyticsData');
      expect(afdpContent).not.toContain('setPublicStats');
    });

    it('should have removed homepage trades metric display', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).not.toContain('publicStats.trades');
      expect(afdpContent).not.toContain('publicStats&&publicStats.trades>0');
    });
  });

  describe('Security Hardening', () => {
    it('should have email security hardening (Prompt 35)', () => {
      const sendEmailPath = path.join(process.cwd(), 'supabase', 'functions', 'send-email', 'index.ts');
      const sendEmailContent = fs.readFileSync(sendEmailPath, 'utf-8');
      expect(sendEmailContent).toContain('if (!authHeader)');
      expect(sendEmailContent).not.toContain('if (type !== "welcome")');
    });

    it('should use RLS with authenticated authClient', () => {
      const afdpPath = path.join(process.cwd(), 'afdp.tsx');
      const afdpContent = fs.readFileSync(afdpPath, 'utf-8');
      expect(afdpContent).toContain('authClient');
      expect(afdpContent).toContain('Bearer');
    });
  });
});
