/**
 * 话题接口
 * Cloudflare 后端契约：
 *   GET    /api/topics?circle=&keyword=         -> Topic[]
 *   GET    /api/topics/:id                       -> { topic, replies }
 *   POST   /api/topics                            -> Topic (multipart，含图片)
 *   POST   /api/topics/:id/replies               -> Reply
 *   POST   /api/topics/:id/revoke                -> { ok }  撤销（彻底不可见，归档30天）
 *   POST   /api/topics/:id/soft-delete            -> { ok }  软删除（仅自己不可见）
 *   POST   /api/topics/:id/replies/:rid/revoke   -> { ok }
 *   POST   /api/topics/:id/replies/:rid/soft-delete -> { ok }
 *   POST   /api/upload                            -> { url }  (图片上传 R2)
 *
 * 字段结构保持与 mock.js 一致。
 *
 * 撤销（revoke）：从站内彻底移除，所有用户不可见；
 *   归档到撤销列表，管理员可查看 30 天，期满彻底清除。
 * 软删除（softDelete）：仅删除者自己不可见，其他人正常可见。
 */
import { http, USE_MOCK } from './client'
import { MOCK_TOPICS, MOCK_REPLIES } from './mock'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// 持久化到 localStorage，刷新不丢
const TOPICS_KEY = 'biubox_topics'
const REPLIES_KEY = 'biubox_replies'

function loadTopics() {
  try {
    const saved = localStorage.getItem(TOPICS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 合并 mock 预置话题（如果 saved 里没有的）
      const savedIds = new Set(parsed.map((t) => t.id))
      const missing = MOCK_TOPICS.filter((t) => !savedIds.has(t.id)).map((t) => ({ ...t }))
      return [...missing, ...parsed]
    }
  } catch {}
  // 首次：用 mock 初始化并持久化
  const initial = MOCK_TOPICS.map((t) => ({ ...t }))
  localStorage.setItem(TOPICS_KEY, JSON.stringify(initial))
  return initial
}

function saveTopics() {
  localStorage.setItem(TOPICS_KEY, JSON.stringify(memoryTopics))
}

function loadReplies() {
  try {
    const saved = localStorage.getItem(REPLIES_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 合并 mock 预置回复
      const result = { ...parsed }
      for (const [tid, replies] of Object.entries(MOCK_REPLIES)) {
        if (!result[tid]) result[tid] = JSON.parse(JSON.stringify(replies))
      }
      return result
    }
  } catch {}
  const initial = JSON.parse(JSON.stringify(MOCK_REPLIES))
  localStorage.setItem(REPLIES_KEY, JSON.stringify(initial))
  return initial
}

function saveReplies() {
  localStorage.setItem(REPLIES_KEY, JSON.stringify(memoryReplies))
}

let memoryTopics = loadTopics()
let memoryReplies = loadReplies()

const REVOKED_KEY = 'biubox_revoked'

function readRevoked() {
  try {
    return JSON.parse(localStorage.getItem(REVOKED_KEY) || '[]')
  } catch {
    return []
  }
}

function writeRevoked(list) {
  localStorage.setItem(REVOKED_KEY, JSON.stringify(list))
}

/**
 * 将内容归档到撤销列表（管理员可查看 30 天后清除）
 */
