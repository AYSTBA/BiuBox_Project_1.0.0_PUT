// GET /api/admin/reports  |  POST /api/report
// 报告列表（管理员）
import { json, error, getToken, getUserFromToken, parseJSON } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || (me.role !== 'admin' && me.role !== 'subordinate')) {
    return error('无权限', 403)
  }

  const rows = await env.DB.prepare(
    `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC`
  ).all()

  return json(rows.results.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetTopicId: r.target_topic_id,
    reporterId: r.reporter_id,
    reporterNickname: r.reporter_nickname,
    reason: r.reason,
    snapshot: parseJSON(r.snapshot, {}),
    createdAt: r.created_at,
    status: r.status,
    resolvedAt: r.resolved_at,
  })))
}
