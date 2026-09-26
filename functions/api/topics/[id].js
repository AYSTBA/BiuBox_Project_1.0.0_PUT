// GET /api/topics/:id
import { json, error, getToken, getUserFromToken, parseJSON } from '../../_lib/helpers.js'

export async function onRequestGet(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)

  const topic = await env.DB.prepare(
    `SELECT t.*, u.nickname as author_nickname, u.avatar_color as author_avatar_color, u.role as author_role
     FROM topics t JOIN users u ON t.author_id = u.id
     WHERE t.id = ? LIMIT 1`
  ).bind(id).first()

  if (!topic || topic.revoked_at) {
    return error('话题不存在或已被撤销', 404)
  }

  const softDeletedBy = parseJSON(topic.soft_deleted_by, [])
  if (me && softDeletedBy.includes(me.id)) {
    return error('话题不存在或已被撤销', 404)
  }

  // 增加浏览量
  await env.DB.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').bind(id).run()

  // 获取回复
  const repliesRes = await env.DB.prepare(
    `SELECT r.*, u.nickname as author_nickname, u.avatar_color as author_avatar_color, u.role as author_role
     FROM replies r JOIN users u ON r.author_id = u.id
     WHERE r.topic_id = ? AND r.revoked_at IS NULL
     ORDER BY r.created_at ASC`
  ).bind(id).all()

  const replies = repliesRes.results
    .map((r) => {
      const rsd = parseJSON(r.soft_deleted_by, [])
      if (me && rsd.includes(me.id)) return null
      return {
        id: r.id,
        author: {
          id: r.author_id,
          nickname: r.author_nickname,
          avatarColor: r.author_avatar_color,
          role: r.author_role,
        },
        content: r.content,
        createdAt: r.created_at,
        mine: me && r.author_id === me.id,
      }
    })
    .filter(Boolean)

  const likedBy = parseJSON(topic.liked_by, [])
  return json({
    topic: {
      id: topic.id,
      circleId: topic.circle_id,
      author: {
        id: topic.author_id,
        nickname: topic.author_nickname,
        avatarColor: topic.author_avatar_color,
        role: topic.author_role,
      },
      title: topic.title,
      content: topic.content,
      images: parseJSON(topic.images, []),
      createdAt: topic.created_at,
      replyCount: topic.reply_count,
      views: topic.views + 1,
      pinned: !!topic.pinned,
      likedBy,
      likeCount: topic.like_count ?? likedBy.length,
      liked: !!(me && likedBy.includes(me.id)),
    },
    replies,
  })
}
