/**
 * 圈子接口
 * Cloudflare 后端契约：
 *   GET /api/circles -> [{ id, name, desc, color }]
 */
import { http, USE_MOCK } from './client'
import { MOCK_CIRCLES } from './mock'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchCircles() {
  if (USE_MOCK) {
    await delay(120)
    return MOCK_CIRCLES
  }
  return http.get('/circles')
}
