// POST /api/topics/:id/revoke
import { json, error, genId } from '../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { env, params } = context
  const { id } = params

  const topic = await env.DB.prepare('SELECT * FROM topics WHERE id = ?').bind(id).first()
  if (!topic) return error('话题不存在', 404)

  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 864e5).toISOString()

  // 归档到 revoked 表
  const rid = genId('revoked')
  await env.DB.prepare(
    `INSERT INTO revoked (id, target_type, target_id, topic_id, snapshot, reason, revoked_at, expires_at)
     VALUES (?, 'topic', ?, NULL, ?, '发布者撤销', ?, ?)`
  ).bind(rid, id, JSON.stringify({ title: topic.title, content: topic.content, authorId: topic.author_id }), now, expires).run()

  // 标记为已撤销
  await env.DB.prepare('UPDATE topics SET revoked_at = ? WHERE id = ?').bind(now, id).run()

  return json({ ok: true })
}
