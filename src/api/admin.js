/**
 * 管理员后台接口
 * Cloudflare 后端契约：
 *   GET    /api/admin/reports                              -> Report[]
 *   POST   /api/admin/reports/:id/destroy                  -> { ok }
 *   POST   /api/admin/reports/:id/keep                      -> { ok }
 *   GET    /api/admin/revoked                              -> RevokedItem[]
 *   GET    /api/admin/users?keyword=                       -> User[]
 *   POST   /api/admin/users/:id/delete                     -> { ok }   注销账号
 *   POST   /api/admin/users/:id/ban                        -> { ok }   禁言 { days }
 *   POST   /api/admin/users/:id/promote                    -> { ok }   分封为管理员附属
 *   POST   /api/admin/users/:id/demote                     -> { ok }   撤销管理员附属
 *   POST   /api/report                                     -> { ok }   举报 { targetType, targetId, reason }
 *
 * 字段结构保持与 mock 一致。Beta 阶段（USE_MOCK）在 localStorage 持久化。
 */
import { http, USE_MOCK } from './client'
import { ADMIN_USER } from './mock'
import {
  removeUserContent,
  getRevokedList,
  revokeTopic,
  revokeReply,
  archiveRevoked,
} from './topics'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const USERS_KEY = 'biubox_users'
const REPORTS_KEY = 'biubox_reports'

// 举报预设原因
export const REPORT_REASONS = [
  '垃圾广告 / 推广',
  '辱骂 / 人身攻击',
  '色情 / 低俗内容',
  '违法违规信息',
  '泄露他人隐私',
  '刷屏 / 灌水',
  '其他',
]

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

function readReports() {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]')
  } catch {
    return []
  }
}

function writeReports(list) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(list))
}

/* ---------- 举报信箱 ---------- */

export async function fetchReports() {
  if (USE_MOCK) {
    await delay(220)
    return readReports().filter((r) => r.status === 'pending')
  }
  return http.get('/admin/reports')
}

export async function destroyContent(reportId) {
  if (USE_MOCK) {
    await delay(280)
    const reports = readReports()
    const r = reports.find((x) => x.id === reportId)
    if (!r) throw new Error('举报记录不存在')
    r.status = 'destroyed'
    r.resolvedAt = new Date().toISOString()
    writeReports(reports)
    // 举报销毁：通过 topics.js 的撤销逻辑统一归档
    // 即使内存态已重置（刷新页面）找不到话题，也用举报快照直接归档
    if (r.targetType === 'topic') {
      try {
        await revokeTopic(r.targetId)
      } catch {
        // 内存态已重置，用举报快照直接归档
        archiveRevoked({
          targetType: 'topic',
          targetId: r.targetId,
          snapshot: r.snapshot,
          reason: `举报销毁：${r.reason}`,
        })
      }
    } else if (r.targetType === 'reply' && r.targetTopicId) {
      try {
        await revokeReply(r.targetTopicId, r.targetId)
      } catch {
        archiveRevoked({
          targetType: 'reply',
          targetId: r.targetId,
          topicId: r.targetTopicId,
          snapshot: r.snapshot,
          reason: `举报销毁：${r.reason}`,
        })
      }
    }
    return { ok: true }
  }
  return http.post(`/admin/reports/${reportId}/destroy`)
}

export async function keepContent(reportId) {
  if (USE_MOCK) {
    await delay(220)
    const reports = readReports()
    const r = reports.find((x) => x.id === reportId)
    if (!r) throw new Error('举报记录不存在')
    r.status = 'kept'
    r.resolvedAt = new Date().toISOString()
    writeReports(reports)
    return { ok: true }
  }
  return http.post(`/admin/reports/${reportId}/keep`)
}

/* ---------- 撤销内容 ---------- */

export async function fetchRevoked() {
  if (USE_MOCK) {
    await delay(220)
    // 从 topics.js 统一读取撤销列表（含过期清理）
    return getRevokedList()
  }
  return http.get('/admin/revoked')
}

