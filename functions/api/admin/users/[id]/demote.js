// POST /api/admin/users/:id/demote
import { json, error, getToken, getUserFromToken } from '../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || me.role !== 'admin') return error('无权限', 403)

  const user = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first()
  if (!user) return error('用户不存在', 404)
  if (user.role === 'admin') return error('管理员账号不可撤销附属', 400)

  await env.DB.prepare("UPDATE users SET role = 'user', subordinate_of = NULL WHERE id = ?").bind(id).run()
  return json({ ok: true })
}
