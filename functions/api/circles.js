// GET /api/circles
import { json } from '../_lib/helpers.js'

const CIRCLES = [
  { id: 'all', name: '全部', desc: '所有圈子的话题', icon: 'public', color: '#2E6A45' },
  { id: 'food', name: '美食', desc: '觅食 · 食谱 · 雷区', icon: 'mood', color: '#e07856' },
  { id: 'travel', name: '旅行', desc: '路线 · 攻略 · 风物', icon: 'pin_drop', color: '#1f7a6e' },
  { id: 'ent', name: '影音', desc: '电影 · 音乐 · 追剧', icon: 'videocam', color: '#8b6fb0' },
  { id: 'sport', name: '运动', desc: '打卡 · 经验 · 约伴', icon: 'settings_accessibility', color: '#3a7d44' },
  { id: 'pet', name: '宠物', desc: '晒宠 · 养护 · 趣事', icon: 'pets', color: '#c9a961' },
  { id: 'game', name: '游戏', desc: '单机 · 手游 · 联机开黑', icon: 'devices', color: '#7a5aa0' },
  { id: 'digital', name: '数码', desc: '好物 · 评测 · 折腾', icon: 'computer', color: '#2c6e8f' },
  { id: 'chat', name: '日常', desc: '碎碎念 · 生活小事', icon: 'home', color: '#b5546a' },
]

export async function onRequestGet() {
  return json(CIRCLES)
}
