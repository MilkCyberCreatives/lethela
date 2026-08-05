export function vendorApiErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("session expired") ||
    normalized.includes("sign in") ||
    normalized.includes("not signed in")
  ) {
    return 401;
  }

  if (
    normalized.includes("awaiting approval") ||
    normalized.includes("application was rejected") ||
    normalized.includes("account is suspended") ||
    normalized.includes("insufficient role") ||
    normalized.includes("no vendor profile")
  ) {
    return 403;
  }

  return 500;
}

export function vendorApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
