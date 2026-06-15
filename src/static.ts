/**
 * static.ts — Native static-file serving. No third-party deps.
 *
 * Uses only Deno's built-in filesystem APIs (Deno.stat, Deno.open) and the Web
 * URL/Response/ReadableStream interfaces. Files are addressed as `file://` URLs
 * rather than path strings, so resolution is correct on every platform —
 * notably Windows, where a `URL.pathname` like `/C:/...` is not a valid path.
 *
 * OWASP posture: path-traversal is rejected, only regular files are served, and
 * content types are set explicitly (never sniffed).
 */

/** Extension → Content-Type. Explicit map avoids MIME sniffing surprises. */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Resolve the Content-Type for a path, defaulting to octet-stream. */
function contentType(path: string): string {
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot).toLowerCase() : "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Resolve a request pathname to a file URL under `root`, rejecting anything
 * that could escape it. Returns null for traversal attempts, null bytes,
 * backslashes, malformed encoding, or directory (non-file) requests.
 */
function resolveUnder(root: URL, pathname: string): URL | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // malformed percent-encoding
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const parts = decoded.split("/").filter((p) => p.length > 0 && p !== ".");
  if (parts.length === 0) return null; // a directory, not a file
  if (parts.some((p) => p === "..")) return null; // no parent traversal

  const target = new URL(parts.join("/"), root);
  // Defense in depth: the resolved URL must still live under root.
  if (!target.href.startsWith(root.href)) return null;
  return target;
}

/**
 * Serve a file from `root` (a directory `file://` URL) for the given pathname.
 * Returns a streamed 200 Response, or null when no regular file matches
 * (caller decides the fallback, e.g. a 404 page).
 */
export async function serveStatic(root: URL, pathname: string): Promise<Response | null> {
  const fileUrl = resolveUnder(root, pathname);
  if (!fileUrl) return null;

  let info: Deno.FileInfo;
  try {
    info = await Deno.stat(fileUrl);
  } catch {
    return null; // not found / not accessible
  }
  if (!info.isFile) return null;

  const file = await Deno.open(fileUrl, { read: true });
  const headers = new Headers({
    "content-type": contentType(fileUrl.pathname),
    "content-length": String(info.size),
    "cache-control": "public, max-age=3600",
  });
  if (info.mtime) headers.set("last-modified", info.mtime.toUTCString());

  // file.readable closes the underlying handle once the stream is consumed
  // (or cancelled — see the HEAD path in main.ts).
  return new Response(file.readable, { status: 200, headers });
}
