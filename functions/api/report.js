// POST /api/report  普通用户举报内容
import { json, error, parseBody, getToken, getUserFromToken, genId } from '../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const body = await parseBody(request)
  const { targetType, targetId, reason, snapshot, topicId } = body

  if (!targetType || !targetId) return error('缺少举报目标', 400)

  // 检查是否已举报过
  const existing = await env.DB.prepare(
    `SELECT id FROM reports WHERE target_id = ? AND reporter_id = ? AND status = 'pending'`
  ).bind(targetId, me.id).first()
  if (existing) {
    return error('你已举报过该内容，请等待管理员处理', 400)
  }

  const id = genId('report')
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO reports (id, target_type, target_id, target_topic_id, reporter_id, reporter_nickname, reason, snapshot, created_at, status, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)`
  ).bind(id, targetType, targetId, topicId || null, me.id, me.nickname, reason || '其他', JSON.stringify(snapshot || {}), now).run()

  return json({ ok: true })
}
