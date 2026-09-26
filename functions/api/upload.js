// POST /api/upload  图片上传到 KV
import { json, error, getToken, getUserFromToken, genId } from '../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const token = getToken(request)
  const me = await getUserFromToken(env.DB, token)
  if (!me) return error('请先登录', 401)

  const form = await request.formData()
  const file = form.get('file')
  if (!file) return error('未上传文件', 400)

  // 读取文件并转 base64 data URL
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = file.type || 'image/png'
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  const dataUrl = `data:${type};base64,${b64}`

  const key = genId('img')
  await env.IMAGES.put(key, dataUrl)

  return json({ url: `/api/images/${key}`, key })
}
