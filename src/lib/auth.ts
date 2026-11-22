import { cookies } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "crypto";
import { and, asc, eq, gt, or } from "drizzle-orm";
import {
  db,
  groups,
  httpSessions,
  loginTokens,
  participants,
  ensureMigrated,
} from "@/db";
import { newId } from "./ids";

// Stage 2+: cookie-based session auth, activated by consuming a magic link.

const SESSION_COOKIE = "ean_fellowship_session";
const SESSION_DAYS = 7;
const LOGIN_TOKEN_MINUTES = 30;

export type CurrentParticipant = typeof participants.$inferSelect;

/** Hash a raw token with SHA-256 for safe storage. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ---------- magic-link tokens ----------

/**
 * Generate a raw magic-link token, store the hash in login_tokens, and
 * return the raw token so the caller can embed it in a URL.
 */
export async function createLoginToken(participantId: string): Promise<string> {
  await ensureMigrated();
  const raw = randomBytes(32).toString("base64url");
  await db.insert(loginTokens).values({
    id: newId("lt"),
    participantId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000),
  });
  return raw;
}

/**
 * Verify a raw magic-link token and return the participantId it belongs to,
 * or null if the token is invalid/expired. Single-use: the row is deleted.
 */
export async function consumeLoginToken(
  raw: string
): Promise<string | null> {
  await ensureMigrated();
  const [token] = await db
    .select()
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.tokenHash, hashToken(raw)),
        gt(loginTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!token) return null;
  await db.delete(loginTokens).where(eq(loginTokens.id, token.id));
  return token.participantId;
}

// ---------- sessions ----------

/** Create a long-lived session and return the raw token for the cookie. */
export async function createSession(participantId: string): Promise<string> {
  await ensureMigrated();
  const raw = randomBytes(32).toString("base64url");
  await db.insert(httpSessions).values({
    id: newId("sess"),
    participantId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  return raw;
}

/** Read the current participant from the session cookie, or null if not signed in. */
export const getCurrentParticipant = cache(
  async (): Promise<CurrentParticipant | null> => {
    await ensureMigrated();
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    if (!raw) return null;

    const [session] = await db
      .select()
      .from(httpSessions)
      .where(
        and(
          eq(httpSessions.tokenHash, hashToken(raw)),
          gt(httpSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!session) return null;

    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, session.participantId))
      .limit(1);

    return participant ?? null;
  }
);

/**
 * The groups someone belongs to: their own group (participants.groupId) and, for
 * facilitators, every active group they lead (groups.facilitator_id), so one facilitator can
 * run several groups. Primary group (participants.groupId) first.
 */
export async function myGroups(
  me: Pick<CurrentParticipant, "id" | "role" | "groupId">
): Promise<{ id: string; name: string; cohort: string | null }[]> {
  await ensureMigrated();
  const isFacilitator = me.role === "facilitator" || me.role === "admin";
  if (!me.groupId && !isFacilitator) return [];
  const conds = [];
  if (me.groupId) conds.push(eq(groups.id, me.groupId));
  if (isFacilitator) conds.push(and(eq(groups.facilitatorId, me.id), eq(groups.active, true)));
  const rows = await db
    .select({ id: groups.id, name: groups.name, cohort: groups.cohort })
    .from(groups)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .orderBy(asc(groups.name));
  return rows.sort((a, b) => Number(b.id === me.groupId) - Number(a.id === me.groupId));
}

/**
 * Group-level access: participants see only their own group (participants.groupId);
 * facilitators also every group they lead (groups.facilitator_id); role "admin" sees all.
 */
export async function canAccessGroup(
  me: Pick<CurrentParticipant, "id" | "role" | "groupId">,
  groupId: string
): Promise<boolean> {
  if (me.role === "admin" || me.groupId === groupId) return true;
  if (me.role !== "facilitator") return false;
  const [g] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.facilitatorId, me.id)))
    .limit(1);
  return !!g;
}

/** Set the session cookie after a successful magic-link sign-in. */
export async function setSessionCookie(raw: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

/** Sign the current user out — deletes the DB session and clears the cookie. */
export async function logout(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await ensureMigrated();
    await db
      .delete(httpSessions)
      .where(eq(httpSessions.tokenHash, hashToken(raw)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Session duration in seconds. */
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
