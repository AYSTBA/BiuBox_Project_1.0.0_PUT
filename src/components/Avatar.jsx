/**
 * 头像：取昵称首字 + 个人色，无图片依赖。
 * M3 风格：圆形（圆角 9999px）+ emphasized 字重。
 * 传入 onClick 后头像变为可点击（用于跳转认识我页面）。
 */
export default function Avatar({ name = '?', color = '#2E6A45', size = 40, onClick }) {
  const ch = (name || '?').trim().charAt(0).toUpperCase()
  const fontSize = Math.max(13, Math.round(size * 0.45))
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`avatar${onClick ? ' clickable' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -24)})`,
      }}
      onClick={onClick}
      aria-label={onClick ? `查看 ${name} 的认识我` : undefined}
    >
      {ch}
    </Tag>
  )
}

function shade(hex, percent) {
  const c = hex.replace('#', '')
  const num = parseInt(
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c,
    16,
  )
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00ff) + percent
  let b = (num & 0x0000ff) + percent
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
