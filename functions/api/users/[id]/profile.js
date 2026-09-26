// PUT /api/users/:id/profile  —— 更新认识我页面资料（仅本人）
// 支持修改：nickname、realName、contact、showRealName、showContact、socials、bioCode
// 昵称变更时：校验唯一性、更新 account 字段、重新生成头像颜色、下发新 token
import { json, error, getToken, getUserFromToken, parseBody, parseJSON, colorFromNickname, makeToken } from '../../../_lib/helpers.js'

export async function onRequestPut(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)
  if (me.id !== id) return error('无权修改他人资料', 403)

  const body = await parseBody(request)
  const { nickname, realName, contact, showRealName, showContact, socials, bioCode } = body

  let newNickname = me.nickname
  let newRealName = me.real_name
  let newContact = me.contact
  let avatarColor = me.avatar_color
  let newToken = null

  // 昵称变更
  if (nickname !== undefined && nickname !== null) {
    const trimmed = String(nickname).trim()
    if (!trimmed) return error('昵称不能为空', 400)
    if (trimmed === 'BiuBox') return error('该昵称为官方保留昵称，不可使用', 400)
    if (trimmed !== me.nickname) {
      // 唯一性校验
      const dup = await env.DB.prepare(
        'SELECT id FROM users WHERE nickname = ? AND id != ? LIMIT 1'
      ).bind(trimmed, id).first()
      if (dup) return error('该昵称已被使用', 400)
      newNickname = trimmed
      avatarColor = colorFromNickname(trimmed)
      newToken = makeToken(trimmed)
    }
  }

  // 真实姓名变更
  if (realName !== undefined && realName !== null) {
    const trimmed = String(realName).trim()
    if (!trimmed) return error('真实姓名不能为空', 400)
    newRealName = trimmed
  }

  // 联系方式变更
  if (contact !== undefined && contact !== null) {
    const trimmed = String(contact).trim()
    if (!trimmed) return error('联系方式不能为空', 400)
    newContact = trimmed
  }

  // 认识我隐私/个性化设置
  const profile = parseJSON(me.profile, {})
  const newProfile = {
    showRealName: showRealName !== undefined ? !!showRealName : (profile.showRealName ?? false),
    showContact: showContact !== undefined ? !!showContact : (profile.showContact ?? false),
    socials: socials !== undefined ? (Array.isArray(socials) ? socials : []) : (profile.socials || []),
    bioCode: bioCode !== undefined ? (typeof bioCode === 'string' ? bioCode : '') : (profile.bioCode || ''),
  }

  await env.DB.prepare(
    'UPDATE users SET nickname = ?, real_name = ?, contact = ?, account = ?, avatar_color = ?, profile = ? WHERE id = ?'
  ).bind(newNickname, newRealName, newContact, newNickname, avatarColor, JSON.stringify(newProfile), id).run()

  const user = {
    id: me.id,
    nickname: newNickname,
    realName: newRealName,
    className: me.class_name,
    contact: newContact,
    account: newNickname,
    avatarColor,
    role: me.role,
    bannedUntil: me.banned_until,
    subordinateOf: me.subordinate_of,
    createdAt: me.created_at,
    profile: newProfile,
  }

  const resp = { ...user }
  if (newToken) resp.token = newToken
  return json(resp)
}
