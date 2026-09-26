import { useEffect, useState } from 'react'
import Icon from './Icon'

/**
 * M3 顶部应用栏（高 64dp · surface 背景 · 滚动变 surfaceContainer）
 * @param {object} props
 * @param {string} props.title - 标题
 * @param {function} [props.onBack] - 左侧返回按钮回调（不传则不显示）
 * @param {boolean} [props.elevated] - 是否启用滚动时的 surfaceContainer 背景变化
 * @param {React.ReactNode} [props.actions] - 右侧图标按钮组
 */
export default function TopAppBar({ title, onBack, elevated = true, actions }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!elevated) return
    function onScroll(e) {
      const sc = e.target.scrollTop || e.target.scrollingElement?.scrollTop || 0
      setScrolled(sc > 8)
    }
    const screenEl = document.querySelector('.screen')
    if (screenEl) {
      screenEl.addEventListener('scroll', onScroll, { passive: true })
      return () => screenEl.removeEventListener('scroll', onScroll)
    }
  }, [elevated])

  return (
    <header
      className={`top-app-bar ${scrolled ? 'scrolled' : ''}`}
      style={{ marginLeft: onBack ? 0 : 4 }}
    >
      {onBack && (
        <button
          type="button"
          className="icon-button"
          onClick={onBack}
          aria-label="返回"
        >
          <Icon name="arrow_back" className="size-md" />
        </button>
      )}
      <div className="top-app-bar-title">{title}</div>
      {actions}
    </header>
  )
}
