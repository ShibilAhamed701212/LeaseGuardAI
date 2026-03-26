// utils/debugger.ts — Frontend bug detector and crash recovery

export interface BugPrediction {
  id: string;
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
  occurrenceCount: number;
  timestamp: string;
}

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  component?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

interface UserAction {
  type: string;
  timestamp: number;
  data?: unknown;
}

const MAX_ERROR_LOGS = 100;
const MAX_USER_ACTIONS = 50;
const BUG_DETECTION_THRESHOLD = 3;

let errorLogs: ErrorLog[] = [];
let bugPredictions: Map<string, BugPrediction> = new Map();
let userActions: UserAction[] = [];
let componentErrorCounts: Map<string, number> = new Map();

export function trackError(
  message: string,
  stack?: string,
  context?: Record<string, unknown>,
  component?: string
): void {
  const id = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const log: ErrorLog = {
    id,
    message,
    stack,
    component,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context)
  };
  
  errorLogs.push(log);
  
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs = errorLogs.slice(-MAX_ERROR_LOGS);
  }
  
  if (component) {
    const count = componentErrorCounts.get(component) || 0;
    componentErrorCounts.set(component, count + 1);
    
    if (count >= BUG_DETECTION_THRESHOLD - 1) {
      addBugPrediction(`React Error in ${component}`, "high", `Component ${component} has errored ${count + 1} times. Check for render issues or missing props.`);
    }
  }
  
  detectBugPattern(message, context);
  saveToLocalStorage();
}

function detectBugPattern(message: string, _context?: Record<string, unknown>): BugPrediction | null {
  const patterns: { pattern: RegExp; issue: string; severity: BugPrediction["severity"]; recommendation: string }[] = [
    { pattern: /cannot read.*undefined|null/i, issue: "Cannot read property of undefined", severity: "high", recommendation: "Add null checks or optional chaining (?.)" },
    { pattern: /is not a function/i, issue: "Function call on non-function", severity: "high", recommendation: "Check if function is defined before calling" },
    { pattern: /is not defined/i, issue: "Reference to undefined variable", severity: "critical", recommendation: "Check variable/import is defined" },
    { pattern: /maximum call stack/i, issue: "Infinite recursion detected", severity: "critical", recommendation: "Check for circular dependencies or excessive recursion" },
    { pattern: /network error|fetch failed/i, issue: "Network request failed", severity: "medium", recommendation: "Check API endpoint and network connectivity" },
    { pattern: /401|unauthorized/i, issue: "Authentication failed", severity: "high", recommendation: "Verify authentication token" },
    { pattern: /429|rate limit/i, issue: "Rate limit exceeded", severity: "medium", recommendation: "Implement request throttling" },
    { pattern: /invalid json|JSON.*parse/i, issue: "JSON parsing failed", severity: "medium", recommendation: "Validate JSON response before parsing" },
    { pattern: /chunk.*failed|loading failed/i, issue: "Code splitting failed", severity: "high", recommendation: "Check import paths and webpack config" },
    { pattern: /async.*rejected/i, issue: "Unhandled async rejection", severity: "medium", recommendation: "Add .catch() to async operations" },
  ];

  for (const { pattern, issue, severity, recommendation } of patterns) {
    if (pattern.test(message)) {
      return addBugPrediction(issue, severity, recommendation);
    }
  }
  
  return null;
}

function addBugPrediction(issue: string, severity: BugPrediction["severity"], recommendation: string): BugPrediction {
  const existing = bugPredictions.get(issue);
  
  if (existing) {
    existing.occurrenceCount++;
    return existing;
  }
  
  const prediction: BugPrediction = {
    id: `bug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    issue,
    severity,
    recommendation,
    occurrenceCount: 1,
    timestamp: new Date().toISOString()
  };
  
  bugPredictions.set(issue, prediction);
  return prediction;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  
  const sensitive = ["password", "token", "secret", "apiKey"];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function trackUserAction(type: string, data?: unknown): void {
  userActions.push({
    type,
    timestamp: Date.now(),
    data
  });
  
  if (userActions.length > MAX_USER_ACTIONS) {
    userActions = userActions.slice(-MAX_USER_ACTIONS);
  }
}

export function getErrorLogs(): ErrorLog[] {
  return [...errorLogs].reverse();
}

export function getBugPredictions(): BugPrediction[] {
  return Array.from(bugPredictions.values()).sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function getUserActions(): UserAction[] {
  return [...userActions].reverse();
}

export function getComponentErrorCounts(): Record<string, number> {
  return Object.fromEntries(componentErrorCounts);
}

export function clearErrorLogs(): void {
  errorLogs = [];
  saveToLocalStorage();
}

export function clearBugPredictions(): void {
  bugPredictions.clear();
  componentErrorCounts.clear();
  localStorage.removeItem("ocr_debug_data");
}

function saveToLocalStorage(): void {
  try {
    const data = {
      errorLogs: errorLogs.slice(-20),
      bugPredictions: Array.from(bugPredictions.entries()).slice(-10)
    };
    localStorage.setItem("ocr_debug_data", JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save debug data to localStorage");
  }
}

function loadFromLocalStorage(): void {
  try {
    const data = localStorage.getItem("ocr_debug_data");
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.errorLogs) errorLogs = parsed.errorLogs;
      if (parsed.bugPredictions) bugPredictions = new Map(parsed.bugPredictions);
    }
  } catch (err) {
    console.warn("Failed to load debug data from localStorage");
  }
}

export function getSystemStatus(): {
  errorCount: number;
  bugPredictionCount: number;
  errorRate: number;
  recentErrors: string[];
  topIssues: BugPrediction[];
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const recentErrors = errorLogs
    .filter(l => new Date(l.timestamp).getTime() > oneHourAgo)
    .map(l => l.message);
  
  const errorCount = errorLogs.length;
  const bugPredictionCount = bugPredictions.size;
  const errorRate = errorCount > 0 ? (errorCount / Math.max(1, userActions.length)) * 100 : 0;
  
  return {
    errorCount,
    bugPredictionCount,
    errorRate: parseFloat(errorRate.toFixed(2)),
    recentErrors: recentErrors.slice(-10),
    topIssues: getBugPredictions().slice(0, 5)
  };
}

export function setupFrontendErrorHandlers(): void {
  loadFromLocalStorage();
  
  window.onerror = (message, source, lineno, colno, error) => {
    trackError(
      String(message),
      error?.stack,
      { source: source || "", line: lineno, column: colno }
    );
    return false;
  };
  
  window.onunhandledrejection = (event) => {
    trackError(
      event.reason?.message || "Unhandled Promise Rejection",
      event.reason?.stack,
      { reason: String(event.reason) }
    );
  };
  
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const msg = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
    if (msg.includes("Error") || msg.includes("warning")) {
      trackError(msg, undefined, { console: true });
    }
    originalConsoleError.apply(console, args);
  };
  
  console.log("Frontend debug system initialized");
}

if (typeof window !== "undefined") {
  setupFrontendErrorHandlers();
}
