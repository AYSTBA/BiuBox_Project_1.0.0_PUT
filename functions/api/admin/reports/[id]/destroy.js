// POST /api/admin/reports/:id/destroy
import { json, error, getToken, getUserFromToken, genId } from '../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || (me.role !== 'admin' && me.role !== 'subordinate')) {
    return error('无权限', 403)
  }

  const report = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first()
  if (!report) return error('举报记录不存在', 404)

  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 864e5).toISOString()

  // 更新举报状态
  await env.DB.prepare(
    `UPDATE reports SET status = 'destroyed', resolved_at = ? WHERE id = ?`
  ).bind(now, id).run()

  // 归档到 revoked 表
  const rid = genId('revoked')
  await env.DB.prepare(
    `INSERT INTO revoked (id, target_type, target_id, topic_id, snapshot, reason, revoked_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(rid, report.target_type, report.target_id, report.target_topic_id, report.snapshot || '{}', `举报销毁：${report.reason}`, now, expires).run()

  // 标记内容为已撤销
  if (report.target_type === 'topic') {
    await env.DB.prepare('UPDATE topics SET revoked_at = ? WHERE id = ?').bind(now, report.target_id).run()
  } else if (report.target_type === 'reply') {
    await env.DB.prepare('UPDATE replies SET revoked_at = ? WHERE id = ?').bind(now, report.target_id).run()
    if (report.target_topic_id) {
      await env.DB.prepare('UPDATE topics SET reply_count = MAX(0, reply_count - 1) WHERE id = ?').bind(report.target_topic_id).run()
    }
  }

  return json({ ok: true })
}
