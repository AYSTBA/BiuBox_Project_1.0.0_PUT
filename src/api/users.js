/**
 * 用户资料接口 · 认识我页面
 * ------------------------------------------------------------------
 * Cloudflare 后端契约（接入 CF 时 USE_MOCK=false，自动走 http 调用）：
 *   GET  /api/users/:id              -> User（含 profile 字段）
 *   PUT  /api/users/:id/profile      -> { ok, user }   更新认识我资料
 *
 * profile 字段结构：
 *   {
 *     showRealName: boolean,      // 是否公开真实姓名
 *     showContact: boolean,       // 是否公开联系方式
 *     socials: [                  // 社交账号列表
 *       { platform: string, account: string }
 *     ],
 *     bioCode: string             // Markdown 个性化页面代码
 *   }
 *
 * Beta 阶段（USE_MOCK=true）：数据持久化在 localStorage。
 */
import { http, USE_MOCK } from './client'
import { ADMIN_USER } from './mock'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const USERS_KEY = 'biubox_users'

function readUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const idx = list.findIndex(
      (u) => u.id === ADMIN_USER.id || u.nickname === ADMIN_USER.nickname,
    )
    if (idx === -1) list.push({ ...ADMIN_USER })
    else list[idx] = { ...list[idx], ...ADMIN_USER, password: ADMIN_USER.password }
    return list
  } catch {
    return [{ ...ADMIN_USER }]
  }
}

function writeUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list))
}

/** 对外暴露的用户对象（剔除密码、profile 默认值兜底） */
function publicUser(u) {
  const { password: _pw, ...rest } = u
  const profile = u.profile || {}
  return {
    ...rest,
    profile: {
      showRealName: profile.showRealName ?? false,
      showContact: profile.showContact ?? false,
      socials: profile.socials || [],
      bioCode: profile.bioCode || '',
    },
  }
}

/**
 * 获取用户资料（含认识我页面数据）
 * @param {string} id 用户 ID
 */
export async function getUserProfile(id) {
  if (USE_MOCK) {
    await delay(200)
    const users = readUsers()
    const u = users.find((x) => x.id === id)
    if (!u) throw new Error('用户不存在')
    return publicUser(u)
  }
  return http.get(`/users/${id}`)
}

/**
 * 更新认识我页面资料
 * 仅本人可修改（后端校验 token 中的用户 ID 是否匹配）
 * @param {string} id 用户 ID
 * @param {object} data { showRealName, showContact, socials, bioCode }
 */
export async function updateProfile(id, data) {
  if (USE_MOCK) {
    await delay(250)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    if (me.id !== id) {
      throw new Error('无权修改他人资料')
    }
    const users = readUsers()
    const idx = users.findIndex((x) => x.id === id)
    if (idx === -1) throw new Error('用户不存在')
    users[idx].profile = {
      showRealName: !!data.showRealName,
      showContact: !!data.showContact,
      socials: Array.isArray(data.socials) ? data.socials : [],
      bioCode: typeof data.bioCode === 'string' ? data.bioCode : '',
    }
    writeUsers(users)
    const updated = publicUser(users[idx])
    // 同步更新当前登录态
    localStorage.setItem('biubox_user', JSON.stringify(updated))
    return updated
  }
  const res = await http.put(`/users/${id}/profile`, data)
  // 后端返回用户对象，若昵称变更会附带新 token
  const { token, ...user } = res
  if (token) localStorage.setItem('biubox_token', token)
  localStorage.setItem('biubox_user', JSON.stringify(user))
  return user
}
