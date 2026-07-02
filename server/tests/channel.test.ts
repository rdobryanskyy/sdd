/**
 * channel.ts — the command allowlist (the anti-injection chokepoint) and the
 * dashboard_* tool handlers against a fake broadcast.
 */
import { describe, it, expect } from 'bun:test'
import { buildCommand, handleDashboardTool, SKILL_NAMES, type Frame } from '../channel.ts'

describe('buildCommand allowlist', () => {
  it('builds a literal /sdd: line from validated parts, depth defaults to easy', () => {
    const b = buildCommand('specify', 'my-feature')
    expect(b).toEqual({
      content: '/sdd:specify my-feature --depth=easy',
      skill: 'specify',
      slug: 'my-feature',
    })
  })

  it('honours an explicit depth', () => {
    expect(buildCommand('design', 'x', { depth: 'hard' }).content).toBe(
      '/sdd:design x --depth=hard',
    )
  })

  it('rejects a skill outside the allowlist', () => {
    expect(() => buildCommand('rm', 'x')).toThrow(/not allowed/)
    expect(() => buildCommand('start', 'x')).toThrow(/not allowed/) // deliberately not driveable
    expect(SKILL_NAMES.has('implement')).toBe(true)
  })

  it('rejects injection through the skill name', () => {
    expect(() => buildCommand('specify; rm -rf /', 'x')).toThrow(/not allowed/)
    expect(() => buildCommand('specify --dangerously', 'x')).toThrow(/not allowed/)
  })

  it('rejects injection through the slug', () => {
    expect(() => buildCommand('specify', 'a b')).toThrow(/invalid slug/)
    expect(() => buildCommand('specify', 'x; rm')).toThrow(/invalid slug/)
    expect(() => buildCommand('specify', '../etc')).toThrow(/invalid slug/)
    expect(() => buildCommand('specify', '--depth=hard')).toThrow(/invalid slug/)
    expect(() => buildCommand('specify', '')).toThrow(/invalid slug/)
  })
})

function fakeCtx() {
  const frames: Frame[] = []
  return { frames, ctx: { broadcast: (f: Frame) => frames.push(f) } }
}

describe('handleDashboardTool', () => {
  it('dashboard_update broadcasts an update + a refresh', () => {
    const { frames, ctx } = fakeCtx()
    const res = handleDashboardTool(
      'dashboard_update',
      { slug: 's', stage: 'design', status: 'done' },
      ctx,
    )
    expect(res?.isError).toBeUndefined()
    expect(frames.map((f) => f.type)).toEqual(['update', 'refresh'])
    expect(frames[0]).toMatchObject({ slug: 's', stage: 'design', status: 'done' })
  })

  it('dashboard_log defaults level to info', () => {
    const { frames, ctx } = fakeCtx()
    handleDashboardTool('dashboard_log', { message: 'working…' }, ctx)
    expect(frames).toEqual([
      { type: 'log', message: 'working…', slug: null, stage: null, level: 'info' },
    ])
  })

  it('dashboard_done broadcasts the handoff + a refresh', () => {
    const { frames, ctx } = fakeCtx()
    const res = handleDashboardTool(
      'dashboard_done',
      { slug: 's', stage: 'review', summary: 'ok', verdict: 'PASS' },
      ctx,
    )
    expect(res?.content[0].text).toContain('handoff')
    expect(frames.map((f) => f.type)).toEqual(['done', 'refresh'])
    expect(frames[0]).toMatchObject({ verdict: 'PASS', review_files: [] })
  })

  it('returns null for a non-dashboard tool name', () => {
    const { frames, ctx } = fakeCtx()
    expect(handleDashboardTool('dashboard_handshake', {}, ctx)).toBeNull()
    expect(handleDashboardTool('something_else', {}, ctx)).toBeNull()
    expect(frames).toEqual([])
  })
})
