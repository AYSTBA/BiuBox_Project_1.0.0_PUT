import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Avatar from '../components/Avatar'
import TopAppBar from '../components/TopAppBar'
import Icon from '../components/Icon'
import { formatTime, formatFullTime } from '../utils/format'
import {
  fetchReports,
  destroyContent,
  keepContent,
  fetchRevoked,
  searchUsers,
  deleteUser,
  banUser,
  promoteUser,
  demoteUser,
} from '../api/admin'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

const BAN_OPTIONS = [
  { label: '1 天', days: 1 },
  { label: '7 天', days: 7 },
  { label: '10 天', days: 10 },
  { label: '30 天', days: 30 },
  { label: '360 天', days: 360 },
]

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin, isSubordinate, showToast } = useApp()
  const [tab, setTab] = useState('reports')

  if (!isAdmin && !isSubordinate) {
    return (
      <>
        <TopAppBar title="管理后台" onBack={() => navigate('/')} />
        <div className="screen-content">
          <div className="empty-state">
            <Icon name="lock" className="" />
            <p>无权访问管理后台</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopAppBar
        title={isAdmin ? '管理员模式' : '管理员附属'}
        onBack={() => navigate('/')}
      />

      <div className="screen-content">
        {/* 子页切换：M3 tabs 风格的胶囊按钮 */}
        <div
          className="auth-mode-tabs"
          style={{ marginBottom: 4, alignSelf: 'stretch' }}
        >
          <button
            type="button"
            className={`auth-mode-tab ${tab === 'reports' ? 'active' : ''}`}
            onClick={() => setTab('reports')}
          >
            举报信箱
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${tab === 'revoked' ? 'active' : ''}`}
            onClick={() => setTab('revoked')}
          >
            撤销内容
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`auth-mode-tab ${tab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              查找用户
            </button>
          )}
        </div>

        {tab === 'reports' && <ReportsPanel showToast={showToast} />}
        {tab === 'revoked' && <RevokedPanel />}
        {tab === 'users' && isAdmin && (
          <UsersPanel showToast={showToast} isAdmin={isAdmin} />
        )}
      </div>
    </>
  )
}

