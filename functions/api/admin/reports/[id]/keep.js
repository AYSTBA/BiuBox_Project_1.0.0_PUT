// POST /api/admin/reports/:id/keep
import { json, error, getToken, getUserFromToken } from '../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || (me.role !== 'admin' && me.role !== 'subordinate')) {
    return error('无权限', 403)
  }

  const report = await env.DB.prepare('SELECT id FROM reports WHERE id = ?').bind(id).first()
  if (!report) return error('举报记录不存在', 404)

  await env.DB.prepare(
    `UPDATE reports SET status = 'kept', resolved_at = ? WHERE id = ?`
  ).bind(new Date().toISOString(), id).run()

  return json({ ok: true })
}
