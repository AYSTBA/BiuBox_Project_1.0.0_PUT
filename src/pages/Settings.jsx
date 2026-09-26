import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { deleteUser } from '../api/admin'
import TopAppBar from '../components/TopAppBar'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'
import { formatFullTime } from '../utils/format'
import { createPortal } from 'react-dom'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout, showToast, isAdmin, isSubordinate, banUntil } = useApp()
  const [confirming, setConfirming] = useState(null) // 'logout' | 'delete' | null

  async function confirmDeleteAccount() {
    setConfirming(null)
    if (!user) return
    const uid = user.id
    try {
      await deleteUser(uid)
    } catch (e) {
      console.warn('注销删除用户记录失败:', e.message)
    }
    navigate('/login', { replace: true })
    logout()
    showToast('账号已注销，所有内容已删除', 'success')
  }

  function confirmLogout() {
    setConfirming(null)
    logout()
    showToast('已退出登录', 'success')
    navigate('/login', { replace: true })
  }

  function handleBack() {
    navigate('/')
  }

  return (
    <>
      <TopAppBar title="设置" onBack={handleBack} />

      <div className="screen-content">
        {/* 个人信息大卡片（376×192dp） */}
        <section className="profile-card">
          {user ? (
            <>
              <Avatar name={user.nickname} color={user.avatarColor} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name">
                  {user.nickname}
                  {isAdmin && <span className="tag-official">官方</span>}
                  {isSubordinate && (
                    <span className="tag-subordinate">管理员</span>
                  )}
                </div>
                <div className="info">
                  {user.realName} · {user.className}
                </div>
                <div className="info">{user.contact}</div>
              </div>
            </>
          ) : (
            <>
              <Avatar name="?" color="#707972" size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name">未登录</div>
                <div className="info">登录后可发帖与评论</div>
              </div>
            </>
          )}
        </section>

        {/* 禁言状态 */}
        {banUntil && (
          <div className="ban-banner">
            <Icon name="block" className="size-sm" /> 你已被禁言至{' '}
            {formatFullTime(banUntil).slice(0, 16)}，期间无法发言
          </div>
        )}

        {/* 其他信息大卡片（376×476dp） */}
        <section className="settings-list">
          <div className="setting-row">
            <div className="ms-icon">
              <Icon name="alternate_email" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">账号</div>
              <div className="desc">用于登录的账号</div>
            </div>
            <span className="value">{user?.account || '—'}</span>
          </div>
          <div className="setting-divider" />
          <div className="setting-row">
            <div className="ms-icon">
              <Icon name="forum" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">所在论坛</div>
              <div className="desc">校园论坛</div>
            </div>
            <span className="value">龙城初级中学</span>
          </div>
          <div className="setting-divider" />
          <div className="setting-row" onClick={() => navigate(`/user/${user?.id}`)}>
            <div className="ms-icon">
              <Icon name="person" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">认识我</div>
              <div className="desc">个人资料与个性化主页</div>
            </div>
            <Icon name="chevron_right" className="size-md text-on-surface-variant" />
          </div>
          <div className="setting-divider" />
          <div className="setting-row" onClick={() => navigate('/liked')}>
            <div className="ms-icon">
              <Icon name="favorite" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">点赞话题</div>
              <div className="desc">我点过赞的话题</div>
            </div>
            <Icon name="chevron_right" className="size-md text-on-surface-variant" />
          </div>
          <div className="setting-divider" />
          <div className="setting-row" onClick={() => navigate('/admin')}>
            <div className="ms-icon">
              <Icon name="shield" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">管理模式</div>
              <div className="desc">举报信箱 / 撤销内容 / 用户管理</div>
            </div>
            <Icon name="chevron_right" className="size-md text-on-surface-variant" />
          </div>
          <div className="setting-divider" />
          <div className="setting-row" onClick={() => window.open('/terms', '_blank')}>
            <div className="ms-icon">
              <Icon name="description" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">论坛协议</div>
              <div className="desc">用户服务协议</div>
            </div>
            <Icon name="open_in_new" className="size-sm text-on-surface-variant" />
          </div>
          <div className="setting-divider" />
          <div className="setting-row" onClick={() => window.open('/privacy', '_blank')}>
            <div className="ms-icon">
              <Icon name="privacy_tip" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">隐私政策</div>
              <div className="desc">个人信息处理说明</div>
            </div>
            <Icon name="open_in_new" className="size-sm text-on-surface-variant" />
          </div>
          <div className="setting-divider" />
          <div className="setting-row">
            <div className="ms-icon">
              <Icon name="info" className="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">版本</div>
              <div className="desc">BiuBox 校园论坛</div>
            </div>
            <span className="value">1.0.0</span>
          </div>
        </section>

        {/* 退出 / 注销 按钮组 */}
        <div className="btn-group fill-width" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn filled"
            onClick={() => setConfirming('logout')}
          >
            <Icon name="logout" className="" />
            退出登录
          </button>
          {!isAdmin && (
            <button
              type="button"
              className="btn outlined"
              onClick={() => setConfirming('delete')}
            >
              <Icon name="person_remove" className="" />
              注销账号
            </button>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      {confirming &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => setConfirming(null)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="confirm-modal-title">
                {confirming === 'delete' ? '注销账号' : '退出登录'}
              </h2>
              <p className="confirm-modal-body">
                {confirming === 'delete'
                  ? '注销账号不可撤销，你发布的所有话题和回复都将被永久删除。是否继续？'
                  : '退出后需要重新登录才能使用论坛功能。'}
              </p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="btn text size-s"
                  onClick={() => setConfirming(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className={`btn size-s ${
                    confirming === 'delete' ? 'danger' : 'filled'
                  }`}
                  onClick={
                    confirming === 'delete'
                      ? confirmDeleteAccount
                      : confirmLogout
                  }
                >
                  确认
                </button>
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}
    </>
  )
}
