// POST /api/admin/users/:id/ban
import { json, error, parseBody, getToken, getUserFromToken } from '../../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || me.role !== 'admin') return error('无权限', 403)

  const user = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first()
  if (!user) return error('用户不存在', 404)
  if (user.role === 'admin') return error('管理员账号不可禁言', 400)

  const body = await parseBody(request)
  const days = parseInt(body.days || '1', 10)
  const until = new Date(Date.now() + days * 864e5).toISOString()

  await env.DB.prepare('UPDATE users SET banned_until = ? WHERE id = ?').bind(until, id).run()
  return json({ ok: true, bannedUntil: until })
}
