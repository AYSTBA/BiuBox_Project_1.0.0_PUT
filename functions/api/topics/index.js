// GET /api/topics  |  POST /api/topics
import { json, error, parseBody, getToken, getUserFromToken, genId, parseJSON } from '../../_lib/helpers.js'

// 话题列表
export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const circle = url.searchParams.get('circle') || 'all'
  const keyword = (url.searchParams.get('keyword') || '').trim()

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)

  let sql = `SELECT t.*, u.nickname as author_nickname, u.avatar_color as author_avatar_color, u.role as author_role
             FROM topics t JOIN users u ON t.author_id = u.id
             WHERE t.revoked_at IS NULL`
  const params = []

  if (circle && circle !== 'all') {
    sql += ' AND t.circle_id = ?'
    params.push(circle)
  }
  if (keyword) {
    sql += ' AND (t.title LIKE ? OR t.content LIKE ? OR u.nickname LIKE ?)'
    const k = `%${keyword}%`
    params.push(k, k, k)
  }

  sql += ' ORDER BY t.pinned DESC, t.created_at DESC'

  const rows = await env.DB.prepare(sql).bind(...params).all()

  const topics = rows.results.map((t) => {
    const softDeletedBy = parseJSON(t.soft_deleted_by, [])
    if (me && softDeletedBy.includes(me.id)) return null
    const likedBy = parseJSON(t.liked_by, [])
    return {
      id: t.id,
      circleId: t.circle_id,
      author: {
        id: t.author_id,
        nickname: t.author_nickname,
        avatarColor: t.author_avatar_color,
        role: t.author_role,
      },
      title: t.title,
      content: t.content,
      images: parseJSON(t.images, []),
      createdAt: t.created_at,
      replyCount: t.reply_count,
      views: t.views,
      pinned: !!t.pinned,
      likedBy,
      likeCount: t.like_count ?? likedBy.length,
      liked: !!(me && likedBy.includes(me.id)),
    }
  }).filter(Boolean)

  return json(topics)
}

// 创建话题
export async function onRequestPost(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  // 禁言检查
  if (me.banned_until && new Date(me.banned_until).getTime() > Date.now()) {
    return error('你已被禁言，无法发布内容', 403)
  }

  const body = await parseBody(request)
  const { title, content, circleId, images } = body

  if (!title || !content || !circleId) {
    return error('请填写标题、内容和圈子', 400)
  }

  const id = genId('t')
  const now = new Date().toISOString()
  const imagesJson = JSON.stringify(images || [])

  await env.DB.prepare(
    `INSERT INTO topics (id, circle_id, author_id, title, content, images, created_at, reply_count, views, pinned, revoked_at, soft_deleted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NULL, '[]')`
  ).bind(id, circleId, me.id, title, content, imagesJson, now).run()

  return json({
    id,
    circleId,
    author: {
      id: me.id,
      nickname: me.nickname,
      avatarColor: me.avatar_color,
      role: me.role,
    },
    title,
    content,
    images: images || [],
    createdAt: now,
    replyCount: 0,
    views: 0,
    pinned: false,
  })
}
