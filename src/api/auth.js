/**
 * 认证相关接口
 * Cloudflare 后端契约：
 *   POST /api/auth/login    { account, password }                      -> { token, user }
 *   POST /api/auth/register { nickname, realName, className, contact, account, password } -> { token, user }
 *   GET  /api/auth/me                                                 -> { user }
 *
 * Beta 阶段（USE_MOCK）：注册用户持久化在 localStorage，
 * 登录会校验已注册账号（昵称或账号均可匹配）+ 密码，未注册或密码错误将拒绝。
 */
import { http, USE_MOCK } from './client'
import { ADMIN_USER } from './mock'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const AVATAR_COLORS = ['#2E6A45', '#1f7a6e', '#c9a961', '#e07856', '#8b6fb0', '#3a7d44', '#2c6e8f', '#b5546a']
const USERS_KEY = 'biubox_users'
const TOKEN_KEY = 'biubox_token'
const USER_KEY = 'biubox_user'

function readUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    // 确保预置管理员始终存在且密码/权限不可被篡改
    const idx = list.findIndex(
      (u) => u.id === ADMIN_USER.id || u.nickname === ADMIN_USER.nickname,
    )
    if (idx === -1) {
      list.push({ ...ADMIN_USER })
    } else {
      list[idx] = { ...list[idx], ...ADMIN_USER, password: ADMIN_USER.password }
    }
    return list
  } catch {
    return [{ ...ADMIN_USER }]
  }
}

function writeUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list))
}

function publicUser(u) {
  // 不对外暴露密码（rest siblings 写法比解构出未使用变量更安全）
  const { password: _pw, ...rest } = u
  return rest
}

export async function login({ account, password }) {
  if (USE_MOCK) {
    await delay(450)
    if (!account || !password) {
      throw new Error('请输入昵称和密码')
    }
    const users = readUsers()
    // 昵称 或 账号 均可作为登录标识
    const found = users.find(
      (u) => u.account === account || u.nickname === account,
    )
    if (!found) {
      throw new Error('该账号未注册，请先注册')
    }
    if (found.password !== password) {
      throw new Error('账号或密码错误')
    }
    const user = publicUser(found)
    const token = `mock.${btoa(unescape(encodeURIComponent(found.account)))}.beta`
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return { token, user }
  }
  const res = await http.post('/auth/login', { account, password })
  localStorage.setItem(TOKEN_KEY, res.token)
  localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  return res
}

export async function register(payload) {
  const { nickname, realName, className, contact, password } = payload
  // 账号即昵称，登录用昵称即可
  const account = nickname
  if (USE_MOCK) {
    await delay(550)
    if (!nickname || !realName || !className || !contact || !password) {
      throw new Error('请完整填写所有注册信息')
    }
    const users = readUsers()
    // 保留昵称 "BiuBox" 仅供官方管理员使用
    if (nickname.trim() === 'BiuBox') {
      throw new Error('该昵称为官方保留昵称，不可注册')
    }
    if (users.some((u) => u.nickname === nickname)) {
      throw new Error('该昵称已被使用')
    }
    const user = {
      id: `u_${Date.now()}`,
      nickname,
      realName,
      className,
      contact,
      account,
      password,
      avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
      role: 'user',
      bannedUntil: null,
      subordinateOf: null,
    }
    users.push(user)
    writeUsers(users)
    const pub = publicUser(user)
    const token = `mock.${btoa(unescape(encodeURIComponent(account)))}.beta`
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(pub))
    return { token, user: pub }
  }
  const res = await http.post('/auth/register', {
    nickname,
    realName,
    className,
    contact,
    account,
    password,
  })
  localStorage.setItem(TOKEN_KEY, res.token)
  localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  return res
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

/**
 * 校验本地会话是否仍有效。
 * Mock 模式下，若当前用户不在已注册用户列表中（例如旧版 mock 残留的会话），
 * 则视为未登录并清理，确保网站在未正确登录时打开即进入登录页。
 */
export function getValidCurrentUser() {
  const u = getCurrentUser()
  if (!u) return null
  if (USE_MOCK) {
    const users = readUsers()
    const exists = users.some(
      (x) => x.id === u.id || x.account === u.account || x.nickname === u.nickname,
    )
    if (!exists) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
  }
  return u
}
