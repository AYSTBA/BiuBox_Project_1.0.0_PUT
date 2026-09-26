// POST /api/auth/register
import { json, error, parseBody, makeToken, genId, colorFromNickname } from '../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const body = await parseBody(request)
  const { nickname, realName, className, contact, password } = body

  if (!nickname || !realName || !className || !contact || !password) {
    return error('请完整填写所有注册信息', 400)
  }
  if (nickname.trim() === 'BiuBox') {
    return error('该昵称为官方保留昵称，不可注册', 400)
  }

  // 检查昵称是否已存在
  const exists = await env.DB.prepare(
    'SELECT id FROM users WHERE nickname = ? LIMIT 1'
  ).bind(nickname).first()
  if (exists) {
    return error('该昵称已被使用', 400)
  }

  // 根据昵称生成头像颜色
  const avatarColor = colorFromNickname(nickname)

  const id = genId('u')
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO users (id, nickname, real_name, class_name, contact, account, password, avatar_color, role, banned_until, subordinate_of, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', NULL, NULL, ?)`
  ).bind(id, nickname, realName, className, contact, nickname, password, avatarColor, now).run()

  const user = {
    id, nickname, realName, className, contact,
    account: nickname, avatarColor, role: 'user',
    bannedUntil: null, subordinateOf: null, createdAt: now,
  }

  const token = makeToken(nickname)
  return json({ token, user })
}
