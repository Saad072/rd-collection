/**
 * Helpers for MongoDB connection strings.
 * Pure functions — no env/config imports, safe to unit test.
 */

/** Remove invisible junk that sneaks in when a connection string is pasted. */
export function sanitizeMongoUri(raw: string): string {
  let u = raw.trim();
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  u = u.replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');
  return u;
}

/** Hide the password so connection strings are safe to log. */
export function redactMongoUri(uri: string): string {
  return uri.replace(/:\/\/([^:@/]+):[^@/]*@/g, '://$1:****@');
}

/** Extract just the host part for diagnostics (no credentials). */
export function mongoHost(uri: string): string {
  const at = uri.indexOf('@');
  if (at >= 0) {
    const after = uri.slice(at + 1);
    return after.split('/')[0].split('?')[0] || '(unknown)';
  }
  const m = uri.match(/:\/\/([^/?]+)/);
  return m ? m[1] : '(unknown)';
}
