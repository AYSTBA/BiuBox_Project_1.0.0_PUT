import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import ContentMenu from './ContentMenu'
import { IconChat, IconEye, IconPin } from './Icons'
import { formatTime } from '../utils/format'
import { revokeTopic, softDeleteTopic } from '../api/topics'

export default function TopicCard({ topic, circleMap = {}, onRefresh }) {
  const navigate = useNavigate()
  const circle = circleMap[topic.circleId]
  const circleColor = circle?.color || '#0f4c5c'
  const circleName = circle?.name || '话题'

  return (
    <article
      className={`topic-card ${topic.pinned ? 'pinned' : ''}`}
      onClick={() => navigate(`/topic/${topic.id}`)}
    >
      <Avatar name={topic.author.nickname} color={topic.author.avatarColor} size={42} />
      <div className="topic-main">
        <div className="topic-top">
          <span className="topic-author">{topic.author.nickname}</span>
          {topic.author.role === 'admin' && (
            <span className="tag-official">官方</span>
          )}
          {topic.author.role === 'subordinate' && (
            <span className="tag-subordinate">管理员</span>
          )}
          <span>·</span>
          <span className="circle-tag">
            <span className="dot" style={{ background: circleColor }} />
            {circleName}
          </span>
          {topic.pinned && (
            <span className="pin-flag">
              <IconPin width={13} height={13} /> 置顶
            </span>
          )}
          <span>·</span>
          <span>{formatTime(topic.createdAt)}</span>
        </div>
        <h3 className="topic-title">{topic.title}</h3>
        <p className="topic-excerpt">{topic.content}</p>
        <div className="topic-foot">
          <span className="stat">
            <IconChat width={15} height={15} /> {topic.replyCount}
          </span>
          <span className="stat">
            <IconEye width={15} height={15} /> {topic.views}
          </span>
        </div>
      </div>
      {/* ··· 菜单：撤销 / 删除 / 举报 */}
      <ContentMenu
        targetType="topic"
        targetId={topic.id}
        authorId={topic.author.id}
        snapshot={{
          title: topic.title,
          content: topic.content,
          authorNickname: topic.author.nickname,
        }}
        onRevoke={() => revokeTopic(topic.id)}
        onSoftDelete={() => softDeleteTopic(topic.id)}
        onAfterAction={() => onRefresh?.()}
      />
    </article>
  )
}
