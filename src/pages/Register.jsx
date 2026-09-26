import { Navigate } from 'react-router-dom'

/**
 * 注册路由：合并到登录页（带 initialMode=register）
 * 新版 UI 中"登录"与"注册"已合并为同一个屏幕的两个标签页。
 */
export default function Register() {
  return <Navigate to="/login" replace state={{ initialMode: 'register' }} />
}
