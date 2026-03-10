// /src/lib/logger.ts
export function logInfo(message: string, meta?: Record<string, any>) {
  // Pretty dev logs; swap for a real logger later
  console.log(`[${new Date().toISOString()}] INFO  ${message}`, meta ?? "");
}

export function logError(message: string, meta?: Record<string, any>) {
  console.error(`[${new Date().toISOString()}] ERROR ${message}`, meta ?? "");
}
