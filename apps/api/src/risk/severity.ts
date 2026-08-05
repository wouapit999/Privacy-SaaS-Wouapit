/**
 * Deterministic risk composition + severity mapping (BLT-Vanish §5.1).
 *
 * Risk = w₁·U + w₂·M + w₃·R, with Σwᵢ = 1 and wᵢ ∈ [0,1], which guarantees
 * Risk ∈ [0,1] — a prerequisite for the threshold classifier below.
 *   U (base)       = the classifier's own risk weight for the finding
 *   M (pii)        = sensitivity of PII exposed at the finding (email/phone/address)
 *   R (prominence) = how strongly/authoritatively the finding matched (confidence)
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const RISK_WEIGHTS = { base: 0.4, pii: 0.4, prominence: 0.2 } as const;

// Enforce the Σwᵢ = 1 invariant at module load (fails fast if edited wrongly).
{
  const sum = RISK_WEIGHTS.base + RISK_WEIGHTS.pii + RISK_WEIGHTS.prominence;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`RISK_WEIGHTS must sum to 1 (got ${sum}).`);
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface RiskSignals {
  base: number;
  pii: number;
  prominence: number;
}

export function composeRisk(s: RiskSignals): number {
  const r =
    RISK_WEIGHTS.base * clamp01(s.base) +
    RISK_WEIGHTS.pii * clamp01(s.pii) +
    RISK_WEIGHTS.prominence * clamp01(s.prominence);
  return Math.round(clamp01(r) * 100) / 100;
}

export function severityOf(risk: number): Severity {
  if (risk >= 0.85) return 'critical';
  if (risk >= 0.65) return 'high';
  if (risk >= 0.4) return 'medium';
  return 'low';
}

/** PII sensitivity from the classifier's flags, normalized to [0,1]. */
export function piiSensitivity(f: {
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
}): number {
  let w = 0;
  if (f.hasEmail) w += 0.3;
  if (f.hasPhone) w += 0.4;
  if (f.hasAddress) w += 0.5;
  return Math.min(1, w);
}

export interface ScorableFinding {
  riskScore: number;
  confidence: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
}

export function findingSeverity(p: ScorableFinding): { risk: number; severity: Severity } {
  const risk = composeRisk({
    base: p.riskScore,
    pii: piiSensitivity(p),
    prominence: p.confidence,
  });
  return { risk, severity: severityOf(risk) };
}

export const emptySeverityCounts = (): Record<Severity, number> => ({
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
});
