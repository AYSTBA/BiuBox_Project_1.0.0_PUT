/**
 * BiuBox 品牌标志 · 潮流单色线条画
 * 设计：对话框盒子（Box + 论坛发言）+ 角色表情（眉/眼/笑）+ 能量火花（Biu!）
 * @param {number} [size=26] - 图标尺寸
 */
export default function Logo({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="brand-logo"
    >
      {/* 对话框盒子主体 + 尾巴（Box + 发言） */}
      <path d="M10 5 H22 A5 5 0 0 1 27 10 V20 A5 5 0 0 1 22 25 H18 L16 30 L14 25 H10 A5 5 0 0 1 5 20 V10 A5 5 0 0 1 10 5 Z" />
      {/* 眉毛（态度感） */}
      <path d="M9.5 9 L14 11" />
      <path d="M22.5 9 L18 11" />
      {/* 眼睛（实心） */}
      <circle cx="13" cy="13.5" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="13.5" r="1.7" fill="currentColor" stroke="none" />
      {/* 大笑 */}
      <path d="M11 16.5 Q 16 22 21 16.5" />
      {/* 能量火花（Biu!） */}
      <path d="M29 1.5 L29 5.5 M27 3.5 L31 3.5" />
    </svg>
  )
}
