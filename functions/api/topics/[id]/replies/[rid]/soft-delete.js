// POST /api/topics/:id/replies/:rid/soft-delete
import { json, error, getToken, getUserFromToken, parseJSON } from '../../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { rid } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const reply = await env.DB.prepare('SELECT soft_deleted_by FROM replies WHERE id = ?').bind(rid).first()
  if (!reply) return error('回复不存在', 404)

  let list = parseJSON(reply.soft_deleted_by, [])
  if (!list.includes(me.id)) list.push(me.id)

  await env.DB.prepare('UPDATE replies SET soft_deleted_by = ? WHERE id = ?')
    .bind(JSON.stringify(list), rid).run()

  return json({ ok: true })
}
