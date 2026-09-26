import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/components.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { USE_MOCK } from './api/client'

/**
 * 清理旧版 mock 模式残留的 localStorage 数据。
 * 从 mock 切换到 D1 后端后，本地存储的用户/话题/回复/举报/撤销列表
 * 已不再使用，若不清理会导致不同浏览器显示不一致的旧数据。
 * 仅清理 mock 数据键，保留登录态（token + 当前用户）。
 */
function purgeLegacyMockData() {
  if (USE_MOCK) return
  const MOCK_KEYS = [
    'biubox_users',
    'biubox_topics',
    'biubox_replies',
    'biubox_revoked',
    'biubox_reports',
  ]
  for (const key of MOCK_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

purgeLegacyMockData()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
