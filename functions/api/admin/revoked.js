// GET /api/admin/revoked
import { json, error, getToken, getUserFromToken, parseJSON } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || (me.role !== 'admin' && me.role !== 'subordinate')) {
    return error('无权限', 403)
  }

  // 清理过期项
  const now = new Date().toISOString()
  await env.DB.prepare('DELETE FROM revoked WHERE expires_at < ?').bind(now).run()

  const rows = await env.DB.prepare(
    `SELECT * FROM revoked ORDER BY revoked_at DESC`
  ).all()

  return json(rows.results.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    topicId: r.topic_id,
    snapshot: parseJSON(r.snapshot, {}),
    reason: r.reason,
    revokedAt: r.revoked_at,
    expiresAt: r.expires_at,
  })))
}
