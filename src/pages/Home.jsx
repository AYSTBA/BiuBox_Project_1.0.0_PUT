import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchTopics } from '../api/topics'
import TopAppBar from '../components/TopAppBar'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'
import Logo from '../components/Logo'
import ContentMenu from '../components/ContentMenu'
import Grainient from '../components/Grainient'
import { formatTime } from '../utils/format'
import { revokeTopic, softDeleteTopic } from '../api/topics'

export default function Home() {
  const navigate = useNavigate()
  const { circles, currentCircle, setCurrentCircle, showToast } = useApp()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const timer = useRef(null)

  // 搜索防抖
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebounced(keyword), 280)
    return () => timer.current && clearTimeout(timer.current)
  }, [keyword])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchTopics({ circleId: currentCircle, keyword: debounced })
      .then((list) => active && setTopics(list))
      .catch((e) => active && showToast(e.message || '加载失败', 'error'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [currentCircle, debounced, showToast])

  const circleMap = useMemo(
    () => Object.fromEntries(circles.map((c) => [c.id, c])),
    [circles],
  )

  const currentCircleName = circleMap[currentCircle]?.name || '全部'
  const currentCircleIcon = circleMap[currentCircle]?.icon || 'public'

  function refresh() {
    setLoading(true)
    fetchTopics({ circleId: currentCircle, keyword: debounced })
      .then((list) => setTopics(list))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <>
      {/* 顶部应用栏：搜索 + 用户图标 */}
      <TopAppBar
        title={
          <span className="brand-title">
            <Logo size={26} />
            BiuBox
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className="icon-button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="搜索"
            >
              <Icon name="search" className="size-md" />
            </button>
            <button
              type="button"
              className="icon-button mobile-only"
              onClick={() => navigate('/settings')}
              aria-label="设置"
            >
              <Icon name="account_circle" className="size-md" />
            </button>
          </>
        }
      />

      <div className="screen-content">
        {/* 搜索框（展开时显示） */}
        {searchOpen && (
          <div className="input-container" style={{ padding: '8px 14px' }}>
            <div className="row gap-8">
              <Icon name="search" className="size-md text-on-surface-variant" />
              <input
                className="input-field"
                type="text"
                placeholder="搜索话题、作者……"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus
              />
              {keyword && (
                <button
                  type="button"
                  className="icon-button size-s"
                  onClick={() => setKeyword('')}
                  aria-label="清除"
                >
                  <Icon name="close" className="size-sm" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 上部：Hero 大卡片（380×220dp） */}
        <section className="home-hero">
          <Grainient
            color1="#a8e6b8"
            color2="#2E6A45"
            color3="#1b3a2a"
            timeSpeed={1.2}
            colorBalance={0.0}
            warpStrength={1.0}
            warpFrequency={5.0}
            warpSpeed={5.0}
            warpAmplitude={50.0}
            blendAngle={0.0}
            blendSoftness={0.05}
            rotationAmount={500.0}
            noiseScale={2.0}
            grainAmount={0.08}
            grainScale={2.0}
            grainAnimated={false}
            contrast={1.3}
            gamma={1.0}
            saturation={1.1}
            centerX={0.0}
            centerY={0.0}
            zoom={0.9}
          />
          <div className="home-hero-sub">
            龙城初级中学2024届 · 校园论坛
          </div>
          <h1 className="home-hero-title">
            欢迎来到 BiuBox
          </h1>
        </section>

        {/* 中部：话题列表容器（380×548dp） */}
        <section className="home-topics">
          <div className="home-topics-head">
            <h2 className="home-topics-title">
              {currentCircleName}话题
              <span className="home-topics-meta" style={{ marginLeft: 8 }}>
                · {loading ? '加载中…' : `${topics.length} 个`}
              </span>
            </h2>
            <button
              type="button"
              className="icon-button size-s"
              onClick={refresh}
              aria-label="刷新"
            >
              <Icon name="refresh" className="size-sm" />
            </button>
          </div>

          {loading ? (
            <div className="topic-list">
              <div className="skeleton" style={{ height: 88 }} />
              <div className="skeleton" style={{ height: 88 }} />
              <div className="skeleton" style={{ height: 88 }} />
            </div>
          ) : topics.length === 0 ? (
            <div className="empty-state">
              <Icon name="eco" className="" />
              <p>这里还没有话题，发一个开启讨论吧～</p>
            </div>
          ) : (
            <div className="topic-list">
              {topics.map((t) => {
                const circle = circleMap[t.circleId]
                const circleColor = circle?.color || '#2E6A45'
                const circleName = circle?.name || '话题'
                return (
                  <article
                    key={t.id}
                    className={`topic-card ${t.pinned ? 'pinned' : ''}`}
                    onClick={() => navigate(`/topic/${t.id}`)}
                  >
                    <Avatar
                      name={t.author.nickname}
                      color={t.author.avatarColor}
                      size={42}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/user/${t.author.id}`)
                      }}
                    />
                    <div className="topic-main">
                      <div className="topic-top">
                        <span className="topic-author">
                          {t.author.nickname}
                        </span>
                        {t.author.role === 'admin' && (
                          <span className="tag-official">官方</span>
                        )}
                        {t.author.role === 'subordinate' && (
                          <span className="tag-subordinate">管理员</span>
                        )}
                        <span className="circle-tag">
                          <span
                            className="dot"
                            style={{ background: circleColor }}
                          />
                          {circleName}
                        </span>
                        <span>·</span>
                        <span>{formatTime(t.createdAt)}</span>
                      </div>
                      <h3 className="topic-title">{t.title}</h3>
                      <p className="topic-excerpt">{t.content}</p>
                      <div className="topic-foot">
                        <span className="stat like-stat">
                          <Icon
                            name={t.liked ? 'favorite' : 'favorite_border'}
                            className="size-xs"
                            fill={t.liked}
                          />
                          {t.likeCount || 0}
                        </span>
                        <span className="stat">
                          <Icon name="chat_bubble_outline" className="size-xs" />
                          {t.replyCount}
                        </span>
                        <span className="stat">
                          <Icon name="visibility" className="size-xs" />
                          {t.views}
                        </span>
                      </div>
                    </div>
                    <ContentMenu
                      targetType="topic"
                      targetId={t.id}
                      authorId={t.author.id}
                      snapshot={{
                        title: t.title,
                        content: t.content,
                        authorNickname: t.author.nickname,
                      }}
                      onRevoke={() => revokeTopic(t.id)}
                      onSoftDelete={() => softDeleteTopic(t.id)}
                      onAfterAction={() => refresh()}
                    />
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* 分割线 */}
        <div className="divider" />
      </div>

      {/* 下部：按钮组 + 扩展 FAB 菜单 */}
      <div className="home-bottom-bar">
        {fabMenuOpen && (
          <div className="fab-menu-items">
            {circles.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`fab-menu-item ${currentCircle === c.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentCircle(c.id)
                  setFabMenuOpen(false)
                }}
              >
                <Icon name={c.icon || 'public'} className="" />
                {c.name}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn filled home-btn-newtopic"
          onClick={() => navigate('/new')}
          aria-label="新建话题"
        >
          <Icon name="add" className="" />
          新建话题
        </button>
        <div className="fab-menu-wrap home-btn-circle">
          <button
            type="button"
            className="fab-extended fill home-fab-circle"
            onClick={() => setFabMenuOpen((v) => !v)}
            aria-label="选择圈子"
            aria-expanded={fabMenuOpen}
          >
            <Icon name={fabMenuOpen ? 'close' : currentCircleIcon} className="" />
          </button>
        </div>
      </div>
    </>
  )
}
