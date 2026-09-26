import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { REPORT_REASONS, reportContent } from '../api/admin'
import { useApp } from '../context/AppContext'
import Icon from './Icon'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

/**
 * 内容操作菜单：撤销 / 删除 / 举报
 *
 * props:
 *  - targetType: 'topic' | 'reply'
 *  - targetId: 内容 id
 *  - topicId: 话题 id（reply 时必传，用于撤销/举报关联）
 *  - authorId: 内容作者 id（用于权限判断）
 *  - snapshot: { title, content, authorNickname }（举报快照）
 *  - onRevoke: () => Promise<void>  撤销回调
 *  - onSoftDelete: () => Promise<void>  软删除回调
 *  - onAfterAction: () => void  操作完成后的回调（如刷新列表）
 */
export default function ContentMenu({
  targetType,
  targetId,
  topicId,
  authorId,
  snapshot,
  onRevoke,
  onSoftDelete,
  onAfterAction,
  inline = false,
}) {
  const { user, showToast, isManager } = useApp()
  const [open, setOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportOther, setReportOther] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuRef = useRef(null)

  // 关闭菜单：点击外部
  useEffect(() => {
    if (!open) return
    function handler(e) {
      // 点击在按钮上不处理（按钮自己 toggle）
      if (menuRef.current?.contains(e.target)) return
      // 点击在弹窗内不处理（弹窗按钮有自己的 onClick）
      const pop = document.querySelector('.content-menu-pop')
      if (pop && pop.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  const isAuthor = user.id === authorId
  // 撤销：只有内容发布者自己和管理员可以
  const canRevoke = isAuthor || isManager
  // 删除：所有用户都可以软删除（仅自己不可见）
  const canDelete = true
  // 举报：所有用户都可看到举报按钮
  const canReport = true

  // 管理员对管理员的内容不能操作（避免管理员互撤）
  // 管理员可以撤销任何人的内容（包括自己和其他管理员的）

  async function handleRevoke() {
    setOpen(false)
    if (!confirm('确认撤销？撤销后所有人将无法看到此内容，且无法恢复。')) return
    try {
      await onRevoke()
      showToast('内容已撤销', 'success')
      onAfterAction?.()
    } catch (e) {
      showToast(e.message || '撤销失败', 'error')
    }
  }

  async function handleSoftDelete() {
    setOpen(false)
    try {
      await onSoftDelete()
      showToast('已删除（仅你不可见）', 'success')
      onAfterAction?.()
    } catch (e) {
      showToast(e.message || '删除失败', 'error')
    }
  }

  async function handleReportSubmit() {
    setSubmitting(true)
    try {
      const reason =
        reportReason === '其他' && reportOther.trim()
          ? reportOther.trim()
          : reportReason
      await reportContent({
        targetType,
        targetId,
        topicId,
        reason,
        snapshot,
      })
      showToast('举报已提交，待管理员处理', 'success')
      setShowReport(false)
      setReportOther('')
    } catch (e) {
      showToast(e.message || '举报失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // 没有任何可用操作时不显示
  if (!canRevoke && !canDelete && !canReport) return null

  function calcPos() {
    const btn = menuRef.current?.querySelector('.content-menu-btn')
    if (!btn) return { top: 0, left: 0 }
    const r = btn.getBoundingClientRect()
    let top = r.bottom + 4
    let left = r.left
    // 防止超出右侧
    const menuW = 110
    if (left + menuW > window.innerWidth) left = window.innerWidth - menuW - 8
    if (left < 8) left = 8
    // 防止超出底部
    const menuH = 120
    if (top + menuH > window.innerHeight) top = r.top - menuH - 4
    return { top, left }
  }

  return (
    <>
      <div className={`content-menu-wrap ${inline ? 'inline' : ''}`} ref={menuRef}>
        <button
          type="button"
          className="content-menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            if (!open) setMenuPos(calcPos())
            setOpen((v) => !v)
          }}
          aria-label="更多操作"
        >
          <Icon name="more_horiz" className="size-sm" />
        </button>
        {open && menuPos &&
          createPortal(
            <div
              className="content-menu-pop"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {canRevoke && (
                <button
                  type="button"
                  className="menu-item menu-revoke"
                  onClick={handleRevoke}
                >
                  <Icon name="delete" className="" />
                  撤销
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="menu-item menu-delete"
                  onClick={handleSoftDelete}
                >
                  <Icon name="visibility_off" className="" />
                  删除
                </button>
              )}
              {canReport && (
                <button
                  type="button"
                  className="menu-item menu-report"
                  onClick={() => {
                    setOpen(false)
                    setShowReport(true)
                  }}
                >
                  <Icon name="flag" className="" />
                  举报
                </button>
              )}
            </div>,
            getPortalRoot()
          )}
      </div>

      {/* 举报弹窗：选择举报原因 */}
      {showReport &&
        createPortal(
          <div className="report-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="report-modal-title">举报内容</h3>
            <p className="report-modal-sub">请选择举报原因，我们会尽快处理</p>
            <div className="report-reasons">
              {REPORT_REASONS.map((r) => (
                <label key={r} className={`report-reason ${reportReason === r ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reportReason === r}
                    onChange={(e) => setReportReason(e.target.value)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            {reportReason === '其他' && (
              <textarea
                className="field-input"
                placeholder="请描述举报理由"
                value={reportOther}
                onChange={(e) => setReportOther(e.target.value)}
                rows={2}
                style={{ marginTop: 10 }}
              />
            )}
            <div className="report-modal-actions">
              <button
                type="button"
                className="btn text size-s"
                onClick={() => setShowReport(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn filled size-s"
                disabled={submitting || (reportReason === '其他' && !reportOther.trim())}
                onClick={handleReportSubmit}
              >
                {submitting ? '提交中…' : '提交举报'}
              </button>
            </div>
          </div>
        </div>,
          getPortalRoot()
        )}
    </>
  )
}
