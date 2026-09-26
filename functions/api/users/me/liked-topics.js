// GET /api/users/me/liked-topics  —— 当前用户点赞过的话题
import { json, error, getToken, getUserFromToken, parseJSON } from '../../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env } = context

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const rows = await env.DB.prepare(
    `SELECT t.*, u.nickname as author_nickname, u.avatar_color as author_avatar_color, u.role as author_role
     FROM topics t JOIN users u ON t.author_id = u.id
     WHERE t.revoked_at IS NULL
     ORDER BY t.created_at DESC`
  ).all()

  const topics = rows.results
    .map((t) => {
      const likedBy = parseJSON(t.liked_by, [])
      if (!likedBy.includes(me.id)) return null
      const softDeletedBy = parseJSON(t.soft_deleted_by, [])
      if (softDeletedBy.includes(me.id)) return null
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
        liked: true,
      }
    })
    .filter(Boolean)

  return json(topics)
}