/* ---------- 查找用户 ---------- */

export async function searchUsers(keyword) {
  if (USE_MOCK) {
    await delay(260)
    const users = readUsers()
    const kw = (keyword || '').trim().toLowerCase()
    const matched = kw
      ? users.filter(
          (u) =>
            u.nickname.toLowerCase().includes(kw) ||
            u.account.toLowerCase().includes(kw) ||
            (u.realName && u.realName.toLowerCase().includes(kw)),
        )
      : users
    // 不返回管理员密码
    return matched.map(({ password: _pw, ...rest }) => rest)
  }
  return http.get(`/admin/users?keyword=${encodeURIComponent(keyword || '')}`)
}

export async function deleteUser(userId) {
  if (USE_MOCK) {
    await delay(300)
    const users = readUsers()
    const u = users.find((x) => x.id === userId)
    if (!u) throw new Error('用户不存在')
    if (u.role === 'admin') throw new Error('管理员账号不可注销')
    // 永久删除该用户发布的所有内容（话题 + 回复）
    removeUserContent(userId)
    // 从用户列表中彻底清除
    const remaining = users.filter((x) => x.id !== userId)
    writeUsers(remaining)
    return { ok: true }
  }
  return http.post(`/admin/users/${userId}/delete`)
}

export async function banUser(userId, days) {
  if (USE_MOCK) {
    await delay(280)
    const users = readUsers()
    const u = users.find((x) => x.id === userId)
    if (!u) throw new Error('用户不存在')
    if (u.role === 'admin') throw new Error('管理员账号不可禁言')
    const until = new Date(Date.now() + days * 864e5).toISOString()
    u.bannedUntil = until
    writeUsers(users)
    return { ok: true, bannedUntil: until }
  }
  return http.post(`/admin/users/${userId}/ban`, { days })
}

export async function promoteUser(userId) {
  if (USE_MOCK) {
    await delay(300)
    const users = readUsers()
    const u = users.find((x) => x.id === userId)
    if (!u) throw new Error('用户不存在')
    if (u.role === 'admin') throw new Error('该账号已是管理员')
    u.role = 'subordinate'
    u.subordinateOf = ADMIN_USER.id
    writeUsers(users)
    return { ok: true }
  }
  return http.post(`/admin/users/${userId}/promote`)
}

export async function demoteUser(userId) {
  if (USE_MOCK) {
    await delay(300)
    const users = readUsers()
    const u = users.find((x) => x.id === userId)
    if (!u) throw new Error('用户不存在')
    if (u.role === 'admin') throw new Error('管理员账号不可撤销附属')
    u.role = 'user'
    delete u.subordinateOf
    writeUsers(users)
    return { ok: true }
  }
  return http.post(`/admin/users/${userId}/demote`)
}

/* ---------- 普通用户举报 ---------- */

export async function reportContent({ targetType, targetId, reason, snapshot, topicId }) {
  if (USE_MOCK) {
    await delay(300)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const reports = readReports()
    // 同一用户对同一内容不重复举报
    if (
      reports.some(
        (r) =>
          r.targetId === targetId &&
          r.reporterId === me.id &&
          r.status === 'pending',
      )
    ) {
      throw new Error('你已举报过该内容，请等待管理员处理')
    }
    reports.push({
      id: `report_${Date.now()}`,
      targetType,
      targetId,
      targetTopicId: topicId || null,
      reporterId: me.id,
      reporterNickname: me.nickname,
      reason: reason || '其他',
      snapshot,
      createdAt: new Date().toISOString(),
      status: 'pending',
    })
    writeReports(reports)
    return { ok: true }
  }
  return http.post('/report', { targetType, targetId, reason })
}

/**
 * 判断用户是否处于禁言状态。
 * 返回 null 表示未禁言，否则返回到期 ISO 时间。
 */
export function getBanStatus(user) {
  if (!user || !user.bannedUntil) return null
  if (new Date(user.bannedUntil).getTime() > Date.now()) {
    return user.bannedUntil
  }
  return null
}
