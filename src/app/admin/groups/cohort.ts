/**
 * URL value for "groups without a cohort label" (groups.cohort is NULL) on /admin/groups.
 * Lives in a plain module so both the server page and the client picker get the real string:
 * a constant exported from a "use client" file is only a reference on the server.
 */
export const NO_COHORT = "_none";

/** Cohort label stored on a group → the key the page uses ("" = no cohort). */
export function cohortKey(cohort: string | null | undefined): string {
  const c = (cohort ?? "").trim();
  // "_none" and "function(){throw Error(…NO_COHORT…)}" were saved as cohort names by an early
  // version of the Groups page; both mean "no cohort" (migration 0013 also clears them).
  return c === NO_COHORT || c.startsWith("function(") ? "" : c;
}
