/**
 * Chained Hash Audit Log Utility
 *
 * Provides a tamper-proof, append-only financial audit log using
 * SHA-256 chained hashes via the Web Crypto API (SubtleCrypto).
 *
 * Each entry's currentHash is derived from:
 *   SHA-256(previousHash + timestamp + action + JSON.stringify(data))
 *
 * This guarantees that any modification to a past entry will break
 * the hash chain from that point forward.
 */

import { db } from '../db';

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hex digest for a single audit entry.
 *
 * @param {string} previousHash - Hex hash of the preceding entry (empty string for genesis).
 * @param {string} timestamp    - ISO-8601 timestamp string.
 * @param {string} action       - Human-readable action label.
 * @param {*}      data         - Arbitrary data that will be JSON-stringified.
 * @returns {Promise<string>} Hex-encoded SHA-256 hash.
 */
export async function computeHash(previousHash, timestamp, action, data) {
  const payload = `${previousHash}${timestamp}${action}${JSON.stringify(data)}`;
  const encoded = new TextEncoder().encode(payload);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/**
 * Create and persist a new audit entry, chaining it to the most recent one.
 *
 * @param {string} action - Descriptive action (e.g. "SALE_COMPLETED").
 * @param {*}      data   - Payload to record (will be stored as JSON).
 * @returns {Promise<Object>} The persisted audit entry including its auto-incremented id.
 */
export async function appendAuditEntry(action, data) {
  // Retrieve the last entry in the chain (highest id).
  const lastEntry = await db.audit_chain.orderBy('id').last();

  const previousHash = lastEntry ? lastEntry.currentHash : '';
  const timestamp = new Date().toISOString();
  const currentHash = await computeHash(previousHash, timestamp, action, data);

  const entry = {
    timestamp,
    action,
    data,
    previousHash,
    currentHash,
  };

  const id = await db.audit_chain.add(entry);

  return { id, ...entry };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Walk the entire audit chain and verify that every hash links correctly
 * to its predecessor.
 *
 * @returns {Promise<{ valid: boolean, brokenAt?: number }>}
 *   `valid` is true when every entry's currentHash matches the expected
 *   digest.  When a mismatch is found, `brokenAt` holds the id of the
 *   first offending entry.
 */
export async function verifyChainIntegrity() {
  const entries = await db.audit_chain.orderBy('id').toArray();

  let expectedPreviousHash = '';

  for (const entry of entries) {
    // The entry's previousHash must match what we expect from the prior link.
    if (entry.previousHash !== expectedPreviousHash) {
      return { valid: false, brokenAt: entry.id };
    }

    // Recompute the hash and compare.
    const recomputed = await computeHash(
      entry.previousHash,
      entry.timestamp,
      entry.action,
      entry.data,
    );

    if (recomputed !== entry.currentHash) {
      return { valid: false, brokenAt: entry.id };
    }

    expectedPreviousHash = entry.currentHash;
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

/**
 * Retrieve audit entries whose timestamp falls within the given date range.
 *
 * @param {Date|string} fromDate - Inclusive start (converted to ISO string).
 * @param {Date|string} toDate   - Inclusive end   (converted to ISO string).
 * @returns {Promise<Array<Object>>} Matching entries ordered by timestamp.
 */
export async function getAuditTrail(fromDate, toDate) {
  const from = new Date(fromDate).toISOString();
  const to = new Date(toDate).toISOString();

  return db.audit_chain
    .where('timestamp')
    .between(from, to, true, true)
    .sortBy('timestamp');
}
