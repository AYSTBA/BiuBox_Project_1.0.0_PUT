/**
 * BiuBox API 客户端 —— Cloudflare 接口调用规范
 * ------------------------------------------------------------------
 * 所有数据交互均通过此模块发起，便于后续无缝接入 Cloudflare Pages
 * Functions / Workers / D1 / R2 后端。
 *
 * 部署后端示例（Cloudflare）：
 *   - Pages Functions:  /api/**  -> functions/api/**  (边缘运行时)
 *   - D1 数据库:        绑定名 DB
 *   - R2 图床:          绑定名 IMAGES，上传后返回对象 URL
 *
 * 当前为 Beta 阶段，未配置真实后端时使用内置 MOCK 数据，
 * 切换仅需把 USE_MOCK 置为 false 并填写 API_BASE_URL。
 */

// 是否启用 Mock。生产部署时改为 false，并配置 API_BASE_URL。
export const USE_MOCK = false

// Cloudflare API 基础地址（部署后填写，例如 https://biubox-api.pages.dev 或自定义域名）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 请求超时（毫秒）
const DEFAULT_TIMEOUT = 12000

/**
 * 统一请求方法
 * @param {string} path  接口路径，例如 '/topics'
 * @param {object} options fetch 配置
 * @returns {Promise<any>}
 */
export async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`

  const token = localStorage.getItem('biubox_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  // FormData（图片上传等）时移除 Content-Type，交由浏览器自动设置 boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    const isJson =
      res.headers.get('content-type')?.includes('application/json')

    const data = isJson ? await res.json() : await res.text()

    if (!res.ok) {
      const msg =
        (data && data.message) ||
        (typeof data === 'string' ? data : '请求失败') ||
        `HTTP ${res.status}`
      const err = new Error(msg)
      err.status = res.status
      err.payload = data
      throw err
    }

    return data
  } finally {
    clearTimeout(timer)
  }
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) =>
    request(path, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, opts) =>
    request(path, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  // 上传 FormData（图片等）
  upload: (path, formData, opts) =>
    request(path, { ...opts, method: 'POST', body: formData }),
}
