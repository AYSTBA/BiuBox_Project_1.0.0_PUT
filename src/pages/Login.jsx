import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { login, register } from '../api/auth'
import Icon from '../components/Icon'
import Grainient from '../components/Grainient'

const CLASS_NUMBERS = Array.from({ length: 18 }, (_, i) => String(i + 1))
const OTHER = '其他班级'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setLogin, showToast, user } = useApp()
  const [mode, setMode] = useState(
    location.state?.initialMode || 'login',
  )

  // 登录态
  const [loginNickname, setLoginNickname] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // 注册态
  const [form, setForm] = useState({
    nickname: '',
    realName: '',
    contact: '',
    password: '',
  })
  const [picked, setPicked] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const from = location.state?.from || '/'

  // 已登录则直接进入
  if (user) {
    return <Navigate to={from} replace />
  }

  const className = picked
    ? picked === OTHER
      ? OTHER
      : `九(${picked})班`
    : ''

  function setField(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  function validateRegister() {
    if (!form.nickname.trim()) return '请输入昵称'
    if (!form.realName.trim()) return '请输入真实姓名'
    if (!className) return '请选择班级'
    if (!form.contact.trim()) return '请输入邮箱或电话号码'
    if (!isContact(form.contact)) return '邮箱或电话号码格式不正确'
    if (form.password.length < 6) return '密码至少 6 位'
    if (!agreed) return '请先同意论坛协议与隐私政策'
    return ''
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!loginNickname || !loginPassword) {
      showToast('请输入昵称和密码', 'error')
      return
    }
    if (!agreed) {
      showToast('请先同意论坛协议与隐私政策', 'error')
      return
    }
    setSubmitting(true)
    try {
      const { token, user: u } = await login({
        account: loginNickname,
        password: loginPassword,
      })
      setLogin(u, token)
      showToast('欢迎回来，' + u.nickname, 'success')
      navigate(from, { replace: true })
    } catch (err) {
      showToast(err.message || '登录失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    const err = validateRegister()
    if (err) {
      showToast(err, 'error')
      return
    }
    setSubmitting(true)
    try {
      const payload = { ...form, className }
      const { token, user: u } = await register(payload)
      setLogin(u, token)
      showToast('注册成功，欢迎加入 BiuBox', 'success')
      navigate(from, { replace: true })
    } catch (err2) {
      showToast(err2.message || '注册失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen-content auth-screen" style={{ paddingTop: 32 }}>
      {/* 上部：欢迎大卡片（376×180dp） */}
      <section className="auth-hero">
        <Grainient
          color1="#a8e6b8"
          color2="#2E6A45"
          color3="#1b3a2a"
          timeSpeed={1.2}
          warpSpeed={5.0}
          contrast={1.3}
          saturation={1.1}
          grainAmount={0.08}
        />
        <div className="auth-hero-sub">龙城初级中学2024届 · 校园论坛</div>
        <h1 className="auth-hero-title">欢迎来到 BiuBox</h1>
      </section>

      {/* 中部：登录或注册界面框（376×656dp） */}
      <section className="auth-form">
        {/* 登录 / 注册 切换标签 */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        {mode === 'login' ? (
          <form className="col gap-12" onSubmit={handleLogin}>
            <div className="field">
              <span className="field-label">昵称</span>
              <input
                className="field-input"
                type="text"
                placeholder="输入你的昵称"
                value={loginNickname}
                onChange={(e) => setLoginNickname(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <span className="field-label">密码</span>
              <input
                className="field-input"
                type="password"
                placeholder="输入密码"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <label className="auth-agree">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                我已知晓且愿意执行
                <Link to="/terms" target="_blank">
                  《论坛协议》
                </Link>
                和
                <Link to="/privacy" target="_blank">
                  《隐私政策》
                </Link>
                中的内容
              </span>
            </label>
            <button
              type="submit"
              className="btn filled block"
              disabled={submitting}
            >
              <Icon name="rocket_launch" className="" />
              {submitting ? '登录中…' : 'GO!'}
            </button>
          </form>
        ) : (
          <form className="col gap-12" onSubmit={handleRegister}>
            <div className="field">
              <span className="field-label">昵称</span>
              <input
                className="field-input"
                type="text"
                placeholder="展示给同学的昵称"
                value={form.nickname}
                onChange={setField('nickname')}
              />
            </div>
            <div className="field">
              <span className="field-label">真实姓名</span>
              <input
                className="field-input"
                type="text"
                placeholder="真实姓名（仅管理员可见）"
                value={form.realName}
                onChange={setField('realName')}
              />
            </div>
            <div className="field">
              <span className="field-label">班级（九年级）</span>
              <div className="class-grid" role="radiogroup" aria-label="班级">
                {CLASS_NUMBERS.map((n) => {
                  const active = picked === n
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`class-chip ${active ? 'active' : ''}`}
                      onClick={() => setPicked(active ? '' : n)}
                    >
                      {n}班
                    </button>
                  )
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked === OTHER}
                  className={`class-chip class-chip-other ${picked === OTHER ? 'active' : ''}`}
                  onClick={() => setPicked(picked === OTHER ? '' : OTHER)}
                >
                  其他
                </button>
              </div>
            </div>
            <div className="field">
              <span className="field-label">邮箱或电话号码</span>
              <input
                className="field-input"
                type="text"
                placeholder="邮箱 或 电话号码"
                value={form.contact}
                onChange={setField('contact')}
              />
            </div>
            <div className="field">
              <span className="field-label">密码</span>
              <input
                className="field-input"
                type="password"
                placeholder="至少 6 位"
                value={form.password}
                onChange={setField('password')}
                autoComplete="new-password"
              />
            </div>
            <label className="auth-agree">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                我已知晓且愿意执行
                <Link to="/terms" target="_blank">
                  《论坛协议》
                </Link>
                和
                <Link to="/privacy" target="_blank">
                  《隐私政策》
                </Link>
                中的内容
              </span>
            </label>
            <button
              type="submit"
              className="btn filled block"
              disabled={submitting}
            >
              <Icon name="rocket_launch" className="" />
              {submitting ? '注册中…' : 'GO!'}
            </button>
          </form>
        )}

        <p className="auth-copy">© 2026 · BiuBox官方 · 保留所有权利</p>
      </section>
    </div>
  )
}

function isContact(v) {
  const s = v.trim()
  const isEmail = /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(s)
  const isPhone = /^1[3-9]\d{9}$/.test(s)
  return isEmail || isPhone
}
