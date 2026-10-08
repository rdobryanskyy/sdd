/**
 * Path scope and project-root discovery for the SDD dashboard server.
 *
 * The MCP server starts with `--cwd ${CLAUDE_PLUGIN_ROOT}/server`. Thus
 * `process.cwd()` is the PLUGIN dir, never the project. Before a read or a write
 * touches the disk, the code must prove that the path is under `<PROJECT>/docs/`.
 * This is the inverse of `assertSendable` in the Telegram channel. That function
 * refuses to LEAK its own state. This code refuses to TOUCH anything outside the
 * docs tree of the project.
 */

import { realpathSync, existsSync, statSync } from 'fs'
import { join, resolve, sep, dirname, basename, normalize, isAbsolute } from 'path'

// The root of the plugin itself. The server starts with `--cwd <plugin>/server`,
// thus the plugin dir is one level up. We always refuse to resolve THIS dir as the
// project. The critical trap is to read the docs/ of the plugin instead of the
// docs/ of the user.
const PLUGIN_ROOT = resolve(import.meta.dir, '..')

/** The files that we read and serve as artifacts. We match `.size` by basename, not by extname. */
export const ALLOWED_EXT = new Set(['.md', '.yaml', '.yml', '.json'])
const ALLOWED_BASENAMES = new Set(['.size'])

let PROJECT_DIR: string | null = null

function hasProjectMarkers(dir: string): boolean {
  return existsSync(join(dir, 'docs')) || existsSync(join(dir, '.git'))
}

function isPluginRoot(dir: string): boolean {
  try {
    return realpathSync(dir) === realpathSync(PLUGIN_ROOT)
  } catch {
    return resolve(dir) === PLUGIN_ROOT
  }
}

/** Go up from `start` to find a dir that has `docs/` or `.git` and is not the plugin. */
function walkUp(start: string): string | null {
  let dir = resolve(start)
  for (let i = 0; i < 40; i++) {
    if (!isPluginRoot(dir) && hasProjectMarkers(dir)) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * The resolution order (the contract of the plan):
 *   1. process.env.CLAUDE_PROJECT_DIR  (Claude Code sets this for the session)
 *   2. an explicit handover from /sdd:start (setProjectDir — it has authority and wins)
 *   3. an upward walk from cwd to find docs/ or .git
 *   4. null → the callers refuse with a clear message
 *
 * setProjectDir() applies (2). It overrides the value that the boot resolved.
 * This function calculates the BOOT default: first the env, then the walk.
 */
function resolveBootDir(): string | null {
  const env = process.env.CLAUDE_PROJECT_DIR
  if (env && existsSync(env) && !isPluginRoot(env) && hasProjectMarkers(env)) {
    return resolve(env)
  }
  return walkUp(process.cwd())
}

PROJECT_DIR = resolveBootDir()

/** The handover from /sdd:start, which has authority. It runs in the session, where cwd IS the project. */
export function setProjectDir(dir: string): string {
  const abs = resolve(dir)
  if (!existsSync(abs)) throw new Error(`project dir does not exist: ${abs}`)
  if (isPluginRoot(abs)) {
    throw new Error(`refusing to use the SDD plugin's own dir as the project: ${abs}`)
  }
  if (!hasProjectMarkers(abs)) {
    throw new Error(`not a project root (no docs/ or .git/): ${abs}`)
  }
  PROJECT_DIR = abs
  return abs
}

export function getProjectDir(): string | null {
  return PROJECT_DIR
}

/** Throw a uniform "where's the project" error for the endpoints that must have a project. */
export function requireProjectDir(): string {
  if (!PROJECT_DIR) {
    throw new Error(
      'project dir unresolved — run /sdd:start in the project (or set CLAUDE_PROJECT_DIR)',
    )
  }
  return PROJECT_DIR
}

export function docsDir(): string {
  return join(requireProjectDir(), 'docs')
}

export function featuresDir(): string {
  return join(docsDir(), 'features')
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

/**
 * Resolve `<docs>/features/<slug>/<relPath>`. If slug is null, resolve a file in
 * the docs root, for example roadmap.md. Then PROVE three things about the
 * realpath: it is in docs/, it has an allowed extension, and it is not under .git.
 * Return the absolute path to use.
 *
 * The containment check uses the realpath. Thus the check finds a symlink that
 * goes out of docs/. The API is read-only, so the artifact must already exist.
 * A missing file gives `no such artifact`. It is never an anchor for a write.
 */
export function assertArtifactPath(slug: string | null, relPath: string): string {
  const docs = docsDir()

  // Reject absolute paths and traversal first. This is defense in depth. The
  // realpath is the real gate, but a clear early refusal is better than an
  // unclear refusal later.
  if (isAbsolute(relPath)) throw new Error(`artifact path must be relative: ${relPath}`)
  const clean = normalize(relPath)
  if (clean.startsWith('..') || clean.split(sep).includes('..')) {
    throw new Error(`path traversal rejected: ${relPath}`)
  }

  if (slug !== null && !isValidSlug(slug)) {
    throw new Error(`invalid slug: ${slug}`)
  }

  const base = slug === null ? docs : join(featuresDir(), slug)
  const target = resolve(base, clean)

  // Extension / basename allowlist.
  const name = basename(target)
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot) : ''
  if (!ALLOWED_BASENAMES.has(name) && !ALLOWED_EXT.has(ext.toLowerCase())) {
    throw new Error(`extension not allowed: ${name}`)
  }

  // Realpath containment. If the leaf is missing, use the parent (which exists)
  // as the anchor.
  let realDocs: string
  try {
    realDocs = realpathSync(docs)
  } catch {
    throw new Error(`docs/ does not exist under the project: ${docs}`)
  }
  if (!existsSync(target)) {
    throw new Error(`no such artifact: ${relPath}`)
  }
  const realTarget = realpathSync(target)

  if (realTarget !== realDocs && !realTarget.startsWith(realDocs + sep)) {
    throw new Error(`path escapes docs/: ${relPath}`)
  }
  // Never accept a path under a .git dir. This is defense in depth. The .git dir
  // is usually outside docs/, but this check finds a symlinked .git in docs/.
  if (realTarget.split(sep).includes('.git')) {
    throw new Error(`refusing to touch .git: ${relPath}`)
  }
  return realTarget
}

/** Content-Type for an artifact path (used by the raw-file endpoint). */
export function contentTypeFor(path: string): string {
  const name = basename(path).toLowerCase()
  if (name === '.size') return 'text/plain; charset=utf-8'
  if (name.endsWith('.md')) return 'text/markdown; charset=utf-8'
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'application/yaml; charset=utf-8'
  if (name.endsWith('.json')) return 'application/json; charset=utf-8'
  return 'text/plain; charset=utf-8'
}

/** True if `p` resolves in the static dashboard dir. The static-serve code uses this function. */
export function safeStaticPath(staticRoot: string, urlPath: string): string | null {
  const clean = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const target = resolve(staticRoot, '.' + sep + clean)
  if (target !== staticRoot && !target.startsWith(staticRoot + sep)) return null
  if (!existsSync(target)) return null
  try {
    if (statSync(target).isDirectory()) return null
  } catch {
    return null
  }
  return target
}
