// GET /api/admin/users?keyword=
import { json, error, getToken, getUserFromToken } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me || (me.role !== 'admin' && me.role !== 'subordinate')) {
    return error('无权限', 403)
  }

  const url = new URL(request.url)
  const keyword = (url.searchParams.get('keyword') || '').trim()

  let sql = `SELECT id, nickname, real_name, class_name, contact, account, avatar_color, role, banned_until, subordinate_of, created_at FROM users`
  const params = []
  if (keyword) {
    sql += ` WHERE nickname LIKE ? OR account LIKE ? OR real_name LIKE ?`
    const k = `%${keyword}%`
    params.push(k, k, k)
  }
  sql += ` ORDER BY created_at DESC`

  const rows = await env.DB.prepare(sql).bind(...params).all()
  return json(rows.results.map((u) => ({
    id: u.id,
    nickname: u.nickname,
    realName: u.real_name,
    className: u.class_name,
    contact: u.contact,
    account: u.account,
    avatarColor: u.avatar_color,
    role: u.role,
    bannedUntil: u.banned_until,
    subordinateOf: u.subordinate_of,
    createdAt: u.created_at,
  })))
}
