// POST /api/topics/:id/replies/:rid/revoke
import { json, error, genId } from '../../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { env, params } = context
  const { id, rid } = params

  const reply = await env.DB.prepare('SELECT * FROM replies WHERE id = ? AND topic_id = ?').bind(rid, id).first()
  if (!reply) return error('回复不存在', 404)

  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 864e5).toISOString()

  const revokedId = genId('revoked')
  await env.DB.prepare(
    `INSERT INTO revoked (id, target_type, target_id, topic_id, snapshot, reason, revoked_at, expires_at)
     VALUES (?, 'reply', ?, ?, ?, '发布者撤销', ?, ?)`
  ).bind(revokedId, rid, id, JSON.stringify({ content: reply.content, authorId: reply.author_id }), now, expires).run()

  await env.DB.prepare('UPDATE replies SET revoked_at = ? WHERE id = ?').bind(now, rid).run()
  await env.DB.prepare('UPDATE topics SET reply_count = MAX(0, reply_count - 1) WHERE id = ?').bind(id).run()

  return json({ ok: true })
}
