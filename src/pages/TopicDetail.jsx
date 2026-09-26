import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchTopicDetail,
  createReply,
  revokeTopic,
  revokeReply,
  softDeleteTopic,
  softDeleteReply,
  toggleLike,
} from '../api/topics'
import { useApp } from '../context/AppContext'
import TopAppBar from '../components/TopAppBar'
import Avatar from '../components/Avatar'
import ContentMenu from '../components/ContentMenu'
import Icon from '../components/Icon'
import { formatTime, formatFullTime } from '../utils/format'

export default function TopicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, showToast, banUntil } = useApp()

  const [topic, setTopic] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const lastSendRef = useRef(0)
  const bodyRef = useRef(null)
  const [viewerSrc, setViewerSrc] = useState(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetchTopicDetail(id)
      .then(({ topic: t, replies: rs }) => {
        setTopic(t)
        setReplies(rs)
      })
      .catch((e) => {
        showToast(e.message || '加载失败', 'error')
        if (e.status === 404) navigate('/')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, showToast])

  useEffect(() => {
    reload()
  }, [reload])

  // 新回复后滚动到底部
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [replies])

  async function handleSend() {
    const text = draft.trim()
    if (!text) return
    const now = Date.now()
    if (now - lastSendRef.current < 500) return
    if (sendingRef.current || sending) return
    if (!user) {
      showToast('请先登录后再发言', 'error')
      return
    }
    if (banUntil) {
      showToast(
        `你已被禁言至 ${formatFullTime(banUntil).slice(0, 16)}，期间无法发言`,
        'error',
      )
      return
    }
    lastSendRef.current = now
    sendingRef.current = true
    setSending(true)
    try {
      const reply = await createReply({ topicId: id, content: text })
      setReplies((prev) => [...prev, reply])
      setDraft('')
    } catch (e) {
      showToast(e.message || '发送失败', 'error')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (sendingRef.current || sending) return
      handleSend()
    }
  }

  if (loading) {
    return (
      <>
        <TopAppBar title="查看话题" onBack={() => navigate(-1)} />
        <div className="screen-content">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 280 }} />
        </div>
      </>
    )
  }

  if (!topic) return null

  const isMine = (r) => r.mine || (user && r.author.id === user.id)

  const handleRevokeTopic = async () => {
    await revokeTopic(topic.id)
    navigate('/')
  }
  const handleSoftDeleteTopic = async () => {
    await softDeleteTopic(topic.id)
    navigate('/')
  }
  const handleRevokeReply = async (r) => {
    await revokeReply(topic.id, r.id)
    reload()
  }
  const handleSoftDeleteReply = async (r) => {
    await softDeleteReply(topic.id, r.id)
    reload()
  }

  return (
    <>
      <TopAppBar title="查看话题" onBack={() => navigate('/')} />

      <div className="screen-content">
        {/* 上部：话题原文（376×212dp） */}
        <section className="detail-origin">
          <div className="detail-origin-head">
            <Avatar
              name={topic.author.nickname}
              color={topic.author.avatarColor}
              size={42}
              onClick={() => navigate(`/user/${topic.author.id}`)}
            />
            <div className="meta">
              <div style={{ fontWeight: 700, color: 'var(--md-on-surface)' }}>
                {topic.author.nickname}
                {topic.author.role === 'admin' && (
                  <span className="tag-official">官方</span>
                )}
                {topic.author.role === 'subordinate' && (
                  <span className="tag-subordinate">管理员</span>
                )}
              </div>
              <div>
                {formatFullTime(topic.createdAt)} · 浏览 {topic.views}
              </div>
            </div>
            <ContentMenu
              targetType="topic"
              targetId={topic.id}
              authorId={topic.author.id}
              snapshot={{
                title: topic.title,
                content: topic.content,
                authorNickname: topic.author.nickname,
              }}
              onRevoke={handleRevokeTopic}
              onSoftDelete={handleSoftDeleteTopic}
            />
          </div>
          <h2 className="detail-origin-title">{topic.title}</h2>
          <div className="detail-origin-body">{topic.content}</div>
          {topic.images?.length > 0 && (
            <div className="detail-images">
              {topic.images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`附图${i + 1}`}
                  onClick={() => setViewerSrc(img.url)}
                />
              ))}
            </div>
          )}
          <div className="detail-like-bar">
            <button
              type="button"
              className={`like-btn ${topic.liked ? 'liked' : ''}`}
              onClick={async () => {
                if (!user) {
                  showToast('请先登录', 'info')
                  return
                }
                const prev = topic
                setTopic({
                  ...prev,
                  liked: !prev.liked,
                  likeCount: Math.max(
                    0,
                    (prev.likeCount || 0) + (prev.liked ? -1 : 1),
                  ),
                })
                try {
                  await toggleLike(prev.id)
                } catch (e) {
                  setTopic(prev)
                  showToast(e.message || '操作失败', 'error')
                }
              }}
              aria-pressed={topic.liked}
              aria-label={topic.liked ? '取消点赞' : '点赞'}
            >
              <Icon
                name={topic.liked ? 'favorite' : 'favorite_border'}
                className=""
                fill={topic.liked}
              />
              <span>{topic.likeCount || 0}</span>
            </button>
          </div>
        </section>

        {/* 中部：讨论区（376×536dp） */}
        <section className="discuss">
          <div className="discuss-head">
            <Icon name="forum" className="size-sm" />
            讨论 · {replies.length}
          </div>
          <div className="discuss-body scrollable" ref={bodyRef}>
            {replies.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 12px' }}>
                <Icon name="chat" className="" />
                <p>还没有人发言，来说点什么吧～</p>
              </div>
            ) : (
              replies.map((r, i) => {
                const mine = isMine(r)
                const prev = replies[i - 1]
                const showDivider =
                  !prev ||
                  new Date(r.createdAt) - new Date(prev.createdAt) >
                    5 * 60 * 1000
                return (
                  <div key={r.id}>
                    {showDivider && (
                      <div className="chat-time-divider">
                        {formatTime(r.createdAt)}
                      </div>
                    )}
                    <div className={`chat-row ${mine ? 'mine' : ''}`}>
                      <Avatar
                        name={r.author.nickname}
                        color={r.author.avatarColor}
                        size={36}
                        onClick={() => navigate(`/user/${r.author.id}`)}
                      />
                      <div className="chat-col">
                        <span className="chat-name">
                          {mine ? '我' : r.author.nickname}
                          {r.author.role === 'admin' && (
                            <span className="tag-official">官方</span>
                          )}
                          {r.author.role === 'subordinate' && (
                            <span className="tag-subordinate">管理员</span>
                          )}
                        </span>
                        <div className="chat-bubble">{r.content}</div>
                        <div>
                          <ContentMenu
                            inline
                            targetType="reply"
                            targetId={r.id}
                            topicId={topic.id}
                            authorId={r.author.id}
                            snapshot={{
                              content: r.content,
                              authorNickname: r.author.nickname,
                            }}
                            onRevoke={() => handleRevokeReply(r)}
                            onSoftDelete={() => handleSoftDeleteReply(r)}
                            onAfterAction={reload}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 底部输入区 */}
          <div className="discuss-foot">
            {banUntil ? (
              <div className="ban-banner">
                你已被禁言至{' '}
                {formatFullTime(banUntil).slice(0, 16)}，期间无法发言
              </div>
            ) : (
              <>
                <textarea
                  className="chat-input scrollable"
                  placeholder="注意文明用语"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                />
                <button
                  type="button"
                  className="icon-button filled size-s"
                  disabled={!draft.trim() || sending}
                  onClick={handleSend}
                  aria-label="发送"
                >
                  <Icon name="send" className="size-sm" fill />
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      {/* 全屏图片查看器 */}
      {viewerSrc && (
        <div
          className="image-viewer-overlay"
          onClick={() => setViewerSrc(null)}
        >
          <img src={viewerSrc} alt="预览" className="image-viewer-img" />
          <button
            type="button"
            className="image-viewer-close"
            onClick={() => setViewerSrc(null)}
            aria-label="关闭"
          >
            <Icon name="close" className="" />
          </button>
        </div>
      )}
    </>
  )
}
