// GET /api/images/:key  从 KV 读取图片
export async function onRequestGet(context) {
  const { env, params } = context
  const { key } = params

  const dataUrl = await env.IMAGES.get(key)
  if (!dataUrl) {
    return new Response('Not Found', { status: 404 })
  }

  // dataUrl 格式: data:<mime>;base64,<data>
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) {
    return new Response('Invalid image data', { status: 500 })
  }
  const [, mime, b64] = m
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new Response(bytes, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}
