type LogLevel = "INFO" | "WARNING" | "ERROR";

type LogDetails = Record<string, boolean | number | string | null | undefined>;

function writeLog(level: LogLevel, event: string, details: LogDetails = {}): void {
  const entry = JSON.stringify({
    severity: level,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });

  if (level === "ERROR") {
    console.error(entry);
    return;
  }

  console.log(entry);
}

export const logger = {
  info(event: string, details?: LogDetails) {
    writeLog("INFO", event, details);
  },
  warning(event: string, details?: LogDetails) {
    writeLog("WARNING", event, details);
  },
  error(event: string, details?: LogDetails) {
    writeLog("ERROR", event, details);
  },
};

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown failure";
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 500);
}
