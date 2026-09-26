// GET /api/auth/me
import { json, error, getToken, getUserFromToken, publicUser } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env } = context
  const token = getToken(request)
  const user = await getUserFromToken(env.DB, token)
  if (!user) return error('未登录', 401)
  return json({ user: publicUser(user) })
}
