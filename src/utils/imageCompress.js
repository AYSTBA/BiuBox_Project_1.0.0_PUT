/**
 * 图片客户端压缩 —— 强制压至 200KB 及以下
 * 使用 Canvas 重绘 + JPEG 质量递降策略，确保体积达标。
 */

export const MAX_SIZE_KB = 200
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024
const MAX_DIMENSION = 1920 // 最长边上限，避免超大图拖慢

/**
 * 读取文件为 Image 对象
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 计算缩放后的尺寸（保持比例，最长边不超过 maxDim）
 */
function getScaledSize(img, maxDim) {
  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width)
      width = maxDim
    } else {
      width = Math.round((width * maxDim) / height)
      height = maxDim
    }
  }
  return { width, height }
}

/**
 * 将单张图片文件压缩至 200KB 以下
 * @param {File} file 图片文件
 * @returns {Promise<{ file: Blob, dataUrl: string, sizeKB: number }>}
 */
export async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件')
  }

  const img = await loadImage(file)
  const { width, height } = getScaledSize(img, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // 白底，防止透明 PNG 压成 JPEG 后变黑
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  // 质量递降直至达标
  let quality = 0.85
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)

  while (blob.size > MAX_SIZE_BYTES && quality > 0.3) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  // 若仍未达标，等比缩小再压
  let scale = width >= height ? width : height
  while (blob.size > MAX_SIZE_BYTES && scale > 480) {
    scale = Math.round(scale * 0.8)
    const { width: nw, height: nh } = getScaledSize(img, scale)
    canvas.width = nw
    canvas.height = nh
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, nw, nh)
    ctx.drawImage(img, 0, 0, nw, nh)
    blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(quality, 0.8))
  }

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return {
    file: blob,
    dataUrl,
    sizeKB: Math.round(blob.size / 1024),
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      type,
      quality,
    )
  })
}

/**
 * 批量压缩图片
 * @param {File[]} files
 */
export async function compressImages(files) {
  const results = []
  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    const res = await compressImage(f)
    results.push(res)
  }
  return results
}