function ReportsPanel({ showToast }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchReports()
      .then(setReports)
      .catch((e) => showToast(e.message || '加载失败', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  function handleDestroy(id) {
    destroyContent(id)
      .then(() => {
        showToast('已销毁该内容', 'success')
        load()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
  }

  function handleKeep(id) {
    keepContent(id)
      .then(() => {
        showToast('已保留该内容', 'success')
        load()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
  }

  if (loading) {
    return (
      <div className="admin-list">
        <div className="skeleton" style={{ height: 100 }} />
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="inbox" className="" />
        <p>暂无被举报的内容</p>
      </div>
    )
  }

  return (
    <div className="admin-list">
      {reports.map((r) => (
        <div key={r.id} className="admin-card">
          <div className="admin-card-head">
            <span className="tag-official">
              {r.targetType === 'topic' ? '话题' : '回复'}
            </span>
            <span>举报人 · {r.reporterNickname}</span>
            <span>·</span>
            <span>{formatTime(r.createdAt)}</span>
          </div>
          <div className="admin-card-body">
            <div className="admin-snapshot">
              {r.snapshot?.title && (
                <div className="snap-title">{r.snapshot.title}</div>
              )}
              <div className="snap-content">
                {r.snapshot?.content || '（无内容）'}
              </div>
              <div className="snap-author">
                发布者：
                {r.snapshot?.authorNickname ||
                  r.snapshot?.author?.nickname ||
                  '未知'}
              </div>
            </div>
            <div className="snap-reason">举报理由：{r.reason}</div>
          </div>
          <div className="admin-card-foot">
            <button
              type="button"
              className="btn danger size-s"
              onClick={() => handleDestroy(r.id)}
            >
              销毁
            </button>
            <button
              type="button"
              className="btn outlined size-s"
              onClick={() => handleKeep(r.id)}
            >
              保留
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RevokedPanel() {
  const [revoked, setRevoked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevoked()
      .then(setRevoked)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="admin-list">
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    )
  }

  if (revoked.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="archive" className="" />
        <p>暂无撤销内容（保留 30 天后自动清除）</p>
      </div>
    )
  }

  return (
    <div className="admin-list">
      {revoked.map((r) => {
        const daysLeft = Math.ceil(
          (new Date(r.expiresAt).getTime() - Date.now()) / 864e5,
        )
        return (
          <div key={r.id} className="admin-card">
            <div className="admin-card-head">
              <span className="tag-banned">已撤销</span>
              <span>{r.targetType === 'topic' ? '话题' : '回复'}</span>
              <span>·</span>
              <span>将于 {daysLeft} 天后清除</span>
            </div>
            <div className="admin-card-body">
              <div className="admin-snapshot">
                {r.snapshot?.title && (
                  <div className="snap-title">{r.snapshot.title}</div>
                )}
                <div className="snap-content">
                  {r.snapshot?.content || '（无内容）'}
                </div>
                <div className="snap-author">
                  发布者：
                  {r.snapshot?.authorNickname ||
                    r.snapshot?.author?.nickname ||
                    '未知'}
                </div>
              </div>
              <div className="snap-reason">撤销原因：{r.reason}</div>
              <div className="snap-reason">
                撤销时间：{formatFullTime(r.revokedAt)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UsersPanel({ showToast, isAdmin }) {
  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [banModal, setBanModal] = useState(null)
  const [promoteModal, setPromoteModal] = useState(null)
  const [demoteModal, setDemoteModal] = useState(null)
  const [promoting, setPromoting] = useState(false)
  const [demoting, setDemoting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(null)

  function handleSearch(e) {
    e?.preventDefault()
    setLoading(true)
    searchUsers(keyword)
      .then(setUsers)
      .catch((err) => showToast(err.message || '查找失败', 'error'))
      .finally(() => setLoading(false))
  }

  function doDelete(id) {
    deleteUser(id)
      .then(() => {
        showToast('已注销该账号', 'success')
        setConfirmingDelete(null)
        setSelected(null)
        handleSearch()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
  }

  function handleBan(id, days) {
    banUser(id, days)
      .then(() => {
        showToast(`已禁言 ${days} 天`, 'success')
        setBanModal(null)
        handleSearch()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
  }

  function handlePromote(id, nickname) {
    setPromoting(true)
    promoteUser(id)
      .then(() => {
        showToast(`已将「${nickname}」分封为管理员附属`, 'success')
        setPromoteModal(null)
        setSelected(null)
        handleSearch()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
      .finally(() => setPromoting(false))
  }

  function handleDemote(id, nickname) {
    setDemoting(true)
    demoteUser(id)
      .then(() => {
        showToast(`已撤销「${nickname}」的管理员附属身份`, 'success')
        setDemoteModal(null)
        setSelected(null)
        handleSearch()
      })
      .catch((e) => showToast(e.message || '操作失败', 'error'))
      .finally(() => setDemoting(false))
  }

  return (
    <div className="col gap-12">
      <form
        className="input-container"
        style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}
        onSubmit={handleSearch}
      >
        <Icon name="search" className="size-sm text-on-surface-variant" />
        <input
          className="input-field"
          type="text"
          placeholder="昵称 / 账号 / 真实姓名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn tonal size-s">
          筛选
        </button>
      </form>

      {loading ? (
        <div className="skeleton" style={{ height: 80 }} />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Icon name="person_search" className="" />
          <p>{keyword ? '未找到匹配用户' : '点击筛选查看所有用户'}</p>
        </div>
      ) : (
        <div className="admin-list">
          {users.map((u) => (
            <div key={u.id} className="admin-user-card">
              <Avatar name={u.nickname} color={u.avatarColor} size={42} />
              <div className="admin-user-info">
                <div className="admin-user-name">
                  {u.nickname}
                  {u.role === 'admin' && (
                    <span className="tag-official">官方</span>
                  )}
                  {u.role === 'subordinate' && (
                    <span className="tag-subordinate">管理员</span>
                  )}
                  {u.bannedUntil &&
                    new Date(u.bannedUntil).getTime() > Date.now() && (
                      <span className="tag-banned">
                        禁言至 {formatFullTime(u.bannedUntil).slice(0, 16)}
                      </span>
                    )}
                </div>
                <div className="admin-user-meta">
                  {u.realName} · {u.className} · {u.contact}
                </div>
              </div>
              <button
                type="button"
                className="btn outlined size-s"
                onClick={() => setSelected(u)}
              >
                管理
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 用户管理弹窗 */}
      {selected &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => setSelected(null)}
          >
            <div
              className="confirm-modal-card user-mgmt-card"
              style={{ maxWidth: 360 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="user-mgmt-close"
                onClick={() => setSelected(null)}
                aria-label="关闭"
              >
                <Icon name="close" className="" />
              </button>
              <div className="row gap-12" style={{ marginBottom: 14 }}>
                <Avatar
                  name={selected.nickname}
                  color={selected.avatarColor}
                  size={52}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-user-name">
                    {selected.nickname}
                    {selected.role === 'admin' && (
                      <span className="tag-official">官方</span>
                    )}
                    {selected.role === 'subordinate' && (
                      <span className="tag-subordinate">管理员</span>
                    )}
                  </div>
                  <div className="admin-user-meta">
                    真实姓名：{selected.realName}
                  </div>
                  <div className="admin-user-meta">
                    班级：{selected.className}
                  </div>
                  <div className="admin-user-meta">
                    联系方式：{selected.contact}
                  </div>
                  <div className="admin-user-meta">
                    账号：{selected.account}
                  </div>
                </div>
              </div>
              <div
                className="btn-group fill-width"
                style={{ flexWrap: 'wrap' }}
              >
                {selected.role !== 'admin' && (
                  <>
                    <button
                      type="button"
                      className="btn outlined size-s"
                      onClick={() =>
                        setConfirmingDelete({
                          id: selected.id,
                          nickname: selected.nickname,
                        })
                      }
                    >
                      <Icon name="person_remove" className="" />
                      注销账号
                    </button>
                    <button
                      type="button"
                      className="btn outlined size-s"
                      onClick={() => setBanModal(selected)}
                    >
                      <Icon name="block" className="" />
                      禁言
                    </button>
                    {isAdmin && selected.role !== 'subordinate' && (
                      <button
                        type="button"
                        className="btn outlined size-s"
                        onClick={() => setPromoteModal(selected)}
                      >
                        <Icon name="shield" className="" />
                        分封
                      </button>
                    )}
                    {isAdmin && selected.role === 'subordinate' && (
                      <button
                        type="button"
                        className="btn outlined size-s"
                        onClick={() => setDemoteModal(selected)}
                      >
                        <Icon name="remove_moderator" className="" />
                        撤销分封
                      </button>
                    )}
                  </>
                )}
                {selected.role === 'admin' && (
                  <span className="text-on-surface-variant text-center">
                    管理员账号不可被管理
                  </span>
                )}
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}

      {/* 删除确认 */}
      {confirmingDelete &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => setConfirmingDelete(null)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="confirm-modal-title">注销账号</h2>
              <p className="confirm-modal-body">
                确认注销「{confirmingDelete.nickname}」？该用户所有内容将永久删除，无法恢复。
              </p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="btn text size-s"
                  onClick={() => setConfirmingDelete(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn danger size-s"
                  onClick={() => doDelete(confirmingDelete.id)}
                >
                  确认注销
                </button>
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}

      {/* 禁言时长弹窗 */}
      {banModal &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => setBanModal(null)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="confirm-modal-title">选择禁言时长</h2>
              <p className="confirm-modal-body">
                对「{banModal.nickname}」禁言（不可中途解禁）：
              </p>
              <div className="class-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {BAN_OPTIONS.map((o) => (
                  <button
                    key={o.days}
                    type="button"
                    className="class-chip"
                    onClick={() => handleBan(banModal.id, o.days)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}

      {/* 分封确认弹窗 */}
      {promoteModal &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => !promoting && setPromoteModal(null)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="confirm-modal-title">分封管理员附属</h2>
              <p className="confirm-modal-body">
                确认将「{promoteModal.nickname}」分封为管理员附属？
                <br />
                该账号将拥有管理员除「注销账号」和「分封账号」外的所有权限。
              </p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="btn text size-s"
                  onClick={() => setPromoteModal(null)}
                  disabled={promoting}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn filled size-s"
                  onClick={() =>
                    handlePromote(promoteModal.id, promoteModal.nickname)
                  }
                  disabled={promoting}
                >
                  {promoting ? '分封中…' : '确认分封'}
                </button>
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}

      {/* 撤销分封确认弹窗 */}
      {demoteModal &&
        createPortal(
          <div
            className="confirm-modal-overlay"
            onClick={() => !demoting && setDemoteModal(null)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="confirm-modal-title">撤销管理员附属</h2>
              <p className="confirm-modal-body">
                确认撤销「{demoteModal.nickname}」的管理员附属身份？
                <br />
                撤销后该账号将恢复为普通用户，不再拥有管理权限。
              </p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="btn text size-s"
                  onClick={() => setDemoteModal(null)}
                  disabled={demoting}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn filled size-s"
                  onClick={() =>
                    handleDemote(demoteModal.id, demoteModal.nickname)
                  }
                  disabled={demoting}
                >
                  {demoting ? '撤销中…' : '确认撤销'}
                </button>
              </div>
            </div>
          </div>,
          getPortalRoot(),
        )}
    </div>
  )
}
