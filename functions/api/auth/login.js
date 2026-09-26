// POST /api/auth/login
import { json, error, parseBody, makeToken, publicUser } from '../../_lib/helpers.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const body = await parseBody(request)
  const { account, password } = body

  if (!account || !password) {
    return error('请输入昵称和密码', 400)
  }

  const stmt = env.DB.prepare(
    'SELECT * FROM users WHERE account = ? OR nickname = ? LIMIT 1'
  )
  const user = await stmt.bind(account, account).first()

  if (!user) {
    return error('该账号未注册，请先注册', 401)
  }
  if (user.password !== password) {
    return error('账号或密码错误', 401)
  }

  const token = makeToken(user.account)
  return json({ token, user: publicUser(user) })
}
