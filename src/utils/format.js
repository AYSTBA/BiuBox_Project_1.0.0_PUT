/**
 * 时间格式化工具
 */

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * 相对时间 / 简短时间显示
 */
export function formatTime(input) {
  const date = new Date(input)
  const now = new Date()
  const diff = (now - date) / 1000 // 秒

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 86400 * 3) return `${Math.floor(diff / 86400)}天前`

  const sameYear = date.getFullYear() === now.getFullYear()
  const base = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
  return sameYear ? base : `${date.getFullYear()}-${base}`
}

/**
 * 聊天气泡里的完整时间
 */
export function formatFullTime(input) {
  const date = new Date(input)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${WEEK[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
