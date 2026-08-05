import {
  RISK_WEIGHTS,
  composeRisk,
  severityOf,
  piiSensitivity,
  findingSeverity,
} from './severity';

describe('severity model (§5.1)', () => {
  it('weights satisfy the Σwᵢ = 1 invariant', () => {
    const sum = RISK_WEIGHTS.base + RISK_WEIGHTS.pii + RISK_WEIGHTS.prominence;
    expect(sum).toBeCloseTo(1, 9);
  });

  it('composeRisk always stays within [0,1]', () => {
    expect(composeRisk({ base: 0, pii: 0, prominence: 0 })).toBe(0);
    expect(composeRisk({ base: 1, pii: 1, prominence: 1 })).toBe(1);
    // Out-of-range inputs are clamped.
    expect(composeRisk({ base: 5, pii: -3, prominence: 2 })).toBeLessThanOrEqual(1);
  });

  it('maps the threshold boundaries exactly', () => {
    expect(severityOf(0.85)).toBe('critical');
    expect(severityOf(0.849)).toBe('high');
    expect(severityOf(0.65)).toBe('high');
    expect(severityOf(0.64)).toBe('medium');
    expect(severityOf(0.4)).toBe('medium');
    expect(severityOf(0.39)).toBe('low');
    expect(severityOf(0)).toBe('low');
  });

  it('raises PII sensitivity as more identifiers are exposed', () => {
    const none = piiSensitivity({ hasEmail: false, hasPhone: false, hasAddress: false });
    const all = piiSensitivity({ hasEmail: true, hasPhone: true, hasAddress: true });
    expect(none).toBe(0);
    expect(all).toBe(1);
  });

  it('classifies a high-signal PII finding as high/critical', () => {
    const { severity } = findingSeverity({
      riskScore: 0.9,
      confidence: 0.9,
      hasEmail: true,
      hasPhone: true,
      hasAddress: true,
    });
    expect(['high', 'critical']).toContain(severity);
  });

  it('classifies a weak, PII-free finding as low', () => {
    const { severity } = findingSeverity({
      riskScore: 0.2,
      confidence: 0.3,
      hasEmail: false,
      hasPhone: false,
      hasAddress: false,
    });
    expect(severity).toBe('low');
  });
});
