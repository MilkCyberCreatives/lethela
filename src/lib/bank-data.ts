import crypto from "node:crypto";

const FORMAT_PREFIX = "enc:v1";
const CONTEXT = "lethela:bank-account-data:v1";
type KeyId = "bank" | "auth" | "dev";

type ResolvedKey = {
  id: KeyId;
  key: Buffer;
};

function normalizeAccountNumber(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function decodeDedicatedKey(value: string) {
  const trimmed = value.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  const decoded = Buffer.from(padded, "base64");
  if (decoded.length !== 32) {
    throw new Error("BANK_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return decoded;
}

function deriveKey(secret: string, id: KeyId) {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from("lethela", "utf8"),
      Buffer.from(`${CONTEXT}:${id}`, "utf8"),
      32,
    ),
  );
}

function keyForId(id: KeyId): ResolvedKey {
  if (id === "bank") {
    const configured = process.env.BANK_DATA_ENCRYPTION_KEY?.trim();
    if (!configured) throw new Error("BANK_DATA_ENCRYPTION_KEY is required to decrypt bank data.");
    return { id, key: decodeDedicatedKey(configured) };
  }

  if (id === "auth") {
    const secret = process.env.NEXTAUTH_SECRET?.trim();
    if (!secret) throw new Error("NEXTAUTH_SECRET is required to decrypt transitional bank data.");
    return { id, key: deriveKey(secret, id) };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Development bank encryption keys are not valid in production.");
  }
  return { id, key: deriveKey("lethela-local-development-only", id) };
}

function activeKey(): ResolvedKey {
  const dedicated = process.env.BANK_DATA_ENCRYPTION_KEY?.trim();
  if (dedicated) return { id: "bank", key: decodeDedicatedKey(dedicated) };

  const authSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (authSecret) return { id: "auth", key: deriveKey(authSecret, "auth") };

  if (process.env.NODE_ENV !== "production") return keyForId("dev");
  throw new Error(
    "NEXTAUTH_SECRET or BANK_DATA_ENCRYPTION_KEY must be configured before banking details can be saved.",
  );
}

function aad(id: KeyId) {
  return Buffer.from(`${CONTEXT}:${id}`, "utf8");
}

export function isEncryptedBankAccountNumber(value: string | null | undefined) {
  return Boolean(value?.startsWith(`${FORMAT_PREFIX}:`));
}

export function bankAccountLast4(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  if (isEncryptedBankAccountNumber(normalized)) {
    const parts = normalized.split(":");
    return parts.length === 7 && parts[6] ? parts[6] : null;
  }

  const compact = normalizeAccountNumber(normalized);
  return compact.slice(-4) || null;
}

export function decryptBankAccountNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (!isEncryptedBankAccountNumber(normalized)) return normalizeAccountNumber(normalized);

  const [prefix, version, keyIdValue, ivValue, tagValue, encryptedValue] = normalized.split(":");
  if (prefix !== "enc" || version !== "v1") throw new Error("Unsupported bank data format.");
  if (!(["bank", "auth", "dev"] as const).includes(keyIdValue as KeyId)) {
    throw new Error("Unsupported bank data key identifier.");
  }

  const keyId = keyIdValue as KeyId;
  const { key } = keyForId(keyId);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAAD(aad(keyId));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return normalizeAccountNumber(plaintext);
}

export function encryptBankAccountNumber(value: string) {
  let plaintext = normalizeAccountNumber(value);
  if (!plaintext) return "";

  const target = activeKey();
  if (isEncryptedBankAccountNumber(plaintext)) {
    const existingKeyId = plaintext.split(":")[2] as KeyId | undefined;
    const decrypted = decryptBankAccountNumber(plaintext);
    if (existingKeyId === target.id) return plaintext;
    plaintext = decrypted;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", target.key, iv);
  cipher.setAAD(aad(target.id));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const last4 = plaintext.replace(/\D/g, "").slice(-4) || plaintext.slice(-4);

  return [
    FORMAT_PREFIX,
    target.id,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
    last4,
  ].join(":");
}

export function bankDataUsesDedicatedKey(value: string | null | undefined) {
  return Boolean(value?.startsWith(`${FORMAT_PREFIX}:bank:`));
}
