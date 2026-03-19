import crypto from "node:crypto";

type RiderConsolePayload = {
  ref: string;
  exp: number;
};

function riderConsoleSecret() {
  return (
    process.env.RIDER_CONSOLE_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", riderConsoleSecret()).update(value, "utf8").digest("base64url");
}

export function createRiderConsoleToken(ref: string, expiresInHours = 12) {
  const secret = riderConsoleSecret();
  if (!secret) {
    throw new Error("RIDER_CONSOLE_SECRET or NEXTAUTH_SECRET is required.");
  }

  const payload: RiderConsolePayload = {
    ref: String(ref || "").trim().toUpperCase(),
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
  };
  const encoded = encode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function readRiderConsoleToken(token?: string | null) {
  const secret = riderConsoleSecret();
  if (!token || !secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(encoded)) as RiderConsolePayload;
    if (
      !parsed ||
      typeof parsed.ref !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }

    return {
      ref: parsed.ref.trim().toUpperCase(),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
