/**
 * Material Symbols Rounded 图标组件
 * 所有 UI 图标统一通过此组件渲染，使用 Material Symbols Rounded 字体。
 */
import { useMemo } from 'react'

/**
 * @param {object} props
 * @param {string} props.name - Material Symbols 图标名（如 'public', 'mood'）
 * @param {boolean} [props.fill=false] - 是否填充
 * @param {number} [props.weight=400] - 字重 100-700
 * @param {number} [props.grade=0] - 等级 -50..200
 * @param {number} [props.opticalSize=24] - 视觉尺寸 20..48
 * @param {string} [props.className] - 额外 class（如 'size-sm'）
 * @param {string} [props.style] - 内联样式
 */
export default function Icon({
  name,
  fill = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  className = '',
  style,
  ...rest
}) {
  const variation = useMemo(
    () =>
      `"FILL" ${fill ? 1 : 0}, "wght" ${weight}, "GRAD" ${grade}, "opsz" ${opticalSize}`,
    [fill, weight, grade, opticalSize],
  )
  return (
    <span
      className={`ms ${className}`}
      style={{ fontVariationSettings: variation, ...style }}
      aria-hidden
      {...rest}
    >
      {name}
    </span>
  )
}
