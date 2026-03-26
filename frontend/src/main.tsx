import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import * as Sentry from "@sentry/react";
import { setupFrontendErrorHandlers, getSystemStatus, getBugPredictions } from "./utils/debugger";

setupFrontendErrorHandlers();

Sentry.init({
  dsn: "https://8cb99fb0212ca09a93a3abbcef59e90b@o4511106055208960.ingest.de.sentry.io/4511106111504464",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const debugWindow = window as unknown as { __DEBUG__?: { getSystemStatus: typeof getSystemStatus; getBugPredictions: typeof getBugPredictions; log: typeof console.log } };
debugWindow.__DEBUG__ = {
  getSystemStatus,
  getBugPredictions,
  log: console.log
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
