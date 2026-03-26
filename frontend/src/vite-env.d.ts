/// <reference types="vite/client" />

export interface BugPrediction {
  id: string;
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
  occurrenceCount: number;
  timestamp: string;
}

export interface SystemStatus {
  errorCount: number;
  bugPredictionCount: number;
  errorRate: number;
  recentErrors: string[];
  topIssues: BugPrediction[];
}

export interface DebugAPI {
  getSystemStatus: () => SystemStatus;
  getBugPredictions: () => BugPrediction[];
  log: typeof console.log;
}
