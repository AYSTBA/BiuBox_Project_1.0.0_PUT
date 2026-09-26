// POST /api/topics/:id/replies
import { json, error, parseBody, getToken, getUserFromToken, genId } from '../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  if (me.banned_until && new Date(me.banned_until).getTime() > Date.now()) {
    return error('你已被禁言，无法回复', 403)
  }

  const body = await parseBody(request)
  const { content } = body
  if (!content || !content.trim()) return error('回复内容不能为空', 400)

  // 检查话题是否存在且未撤销
  const topic = await env.DB.prepare('SELECT id FROM topics WHERE id = ? AND revoked_at IS NULL').bind(id).first()
  if (!topic) return error('话题不存在或已被撤销', 404)

  const rid = genId('r')
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO replies (id, topic_id, author_id, content, created_at, revoked_at, soft_deleted_by)
     VALUES (?, ?, ?, ?, ?, NULL, '[]')`
  ).bind(rid, id, me.id, content.trim(), now).run()

  await env.DB.prepare('UPDATE topics SET reply_count = reply_count + 1 WHERE id = ?').bind(id).run()

  return json({
    id: rid,
    author: {
      id: me.id,
      nickname: me.nickname,
      avatarColor: me.avatar_color,
      role: me.role,
    },
    content: content.trim(),
    createdAt: now,
    mine: true,
  })
}
