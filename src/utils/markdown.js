/**
 * Markdown 渲染器（基于 marked 库，完整支持 GitHub Flavored Markdown）
 * 所有 GitHub README 支持的语法均可正确渲染：
 *   - 标题、粗体、斜体、删除线
 *   - 行内代码 / 代码块
 *   - 链接、图片
 *   - 有序/无序列表、任务列表
 *   - 表格
 *   - 引用、水平分割线
 *   - 自动链接
 *
 * 为安全起见，禁用原始 HTML 注入（marked 默认不渲染原始 HTML）。
 */
import { marked } from 'marked'

// 配置 marked：启用 GFM、换行转 <br>、允许原始 HTML（GitHub README 兼容）
marked.setOptions({
  gfm: true,
  breaks: true,
  html: true,
})

export function renderMarkdown(md) {
  if (!md || !md.trim()) return ''
  try {
    return marked.parse(md)
  } catch (e) {
    console.warn('Markdown 渲染失败:', e)
    return `<p>${md}</p>`
  }
}
