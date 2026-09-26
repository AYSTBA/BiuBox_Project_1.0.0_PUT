import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Icon from './Icon'
import Avatar from './Avatar'

/**
 * 桌面端左侧常驻侧边栏
 * - 顶部：用户头像 + 昵称
 * - 新建话题（填充按钮）
 * - 设置（填充按钮）
 * - 圈子列表（替代移动端的弹出菜单，常驻可见）
 */
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, circles, currentCircle, setCurrentCircle } = useApp()

  // 当前在首页时圈子筛选才生效；其他页面点击圈子也跳回首页
  function handlePickCircle(id) {
    setCurrentCircle(id)
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  return (
    <aside className="desktop-sidebar">
      {user && (
        <div className="sidebar-user">
          <Avatar
            name={user.nickname}
            color={user.avatarColor}
            size={44}
            onClick={() => navigate(`/user/${user.id}`)}
          />
          <div className="sidebar-user-name">{user.nickname}</div>
        </div>
      )}

      <div className="sidebar-buttons">
        <button
          type="button"
          className="btn filled sidebar-btn"
          onClick={() => navigate('/new')}
        >
          <Icon name="add" className="" />
          新建话题
        </button>
        <button
          type="button"
          className="btn filled sidebar-btn"
          onClick={() => navigate('/settings')}
        >
          <Icon name="settings" className="" />
          设置
        </button>
      </div>

      <div className="sidebar-circles">
        <div className="sidebar-circles-title">
          <Icon name="public" className="size-sm" />
          选择圈子
        </div>
        <div className="sidebar-circle-list">
          {circles.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`sidebar-circle-item ${currentCircle === c.id ? 'active' : ''}`}
              onClick={() => handlePickCircle(c.id)}
            >
              <Icon name={c.icon || 'public'} className="" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
