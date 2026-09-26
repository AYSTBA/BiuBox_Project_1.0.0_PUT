import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { getUserProfile, updateProfile } from '../api/users'
import { useApp } from '../context/AppContext'
import TopAppBar from '../components/TopAppBar'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { SOCIAL_PLATFORMS } from '../constants/socials'
import { renderMarkdown } from '../utils/markdown'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

/* 内联可编辑字段：展示值 + 铅笔按钮，点击切换为输入框。suffix 可插在值与按钮之间 */
function EditableField({ value, onSave, placeholder = '', inputType = 'text', icon, label, suffix }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(value)
      setEditing(false)
      return
    }
    if (trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="profile-field-value editing">
        <input
          ref={inputRef}
          className="input-field"
          type={inputType}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
        />
        <button type="button" className="icon-btn" onClick={commit} aria-label="保存">
          <Icon name="check" className="size-sm" />
        </button>
        <button type="button" className="icon-btn" onClick={() => { setDraft(value); setEditing(false) }} aria-label="取消">
          <Icon name="close" className="size-sm" />
        </button>
      </div>
    )
  }

  return (
    <div className="profile-field-value with-toggle">
      <span className="profile-field-text">
        {icon && <Icon name={icon} className="size-sm profile-field-ico" />}
        {value || placeholder}
      </span>
      {suffix}
      <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label={`编辑${label || ''}`}>
        <Icon name="edit" className="size-sm" />
      </button>
    </div>
  )
}

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser, showToast } = useApp()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [socialModalOpen, setSocialModalOpen] = useState(false)
  const [bioModalOpen, setBioModalOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getUserProfile(id)
      .then(setProfileUser)
      .catch((e) => {
        showToast(e.message || '加载失败', 'error')
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, showToast])

  useEffect(() => {
    load()
  }, [load])

  const isOwner = user && profileUser && user.id === profileUser.id

  async function handleSaveProfile(data) {
    try {
      const updated = await updateProfile(id, data)
      setProfileUser(updated)
      if (isOwner) {
        setUser(updated)
        localStorage.setItem('biubox_user', JSON.stringify(updated))
      }
      showToast('已保存', 'success')
    } catch (e) {
      showToast(e.message || '保存失败', 'error')
    }
  }

  if (loading) {
    return (
      <>
        <TopAppBar title="认识我" onBack={() => navigate('/')} />
        <div className="screen-content">
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      </>
    )
  }

  if (!profileUser) return null

  const profile = profileUser.profile || {}
  const socials = profile.socials || []

  return (
    <>
      <TopAppBar title="认识我" onBack={() => navigate('/')} />

      <div className="screen-content">
        {/* 上方模块框：用户资料 */}
        <section className="profile-hero">
          <div className="profile-hero-head">
            <Avatar
              name={profileUser.nickname}
              color={profileUser.avatarColor}
              size={56}
            />
            <div className="profile-hero-name">
              <div className="profile-nickname">
                {isOwner ? (
                  <EditableField
                    value={profileUser.nickname}
                    placeholder="输入昵称"
                    label="昵称"
                    onSave={(v) => handleSaveProfile({ ...profile, nickname: v })}
                  />
                ) : (
                  <span className="profile-nickname-text">{profileUser.nickname}</span>
                )}
                {profileUser.role === 'admin' && (
                  <span className="tag-official">官方</span>
                )}
                {profileUser.role === 'subordinate' && (
                  <span className="tag-subordinate">管理员</span>
                )}
              </div>
              <div className="profile-class-mini">{profileUser.className}</div>
            </div>
          </div>

          <div className="profile-fields">
            {/* 真实姓名 */}
            <div className="profile-field">
              <div className="profile-field-label">
                <Icon name="badge" className="size-sm" />
                真实姓名
              </div>
              {isOwner ? (
                <div className="profile-field-value with-toggle">
                  <EditableField
                    value={profileUser.realName || ''}
                    placeholder="输入真实姓名"
                    label="真实姓名"
                    onSave={(v) => handleSaveProfile({ ...profile, realName: v })}
                  />
                  <Switch
                    checked={profile.showRealName}
                    onChange={(v) =>
                      handleSaveProfile({ ...profile, showRealName: v })
                    }
                  />
                </div>
              ) : (
                <div className="profile-field-value">
                  {profile.showRealName ? profileUser.realName : '未公开'}
                </div>
              )}
            </div>

            {/* 联系方式 */}
            <div className="profile-field">
              <div className="profile-field-label">
                <Icon name="alternate_email" className="size-sm" />
                联系方式
              </div>
              {isOwner ? (
                <div className="profile-field-value with-toggle">
                  <EditableField
                    value={profileUser.contact || ''}
                    placeholder="输入联系方式"
                    label="联系方式"
                    onSave={(v) => handleSaveProfile({ ...profile, contact: v })}
                  />
                  <Switch
                    checked={profile.showContact}
                    onChange={(v) =>
                      handleSaveProfile({ ...profile, showContact: v })
                    }
                  />
                </div>
              ) : (
                <div className="profile-field-value">
                  {profile.showContact ? profileUser.contact : '未公开'}
                </div>
              )}
            </div>
          </div>

          {/* 社交账号 */}
          <div className="profile-social">
            <div className="profile-social-head">
              <Icon name="share" className="size-sm" />
              <span>社交账号</span>
              {isOwner && (
                <button
                  type="button"
                  className="profile-add-btn"
                  onClick={() => setSocialModalOpen(true)}
                >
                  <Icon name="add" className="size-sm" />
                  添加账号
                </button>
              )}
            </div>
            {socials.length === 0 ? (
              <div className="profile-social-empty">暂无社交账号</div>
            ) : (
              <div className="social-list">
                {socials.map((s, idx) => (
                  <div key={idx} className="social-item">
                    <span className="social-platform">{s.platform}</span>
                    <span className="social-account">{s.account}</span>
                    {isOwner && (
                      <button
                        type="button"
                        className="social-remove"
                        onClick={() =>
                          handleSaveProfile({
                            ...profile,
                            socials: socials.filter((_, i) => i !== idx),
                          })
                        }
                        aria-label="删除"
                      >
                        <Icon name="close" className="size-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 下方模块框：个性化页面 */}
        <section className="profile-bio">
          <div className="profile-bio-head">
            <div className="profile-bio-title">
              <Icon name="auto_awesome" className="size-sm" />
              个性化主页
            </div>
            {isOwner && (
              <button
                type="button"
                className="btn outlined size-s"
                onClick={() => setBioModalOpen(true)}
              >
                编辑README.md
              </button>
            )}
          </div>
          {profile.bioCode ? (
            <div
              className="profile-bio-body markdown-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(profile.bioCode) }}
            />
          ) : (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <Icon name="description" className="" />
              <p>
                {isOwner
                  ? '还没有编写个性化主页，点击编辑开始创作吧～'
                  : 'TA 还没有编写个性化主页'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 社交账号选择弹窗 */}
      {socialModalOpen && (
        <SocialPicker
          onClose={() => setSocialModalOpen(false)}
          onAdd={(platform, account) => {
            handleSaveProfile({
              ...profile,
              socials: [...socials, { platform, account }],
            })
            setSocialModalOpen(false)
          }}
        />
      )}

      {/* 代码编辑弹窗 */}
      {bioModalOpen && (
        <BioEditor
          initial={profile.bioCode || ''}
          onClose={() => setBioModalOpen(false)}
          onSave={(code) => {
            handleSaveProfile({ ...profile, bioCode: code })
            setBioModalOpen(false)
          }}
        />
      )}
    </>
  )
}

/* ============================================================
   开关组件（M3 风格）
   ============================================================ */
function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`md-switch ${checked ? 'on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="md-switch-thumb" />
    </button>
  )
}

/* ============================================================
   社交账号选择器弹窗
   ============================================================ */
function SocialPicker({ onClose, onAdd }) {
  const [customMode, setCustomMode] = useState(false)
  const [selected, setSelected] = useState('')
  const [customPlatform, setCustomPlatform] = useState('')
  const [account, setAccount] = useState('')

  function handleConfirm() {
    const platform = customMode ? customPlatform.trim() : selected
    if (!platform || !account.trim()) return
    onAdd(platform, account.trim())
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">添加社交账号</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" className="" />
          </button>
        </div>

        {!customMode ? (
          <>
            <div className="social-grid">
              {SOCIAL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`social-chip ${selected === p ? 'active' : ''}`}
                  onClick={() => setSelected(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn text"
              onClick={() => setCustomMode(true)}
            >
              + 自定义平台
            </button>
          </>
        ) : (
          <div className="modal-body">
            <input
              className="input-field"
              placeholder="输入平台名称"
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
            />
          </div>
        )}

        <div className="modal-body">
          <input
            className="input-field"
            placeholder="输入账号 / ID"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn text size-s"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="btn filled size-s"
            disabled={!account.trim() || (customMode ? !customPlatform.trim() : !selected)}
            onClick={handleConfirm}
          >
            确认添加
          </button>
        </div>
      </div>
    </div>,
    getPortalRoot(),
  )
}

/* ============================================================
   代码编辑器弹窗（Markdown · 带行号）
   ============================================================ */
function BioEditor({ initial, onClose, onSave }) {
  const [code, setCode] = useState(initial)
  const textareaRef = useRef(null)
  const lineRef = useRef(null)

  const lineCount = (code.match(/\n/g) || []).length + 1

  function handleScroll() {
    if (lineRef.current && textareaRef.current) {
      lineRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card bio-editor-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="article" className="" />
            <h2 className="modal-title">编辑 README.md</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" className="" />
          </button>
        </div>
        <div className="bio-editor-body">
          <div className="bio-line-numbers" ref={lineRef} aria-hidden>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="bio-line-num">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="bio-code-input"
            placeholder="冷知识:代码可以叫AI帮写~告诉它你的设计要求和文本内容就好了......"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            wrap="off"
          />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn text size-s"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="btn filled size-s"
            onClick={() => onSave(code)}
          >
            保存
          </button>
        </div>
      </div>
    </div>,
    getPortalRoot(),
  )
}
