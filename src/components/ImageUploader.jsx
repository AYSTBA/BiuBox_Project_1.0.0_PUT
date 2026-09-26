import { useState, useRef } from 'react'
import { compressImage, MAX_SIZE_KB } from '../utils/imageCompress'
import Icon from './Icon'

const MAX_IMAGES = 3

/**
 * 图片上传器
 * - 最多 3 张
 * - 客户端强制压缩至 200KB 以下
 * - onChange 返回 [{ file, dataUrl, sizeKB }]
 */
export default function ImageUploader({ value = [], onChange }) {
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef(null)

  async function handleFiles(files) {
    const arr = Array.from(files).slice(0, MAX_IMAGES - value.length)
    if (!arr.length) return
    setProcessing(true)
    try {
      const results = []
      for (const f of arr) {
        // eslint-disable-next-line no-await-in-loop
        const res = await compressImage(f)
        results.push(res)
      }
      onChange([...value, ...results])
    } catch (e) {
      console.error(e)
    } finally {
      setProcessing(false)
    }
  }

  function removeAt(idx) {
    const next = value.slice()
    next.splice(idx, 1)
    onChange(next)
  }

  const canAdd = value.length < MAX_IMAGES && !processing

  return (
    <div className="uploader">
      {value.map((img, i) => (
        <div className="uploader-slot" key={i}>
          <img src={img.dataUrl} alt={`图${i + 1}`} />
          <span className="size-tag">{img.sizeKB}KB</span>
          <button
            type="button"
            className="remove"
            onClick={() => removeAt(i)}
            aria-label="删除"
          >
            <Icon name="close" className="size-xs" />
          </button>
        </div>
      ))}

      <label className={`uploader-add ${canAdd ? '' : 'disabled'}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          disabled={!canAdd}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Icon name="add_photo_alternate" className="size-md" />
        <span>{processing ? '压缩中…' : `添加图片 ${value.length}/${MAX_IMAGES}`}</span>
      </label>
    </div>
  )
}

export { MAX_IMAGES, MAX_SIZE_KB }
