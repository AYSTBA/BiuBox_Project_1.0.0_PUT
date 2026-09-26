import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLikedTopics } from '../api/topics'
import { useApp } from '../context/AppContext'
import TopAppBar from '../components/TopAppBar'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { formatTime } from '../utils/format'

export default function LikedTopics() {
  const navigate = useNavigate()
  const { circles, showToast } = useApp()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getLikedTopics()
      .then((list) => alive && setTopics(list))
      .catch((e) => {
        if (!alive) return
        showToast(e.message || '加载失败', 'error')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [showToast])

  const circleMap = Object.fromEntries(circles.map((c) => [c.id, c]))

  return (
    <>
      <TopAppBar title="点赞话题" onBack={() => navigate('/settings')} />

      <div className="screen-content">
        <section className="home-topics">
          <div className="home-topics-head">
            <h2 className="home-topics-title">
              我的点赞
              <span className="home-topics-meta" style={{ marginLeft: 8 }}>
                · {loading ? '加载中…' : `${topics.length} 个`}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="topic-list">
              <div className="skeleton" style={{ height: 88 }} />
              <div className="skeleton" style={{ height: 88 }} />
              <div className="skeleton" style={{ height: 88 }} />
            </div>
          ) : topics.length === 0 ? (
            <div className="empty-state">
              <Icon name="favorite_border" className="" />
              <p>还没有点赞过话题，去给喜欢的话题点个赞吧～</p>
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
                    className="topic-card"
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
                        <span className="stat">
                          <Icon
                            name="favorite"
                            className="size-xs"
                            fill
                          />
                          {t.likeCount || 0}
                        </span>
                        <span className="stat">
                          <Icon
                            name="chat_bubble_outline"
                            className="size-xs"
                          />
                          {t.replyCount}
                        </span>
                        <span className="stat">
                          <Icon name="visibility" className="size-xs" />
                          {t.views}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
