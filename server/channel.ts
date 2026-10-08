/**
 * The dashboard channel. It has two parts:
 * - The outbound tools. Claude calls these tools to push live progress to the browser.
 * - The server-side allowlist. It builds the inbound `/sdd:` lines.
 *
 * This file uses the pattern of the Telegram channel. In the Telegram channel, the
 * chat surface is a Telegram chat. Here, it is a browser tab. Claude replies
 * OUTBOUND when it calls these tools. The server pushes INBOUND
 * `/sdd:<skill> <slug>` commands through notifications/claude/channel. The server
 * builds these commands only from the allowlist below, never from raw browser text.
 */

// The skills that the dashboard can start. If `command` is not in this set, the
// server rejects a POST /api/command. The server builds the inbound `content`
// only from validated parts. Thus a browser cannot inject arbitrary `/sdd:` text.
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
const DEPTHS = new Set(['easy', 'medium', 'hard'])

export interface BuiltCommand {
  content: string
  skill: string
  slug: string
}

/**
 * Build a literal `/sdd:<skill> <slug>` from validated parts. If a part is not
 * in the allowlist, this function throws. It is the single chokepoint. It makes
 * sure that browser input cannot become an arbitrary slash command. For dashboard
 * runs, the default `depth` is easy. Then the skill makes reversible decisions
 * itself and asks far fewer questions.
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
  // The type says easy|medium|hard, but the value comes from a browser POST.
  // Validate it at runtime too. If not, the value goes into the command line.
  if (!DEPTHS.has(depth)) throw new Error(`invalid depth: ${depth}`)
  // The roadmap and survey skills are repo-wide. They still get the slug as a
  // hint argument, and the skills accept it. One simple shape is better than a
  // special case.
  const content = `/sdd:${skill} ${s} --depth=${depth}`
  return { content, skill, slug: s }
}

// ---- pending questions (dashboard_ask → POST /api/answer) -------------------
//
// The dashboard cannot answer a blocking AskUserQuestion, because that UI is in
// the terminal host. dashboard_ask is the alternative for the browser. Claude
// posts a question WITH options and ends its turn. The click of the user comes
// back as a channel message. The anti-injection protection stays valid, because
// the browser sends only an option INDEX. The label text that goes to Claude is
// the text that Claude itself wrote here.

export interface AskOption {
  label: string
  description?: string
}

export interface PendingAsk {
  id: string
  slug: string | null
  stage: string | null
  question: string
  options: AskOption[]
}

const MAX_PENDING_ASKS = 20

export function createAskRegistry() {
  const pending = new Map<string, PendingAsk>()
  return {
    register(ask: PendingAsk): void {
      // The registry has a limit. If a run leaks questions, the registry removes
      // the oldest question. Thus the memory use does not increase.
      while (pending.size >= MAX_PENDING_ASKS) {
        const oldest = pending.keys().next().value
        if (oldest == null) break
        pending.delete(oldest)
      }
      pending.set(ask.id, ask)
    },
    /** Single-use claim. The user can answer a question only one time. */
    take(id: string): PendingAsk | null {
      const ask = pending.get(id) ?? null
      if (ask) pending.delete(id)
      return ask
    },
    size(): number {
      return pending.size
    },
  }
}

export type AskRegistry = ReturnType<typeof createAskRegistry>

// ---- outbound tools (Claude → server → browser over WS) --------------------

export type Frame = Record<string, unknown>

export interface ChannelCtx {
  /** Broadcast a WS frame to all connected dashboard clients. Before the server
   *  sends the frame, it adds session_id + ts to it. */
  broadcast: (frame: Frame) => void
  /** The pending dashboard_ask questions. POST /api/answer claims them. */
  asks: AskRegistry
  /** A random id for a new question. Tests inject it to get deterministic results. */
  askId: () => string
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
    name: 'dashboard_ask',
    description:
      'Ask the dashboard user a blocking decision DURING a dashboard-driven run — the browser-compatible alternative to AskUserQuestion (which the dashboard cannot answer). Post the question with 2-4 concrete options, then END YOUR TURN: the user\'s pick arrives later as a channel message (meta.kind="answer") consumed while you are idle, exactly like a command — resume the run from the artifacts on disk. The user may instead answer in the terminal; accept whichever comes first.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'the decision to make, one line' },
        options: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'short option text (1-5 words)' },
              description: { type: 'string', description: 'optional trade-off note' },
            },
            required: ['label'],
          },
        },
        slug: { type: 'string' },
        stage: { type: 'string' },
      },
      required: ['question', 'options'],
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

/** Handle a dashboard_* tool call. Return the MCP tool result. If the name is not
 *  a dashboard tool, return null. The server handles the handshake separately. */
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
    case 'dashboard_ask': {
      const question = String(args.question ?? '').trim()
      if (!question) throw new Error('question required')
      const raw = Array.isArray(args.options) ? args.options : []
      const options: AskOption[] = raw.map((o) => {
        const opt = (o ?? {}) as Record<string, unknown>
        const label = String(opt.label ?? '').trim()
        if (!label) throw new Error('every option needs a non-empty label')
        const description = str(opt.description)
        return description ? { label, description } : { label }
      })
      if (options.length < 2 || options.length > 4) {
        throw new Error(`need 2-4 options, got ${options.length}`)
      }
      const id = ctx.askId()
      ctx.asks.register({
        id,
        slug: str(args.slug) ?? null,
        stage: str(args.stage) ?? null,
        question,
        options,
      })
      ctx.broadcast({
        type: 'ask',
        ask_id: id,
        question,
        options,
        slug: str(args.slug) ?? null,
        stage: str(args.stage) ?? null,
      })
      return {
        content: [
          {
            type: 'text',
            text:
              `question ${id} posted to the dashboard. END YOUR TURN NOW — the user's pick arrives ` +
              `as a channel message (meta.kind="answer", ask_id=${id}) once they click an option. ` +
              `They may instead answer in the terminal; accept whichever comes first.`,
          },
        ],
      }
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
