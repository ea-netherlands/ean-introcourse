// The admin area's session cookie.
//
// There is one admin password and no admin accounts, so a session is a signed
// note rather than a database row: "valid until <time>", plus a random value,
// signed with a key derived from ADMIN_PASSWORD. That gives three things the
// old cookie (a plain hash of the password) did not:
//
//   - it expires on the server, not only in the browser;
//   - it cannot be written by hand, even by someone who knows the old hash;
//   - no two sessions are the same value, and none of them is the password's
//     fingerprint, so a leaked cookie says nothing about the password.
//
// Changing ADMIN_PASSWORD still signs everyone out. Web Crypto only, so the
// same code runs in middleware and in route handlers.

export const ADMIN_COOKIE = "ean_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(message: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`ean-admin-session:${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Compare two strings without stopping at the first difference. */
export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether a submitted password is the admin password, compared via digests so
 *  neither length nor content leaks through timing. */
export async function passwordMatches(submitted: string, password: string): Promise<boolean> {
  const [a, b] = await Promise.all([sign("login", submitted), sign("login", password)]);
  return sameString(a, b) && submitted.length === password.length;
}

export async function issueAdminSession(password: string, now = Date.now()): Promise<string> {
  const expires = now + ADMIN_SESSION_SECONDS * 1000;
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  const body = `v1.${expires}.${nonce}`;
  return `${body}.${await sign(body, password)}`;
}

export async function verifyAdminSession(
  cookie: string | undefined,
  password: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!cookie || !password) return false;
  const parts = cookie.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [version, expiresRaw, nonce, signature] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < now) return false;
  return sameString(signature, await sign(`${version}.${expiresRaw}.${nonce}`, password));
}
