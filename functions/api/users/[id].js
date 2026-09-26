// GET /api/users/:id  —— 获取用户资料（含认识我页面）
import { json, error, getToken, getUserFromToken, parseJSON } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env, params } = context
  const { id } = params

  const u = await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first()
  if (!u) return error('用户不存在', 404)

  // 判断请求者是否为本人（本人始终可见真实姓名/联系方式）
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  const isOwner = !!(me && me.id === id)

  const profile = parseJSON(u.profile, {})

  return json({
    id: u.id,
    nickname: u.nickname,
    realName: isOwner || profile.showRealName ? u.real_name : null,
    className: u.class_name,
    contact: isOwner || profile.showContact ? u.contact : null,
    account: u.account,
    avatarColor: u.avatar_color,
    role: u.role,
    bannedUntil: u.banned_until,
    subordinateOf: u.subordinate_of,
    createdAt: u.created_at,
    profile: {
      showRealName: profile.showRealName ?? false,
      showContact: profile.showContact ?? false,
      socials: profile.socials || [],
      bioCode: profile.bioCode || '',
    },
  })
}
