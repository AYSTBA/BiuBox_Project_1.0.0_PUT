import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createTopic } from '../api/topics'
import ImageUploader from '../components/ImageUploader'
import TopAppBar from '../components/TopAppBar'
import Icon from '../components/Icon'

const MAX_CHARS = 1000

export default function NewTopic() {
  const navigate = useNavigate()
  const { circles, showToast } = useApp()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [circleId, setCircleId] = useState(null)
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // 可选圈子（不含「全部」）
  const pickable = circles.filter((c) => c.id !== 'all')

  const overLimit = content.length > MAX_CHARS
  const canSubmit =
    title.trim() && content.trim() && !overLimit && !submitting && circleId

  async function handlePublish() {
    if (!user) {
      showToast('请先登录后再发布', 'error')
      navigate('/login')
      return
    }
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const imageMeta = images.map((im) => ({
        url: im.dataUrl,
        sizeKB: im.sizeKB,
      }))
      const topic = await createTopic({
        title: title.trim(),
        content: content.trim(),
        circleId,
        images: imageMeta,
      })
      showToast('发布成功', 'success')
      navigate(`/topic/${topic.id}`)
    } catch (e) {
      showToast(e.message || '发布失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    // 回到首页
    navigate('/')
  }

  return (
    <>
      <TopAppBar title="新建话题" onBack={handleBack} />

      <div className="screen-content">
        {/* 圈子选择容器（376×60dp） */}
        <div
          className="input-container"
          style={{ padding: '8px 14px', overflowX: 'auto' }}
        >
          <div className="row gap-8 scrollable" style={{ overflowX: 'auto' }}>
            {pickable.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`circle-chip ${circleId === c.id ? 'active' : ''}`}
                onClick={() =>
                  setCircleId((prev) => (prev === c.id ? null : c.id))
                }
                style={{
                  flex: '0 0 auto',
                  flexDirection: 'row',
                  padding: '6px 12px',
                  gap: 6,
                }}
                aria-pressed={circleId === c.id}
              >
                <Icon name={c.icon || 'label'} className="size-sm" />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 标题输入容器（376×404dp） */}
        <div className="input-container">
          <div className="row-between">
            <span className="input-label">话题标题</span>
            <span className={`input-counter ${title.length > 50 ? 'warn' : ''}`}>
              {title.length}/50
            </span>
          </div>
          <input
            className="input-field"
            type="text"
            maxLength={50}
            placeholder="一句话概括你的话题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 正文 + 图片容器（376×180dp） */}
        <div className="input-container">
          <div className="row-between">
            <span className="input-label">话题正文</span>
            <span className={`input-counter ${overLimit ? 'warn' : ''}`}>
              {content.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            className="input-field"
            placeholder="说说你想聊的……注意文明用语"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            style={{ minHeight: 140 }}
          />
          <ImageUploader value={images} onChange={setImages} />
        </div>

        {/* 发布按钮（宽 380dp） */}
        <button
          type="button"
          className="btn filled block"
          disabled={!canSubmit}
          onClick={handlePublish}
          style={{ marginTop: 8 }}
        >
          <Icon name="rocket_launch" className="" />
          {submitting ? '发布中…' : '发布话题'}
        </button>
      </div>
    </>
  )
}
