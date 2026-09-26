// POST /api/topics/:id/soft-delete
import { json, error, getToken, getUserFromToken, parseJSON } from '../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const topic = await env.DB.prepare('SELECT soft_deleted_by FROM topics WHERE id = ?').bind(id).first()
  if (!topic) return error('话题不存在', 404)

  let list = parseJSON(topic.soft_deleted_by, [])
  if (!list.includes(me.id)) list.push(me.id)

  await env.DB.prepare('UPDATE topics SET soft_deleted_by = ? WHERE id = ?')
    .bind(JSON.stringify(list), id).run()

  return json({ ok: true })
}
