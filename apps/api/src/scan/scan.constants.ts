export const SCAN_QUEUE = 'presence-scan';

export interface ScanJobData {
  scanJobId: string;
  userId: string;
  identityId: string;
}
