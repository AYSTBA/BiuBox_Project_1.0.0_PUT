// 统一响应工具
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function error(message, status = 400) {
  return json({ message, error: true }, status)
}

// 从请求体解析 JSON
export async function parseBody(request) {
  const ct = request.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return await request.json()
  }
  if (ct.includes('multipart/form-data')) {
    const form = await request.formData()
    const obj = {}
    for (const [k, v] of form.entries()) {
      if (obj[k]) {
        if (Array.isArray(obj[k])) obj[k].push(v)
        else obj[k] = [obj[k], v]
      } else {
        obj[k] = v
      }
    }
    return obj
  }
  return {}
}

// 从 Authorization header 解析 token（mock 风格）
export function getToken(request) {
  const auth = request.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/)
  return m ? m[1] : null
}

// 根据 token 解析出 account（mock token 格式：mock.<base64(account)>.beta）
export function getAccountFromToken(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'mock' || parts[2] !== 'beta') return null
  try {
    return decodeURIComponent(escape(atob(parts[1])))
  } catch {
    return null
  }
}

// 根据 token 查询用户
export async function getUserFromToken(DB, token) {
  const account = getAccountFromToken(token)
  if (!account) return null
  const stmt = DB.prepare('SELECT * FROM users WHERE account = ? OR nickname = ? LIMIT 1')
  const user = await stmt.bind(account, account).first()
  return user || null
}

// 生成 mock token
export function makeToken(account) {
  return `mock.${btoa(unescape(encodeURIComponent(account)))}.beta`
}

// 脱敏用户（去除密码）+ 字段名 snake_case -> camelCase
export function publicUser(u) {
  if (!u) return null
  return {
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
  }
}

// 生成 ID
export function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// 解析 JSON 字段（安全）
export function parseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback
  } catch {
    return fallback
  }
}

// 头像色板
const AVATAR_COLORS = ['#0f4c5c', '#1f7a6e', '#c9a961', '#e07856', '#8b6fb0', '#3a7d44', '#2c6e8f', '#b5546a', '#2E6A45', '#7a5aa0']

// 根据昵称生成稳定的头像颜色（相同昵称总是得到相同颜色）
export function colorFromNickname(nickname) {
  if (!nickname) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash * 31 + nickname.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}
