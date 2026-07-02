/**
 * The dashboard channel — outbound tools Claude calls to push live progress to
 * the browser, plus the server-side allowlist that builds inbound `/sdd:` lines.
 *
 * Re-skin of the Telegram channel: there, the "chat surface" is a Telegram chat;
 * here it is a browser tab. Claude replies OUTBOUND by calling these tools; the
 * server pushes INBOUND `/sdd:<skill> <slug>` commands via
 * notifications/claude/channel (built only from the allowlist below — never from
 * raw browser text).
 */

// The skills the dashboard is allowed to drive. A POST /api/command is rejected
// unless `command` is in this set — the inbound `content` is then built from
// validated parts only, so a browser can never inject arbitrary `/sdd:` text.
export const SKILL_NAMES = new Set([
  'survey',
  'specify',
  'clarify',
  'glossary',
  'classify-size',
  'design',
  'sequences',
  'data-model',
  'api',
  'decide-adr',
  'tasks',
  'plan-tests',
  'implement',
  'review',
  'ship',
  'fix',
  'roadmap',
])

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export interface BuiltCommand {
  content: string
  skill: string
  slug: string
}

/**
 * Build a literal `/sdd:<skill> <slug>` from validated parts. Throws on anything
 * not in the allowlist — the single chokepoint that keeps browser input from
 * becoming an arbitrary slash command. `depth` defaults to easy for dashboard
 * runs (the skill self-decides reversible calls, asks far fewer questions).
 */
export function buildCommand(
  command: string,
  slug: string,
  opts: { depth?: 'easy' | 'medium' | 'hard' } = {},
): BuiltCommand {
  const skill = String(command || '').trim()
  if (!SKILL_NAMES.has(skill)) {
    throw new Error(`command not allowed: ${skill}`)
  }
  const s = String(slug || '').trim()
  if (!SLUG_RE.test(s)) {
    throw new Error(`invalid slug: ${slug}`)
  }
  const depth = opts.depth ?? 'easy'
  // roadmap/survey are repo-wide — they still take the slug as a hint argument,
  // which the skills tolerate; keeping one shape simple beats special-casing.
  const content = `/sdd:${skill} ${s} --depth=${depth}`
  return { content, skill, slug: s }
}

// ---- outbound tools (Claude → server → browser over WS) --------------------

export type Frame = Record<string, unknown>

export interface ChannelCtx {
  /** Broadcast a WS frame to every connected dashboard client. The server tags
   *  it with session_id + ts before sending. */
  broadcast: (frame: Frame) => void
}

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const DASHBOARD_TOOLS: ToolDef[] = [
  {
    name: 'dashboard_update',
    description:
      'Push a structured pipeline-stage update to the dashboard. Call after a stage advances (e.g. spec written, tasks generated) so the stepper re-renders. slug identifies the feature; stage is the skill id (specify/design/tasks/…); status is one of started/working/done/blocked; progress is an optional {done,total} for implement.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        stage: { type: 'string', description: 'skill id: specify|design|sequences|data-model|api|tasks|plan-tests|implement|review|ship' },
        status: { type: 'string', enum: ['started', 'working', 'done', 'blocked'] },
        progress: {
          type: 'object',
          properties: { done: { type: 'number' }, total: { type: 'number' } },
        },
        message: { type: 'string', description: 'optional one-line human summary' },
      },
      required: ['slug', 'stage', 'status'],
    },
  },
  {
    name: 'dashboard_log',
    description:
      'Stream a console line to the dashboard while a stage runs — progress, what you are doing, a command you ran. Free text. Use for the live activity feed, not the final handoff (use dashboard_done for that).',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        slug: { type: 'string' },
        stage: { type: 'string' },
        level: { type: 'string', enum: ['info', 'warn', 'error'] },
      },
      required: ['message'],
    },
  },
  {
    name: 'dashboard_done',
    description:
      'Signal a stage finished and hand the dashboard the SDD handoff: what changed, the files to review, and the next command. For review, pass verdict (PASS / CHANGES REQUESTED). Triggers the dashboard to re-derive the feature from disk.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        stage: { type: 'string' },
        summary: { type: 'string', description: 'what this stage did (the handoff "What I did")' },
        verdict: { type: 'string', enum: ['PASS', 'CHANGES REQUESTED'] },
        review_files: { type: 'array', items: { type: 'string' }, description: 'docs/features/<slug>/… paths to review' },
        next_command: { type: 'string', description: 'the next /sdd:<skill> <slug> line' },
      },
      required: ['slug', 'stage', 'summary'],
    },
  },
]

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

/** Handle a dashboard_* tool call. Returns the MCP tool result, or null if the
 *  name is not a dashboard tool (server handles handshake separately). */
export function handleDashboardTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ChannelCtx,
): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } | null {
  switch (name) {
    case 'dashboard_update': {
      ctx.broadcast({
        type: 'update',
        slug: str(args.slug),
        stage: str(args.stage),
        status: str(args.status),
        progress: args.progress ?? null,
        message: str(args.message) ?? null,
      })
      ctx.broadcast({ type: 'refresh', slug: str(args.slug) })
      return { content: [{ type: 'text', text: 'dashboard updated' }] }
    }
    case 'dashboard_log': {
      ctx.broadcast({
        type: 'log',
        message: String(args.message ?? ''),
        slug: str(args.slug) ?? null,
        stage: str(args.stage) ?? null,
        level: str(args.level) ?? 'info',
      })
      return { content: [{ type: 'text', text: 'logged' }] }
    }
    case 'dashboard_done': {
      ctx.broadcast({
        type: 'done',
        slug: str(args.slug),
        stage: str(args.stage),
        summary: String(args.summary ?? ''),
        verdict: str(args.verdict) ?? null,
        review_files: Array.isArray(args.review_files) ? args.review_files : [],
        next_command: str(args.next_command) ?? null,
      })
      ctx.broadcast({ type: 'refresh', slug: str(args.slug) })
      return { content: [{ type: 'text', text: 'handoff delivered to dashboard' }] }
    }
    default:
      return null
  }
}
