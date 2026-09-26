// POST /api/topics/:id/like  —— 切换点赞
import { json, error, getToken, getUserFromToken, parseJSON } from '../../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env, params } = context
  const { id } = params

  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const topic = await env.DB.prepare('SELECT liked_by, like_count FROM topics WHERE id = ? LIMIT 1').bind(id).first()
  if (!topic) return error('话题不存在', 404)

  let likedBy = parseJSON(topic.liked_by, [])
  let likeCount = topic.like_count ?? likedBy.length
  let liked

  const idx = likedBy.indexOf(me.id)
  if (idx === -1) {
    likedBy.push(me.id)
    likeCount += 1
    liked = true
  } else {
    likedBy.splice(idx, 1)
    likeCount = Math.max(0, likeCount - 1)
    liked = false
  }

  await env.DB.prepare('UPDATE topics SET liked_by = ?, like_count = ? WHERE id = ?')
    .bind(JSON.stringify(likedBy), likeCount, id).run()

  return json({ liked, likeCount })
}
