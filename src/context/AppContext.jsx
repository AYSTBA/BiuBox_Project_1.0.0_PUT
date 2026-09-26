import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { getValidCurrentUser, logout as authLogout } from '../api/auth'
import { fetchCircles } from '../api/circles'
import { getBanStatus } from '../api/admin'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // 启动即校验会话有效性，失效会话（含旧版 mock 残留）自动清理
  const [user, setUser] = useState(getValidCurrentUser())
  const [circles, setCircles] = useState([])
  const [currentCircle, setCurrentCircle] = useState('all')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true
    fetchCircles()
      .then((data) => {
        if (active) setCircles(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 2600)
  }, [])

  const login = useCallback((u, token) => {
    setUser(u)
    if (token) localStorage.setItem('biubox_token', token)
    localStorage.setItem('biubox_user', JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  // 管理员 / 管理员附属 身份判断
  const isAdmin = user?.role === 'admin'
  const isSubordinate = user?.role === 'subordinate'
  // 附属拥有管理员除"注销/分封"外的所有权益
  const isManager = isAdmin || isSubordinate
  // 禁言校验：返回 null 未禁言，否则返回到期时间
  const banUntil = getBanStatus(user)

  const value = {
    user,
    setUser,
    circles,
    currentCircle,
    setCurrentCircle,
    showToast,
    login,
    logout,
    isAdmin,
    isSubordinate,
    isManager,
    banUntil,
  }

  // Toast 直接由 Provider 渲染，随 toast 状态同步更新，避免上下文分裂导致不渲染
  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastView toast={toast} />
    </AppContext.Provider>
  )
}

function ToastView({ toast }) {
  if (!toast) return null
  return (
    <div className="toast-wrap" key={toast.id}>
      <div className={`toast ${toast.type || ''}`}>{toast.message}</div>
    </div>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
