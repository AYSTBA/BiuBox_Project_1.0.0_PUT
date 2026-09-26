import { Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Sidebar from './Sidebar'

/**
 * 壳层 · 手机端屏幕滑动转场 + 桌面端左侧常驻侧边栏
 *
 * 桌面端（>= 768px）：左侧 Sidebar + 右侧内容区
 * 移动端：原有底部栏，隐藏侧边栏
 */
export default function Layout() {
  const { user } = useApp()
  const location = useLocation()
  const navigationType = useNavigationType()

  // 鉴权守卫：必须在所有 Hook 调用之后早退，否则会违反 Hooks 调用顺序规则
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  // 判断方向
  const isBack = navigationType === 'POP'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="mobile-frame">
        <div className="screen-stack">
          <div
            key={location.pathname}
            className={`screen ${isBack ? 'enter-backward' : 'enter-forward'}`}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
