import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NewTopic from './pages/NewTopic'
import TopicDetail from './pages/TopicDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import LikedTopics from './pages/LikedTopics'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewTopic />} />
        <Route path="/topic/:id" element={<TopicDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/user/:id" element={<Profile />} />
        <Route path="/liked" element={<LikedTopics />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  )
}

export default App
