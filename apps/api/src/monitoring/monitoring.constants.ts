export const MONITORING_QUEUE = 'presence-monitoring';

export const MonitoringJob = {
  DailyScan: 'daily-scan',
  WeeklyReport: 'weekly-report',
  MonthlyReport: 'monthly-report',
} as const;

export type MonitoringJobName =
  (typeof MonitoringJob)[keyof typeof MonitoringJob];
