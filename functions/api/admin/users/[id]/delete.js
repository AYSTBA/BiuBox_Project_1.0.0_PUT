// POST /api/admin/users/:id/delete
import { json, error, getToken, getUserFromToken } from '../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || me.role !== 'admin') return error('无权限', 403)

  const user = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first()
  if (!user) return error('用户不存在', 404)
  if (user.role === 'admin') return error('管理员账号不可注销', 400)

  // 删除该用户的所有话题及其回复
  const topicIds = await env.DB.prepare('SELECT id FROM topics WHERE author_id = ?').bind(id).all()
  for (const t of topicIds.results) {
    await env.DB.prepare('DELETE FROM replies WHERE topic_id = ?').bind(t.id).run()
  }
  await env.DB.prepare('DELETE FROM topics WHERE author_id = ?').bind(id).run()
  // 删除该用户的所有回复，并更新话题回复数
  const affectedTopics = await env.DB.prepare(
    `SELECT DISTINCT topic_id FROM replies WHERE author_id = ?`
  ).bind(id).all()
  await env.DB.prepare('DELETE FROM replies WHERE author_id = ?').bind(id).run()
  for (const at of affectedTopics.results) {
    const cnt = await env.DB.prepare('SELECT COUNT(*) as c FROM replies WHERE topic_id = ? AND revoked_at IS NULL').bind(at.topic_id).first()
    await env.DB.prepare('UPDATE topics SET reply_count = ? WHERE id = ?').bind(cnt.c, at.topic_id).run()
  }
  // 删除用户
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  return json({ ok: true })
}