export function archiveRevoked(item) {
  const list = readRevoked()
  list.push({
    id: `revoked_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...item,
    revokedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
  })
  writeRevoked(list)
}

/**
 * 清理已过期的撤销内容（超过 30 天）
 */
function purgeExpiredRevoked() {
  const now = Date.now()
  let list = readRevoked()
  const expired = list.filter((x) => new Date(x.expiresAt).getTime() < now)
  if (expired.length) {
    list = list.filter((x) => new Date(x.expiresAt).getTime() >= now)
    writeRevoked(list)
  }
  return list
}

export async function fetchTopics({ circleId = 'all', keyword = '' } = {}) {
  if (USE_MOCK) {
    await delay(260)
    purgeExpiredRevoked()
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    let list = memoryTopics.slice()
    // 过滤撤销内容（所有用户不可见）
    list = list.filter((t) => !t.revokedAt)
    // 过滤当前用户软删除的内容
    list = list.filter(
      (t) => !t.softDeletedBy || !t.softDeletedBy.includes(me.id),
    )
    if (circleId && circleId !== 'all') {
      list = list.filter((t) => t.circleId === circleId)
    }
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(kw) ||
          t.content.toLowerCase().includes(kw) ||
          t.author.nickname.toLowerCase().includes(kw),
      )
    }
    // 按发布时间倒序
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return list.map((t) => withLike(t, me))
  }
  const query = new URLSearchParams()
  if (circleId && circleId !== 'all') query.set('circle', circleId)
  if (keyword) query.set('keyword', keyword)
  return http.get(`/topics?${query.toString()}`)
}

export async function fetchTopicDetail(id) {
  if (USE_MOCK) {
    await delay(220)
    purgeExpiredRevoked()
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const topic = memoryTopics.find((t) => t.id === id)
    if (!topic || topic.revokedAt) {
      const e = new Error('话题不存在或已被撤销')
      e.status = 404
      throw e
    }
    // 软删除检查：如果当前用户软删除了此话题，对其不可见
    if (topic.softDeletedBy && topic.softDeletedBy.includes(me.id)) {
      const e = new Error('话题不存在或已被撤销')
      e.status = 404
      throw e
    }
    let replies = (memoryReplies[id] || [])
      // 过滤撤销回复
      .filter((r) => !r.revokedAt)
      // 过滤当前用户软删除的回复
      .filter(
        (r) => !r.softDeletedBy || !r.softDeletedBy.includes(me.id),
      )
      // 动态计算 mine：以当前登录用户为准，不依赖存储的值
      .map((r) => ({ ...r, mine: !!(me.id && r.author && r.author.id === me.id) }))
    return { topic: withLike(topic, me), replies }
  }
  return http.get(`/topics/${id}`)
}

export async function createTopic({ title, content, circleId, images = [] }) {
  if (USE_MOCK) {
    await delay(500)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const topic = {
      id: `t_${Date.now()}`,
      circleId,
      author: {
        id: me.id || 'u_anon',
        nickname: me.nickname || '匿名',
        avatarColor: me.avatarColor || '#1f7a6e',
        role: me.role || 'user',
      },
      title: title || content.slice(0, 20),
      content,
      images,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      views: 0,
      pinned: false,
      revokedAt: null,
      softDeletedBy: [],
    }
    memoryTopics = [topic, ...memoryTopics]
    saveTopics()
    memoryReplies[topic.id] = []
    saveReplies()
    return topic
  }
  // 非 mock：先上传图片到 KV，再发送 JSON 创建话题
  const uploaded = []
  for (const img of images) {
    // img 可能是 { file, dataUrl, sizeKB } 或 { url }
    const file = img.file || (img.dataUrl ? await (await fetch(img.dataUrl)).blob() : null)
    if (file) {
      const form = new FormData()
      form.append('file', file)
      const res = await http.upload('/upload', form)
      uploaded.push({ url: res.url })
    } else if (img.url) {
      uploaded.push({ url: img.url })
    }
  }
  return http.post('/topics', { title, content, circleId, images: uploaded })
}

// 防止 500ms 内重复创建回复（双击/触屏抖动）
let lastReplyAt = 0
export async function createReply({ topicId, content }) {
  if (USE_MOCK) {
    const now = Date.now()
    if (now - lastReplyAt < 500) {
      // 重复调用：返回已有回复（去重）
      const existing = (memoryReplies[topicId] || []).find(
        (r) => r.content === content && now - new Date(r.createdAt).getTime() < 2000,
      )
      if (existing) return existing
    }
    lastReplyAt = now
    await delay(300)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const reply = {
      id: `r_${now}`,
      author: {
        id: me.id || 'u_anon',
        nickname: me.nickname || '匿名',
        avatarColor: me.avatarColor || '#1f7a6e',
        role: me.role || 'user',
      },
      content,
      createdAt: new Date().toISOString(),
      mine: true,
      revokedAt: null,
      softDeletedBy: [],
    }
    if (!memoryReplies[topicId]) memoryReplies[topicId] = []
    memoryReplies[topicId].push(reply)
    saveReplies()
    const t = memoryTopics.find((x) => x.id === topicId)
    if (t) t.replyCount += 1
    saveTopics()
    return reply
  }
  return http.post(`/topics/${topicId}/replies`, { content })
}

/* ---------- 撤销（revoke）：彻底从站内移除，归档30天 ---------- */

export async function revokeTopic(topicId) {
  if (USE_MOCK) {
    await delay(200)
    const topic = memoryTopics.find((t) => t.id === topicId)
    if (!topic) throw new Error('话题不存在')
    // 归档到撤销列表
    archiveRevoked({
      targetType: 'topic',
      targetId: topic.id,
      snapshot: {
        title: topic.title,
        content: topic.content,
        authorNickname: topic.author.nickname,
        authorId: topic.author.id,
      },
      reason: '发布者撤销',
    })
    // 从内存中移除（fetchTopics/fetchTopicDetail 不再返回）
    topic.revokedAt = new Date().toISOString()
    saveTopics()
    return { ok: true }
  }
  return http.post(`/topics/${topicId}/revoke`)
}

export async function revokeReply(topicId, replyId) {
  if (USE_MOCK) {
    await delay(200)
    const replies = memoryReplies[topicId] || []
    const r = replies.find((x) => x.id === replyId)
    if (!r) throw new Error('回复不存在')
    archiveRevoked({
      targetType: 'reply',
      targetId: r.id,
      topicId,
      snapshot: {
        content: r.content,
        authorNickname: r.author.nickname,
        authorId: r.author.id,
      },
      reason: '发布者撤销',
    })
    r.revokedAt = new Date().toISOString()
    saveReplies()
    const t = memoryTopics.find((x) => x.id === topicId)
    if (t) t.replyCount = Math.max(0, t.replyCount - 1)
    saveTopics()
    return { ok: true }
  }
  return http.post(`/topics/${topicId}/replies/${replyId}/revoke`)
}

/* ---------- 软删除（softDelete）：仅删除者自己不可见 ---------- */

export async function softDeleteTopic(topicId) {
  if (USE_MOCK) {
    await delay(180)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const topic = memoryTopics.find((t) => t.id === topicId)
    if (!topic) throw new Error('话题不存在')
    if (!topic.softDeletedBy) topic.softDeletedBy = []
    if (!topic.softDeletedBy.includes(me.id)) {
      topic.softDeletedBy.push(me.id)
    }
    saveTopics()
    return { ok: true }
  }
  return http.post(`/topics/${topicId}/soft-delete`)
}

export async function softDeleteReply(topicId, replyId) {
  if (USE_MOCK) {
    await delay(180)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    const replies = memoryReplies[topicId] || []
    const r = replies.find((x) => x.id === replyId)
    if (!r) throw new Error('回复不存在')
    if (!r.softDeletedBy) r.softDeletedBy = []
    if (!r.softDeletedBy.includes(me.id)) {
      r.softDeletedBy.push(me.id)
    }
    saveReplies()
    return { ok: true }
  }
  return http.post(`/topics/${topicId}/replies/${replyId}/soft-delete`)
}

/* ---------- 点赞（like）：切换当前用户对话题的点赞 ---------- */

// 规范化话题的点赞字段，并按当前用户设置 liked 标记
function withLike(topic, me) {
  if (!topic) return topic
  const likedBy = topic.likedBy || []
  const t = { ...topic, likedBy, likeCount: topic.likeCount ?? likedBy.length }
  t.liked = !!(me && me.id && likedBy.includes(me.id))
  return t
}

export async function toggleLike(topicId) {
  if (USE_MOCK) {
    await delay(120)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    if (!me.id) throw new Error('请先登录')
    const topic = memoryTopics.find((t) => t.id === topicId)
    if (!topic) throw new Error('话题不存在')
    if (!topic.likedBy) topic.likedBy = []
    const idx = topic.likedBy.indexOf(me.id)
    let liked
    if (idx === -1) {
      topic.likedBy.push(me.id)
      topic.likeCount = (topic.likeCount || 0) + 1
      liked = true
    } else {
      topic.likedBy.splice(idx, 1)
      topic.likeCount = Math.max(0, (topic.likeCount || 0) - 1)
      liked = false
    }
    saveTopics()
    return { liked, likeCount: topic.likeCount }
  }
  return http.post(`/topics/${topicId}/like`)
}

// 当前用户点赞过的话题列表
export async function getLikedTopics() {
  if (USE_MOCK) {
    await delay(200)
    const me = JSON.parse(localStorage.getItem('biubox_user') || '{}')
    if (!me.id) return []
    const list = memoryTopics
      .filter((t) => !t.revokedAt)
      .filter((t) => t.likedBy && t.likedBy.includes(me.id))
      .filter(
        (t) => !t.softDeletedBy || !t.softDeletedBy.includes(me.id),
      )
      .map((t) => withLike(t, me))
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return list
  }
  return http.get('/users/me/liked-topics')
}

/**
 * 读取撤销列表（管理员专用）
 */
export function getRevokedList() {
  return purgeExpiredRevoked()
}

/**
 * 删除指定用户的所有内容（话题 + 回复）。
 * 用于账号注销时，确保该用户发布的内容全部永久删除。
 * Cloudflare 后端契约：POST /api/admin/users/:id/purge-content
 */
export async function removeUserContent(userId) {
  if (USE_MOCK) {
    // 删除该用户发布的话题及其所有回复
    const topicIds = memoryTopics
      .filter((t) => t.author.id === userId)
      .map((t) => t.id)
    memoryTopics = memoryTopics.filter((t) => t.author.id !== userId)
    saveTopics()
    topicIds.forEach((id) => delete memoryReplies[id])
    // 删除该用户在其他话题下的回复
    Object.keys(memoryReplies).forEach((tid) => {
      const before = memoryReplies[tid].length
      memoryReplies[tid] = memoryReplies[tid].filter(
        (r) => r.author.id !== userId,
      )
      const removed = before - memoryReplies[tid].length
      if (removed > 0) {
        const t = memoryTopics.find((x) => x.id === tid)
        if (t) t.replyCount = Math.max(0, t.replyCount - removed)
      }
    })
    saveReplies()
    saveTopics()
    return { ok: true, removedTopics: topicIds.length }
  }
  return http.post(`/admin/users/${userId}/purge-content`)
}
