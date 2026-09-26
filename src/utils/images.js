/**
 * 图片资源辅助
 * 按规范统一使用 trae 文本生图接口生成风景图等资源，prompt 遵循 SDXL 最佳实践。
 */
const ENDPOINT = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image'

export function textImage(prompt, imageSize = 'landscape_16_9') {
  return `${ENDPOINT}?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=${imageSize}`
}

// 首页顶部大卡片风景图
export const HERO_SCENERY = textImage(
  'serene dawn landscape, misty layered mountains reflected in a calm lake, soft golden morning light breaking through thin clouds, sage and teal ridgelines, atmospheric depth, tranquil premium nature photography, no people, high detail',
  'landscape_16_9',
)

// 登录/注册侧栏风景图
export const AUTH_SCENERY = textImage(
  'tree-lined campus pathway in soft morning light, dappled shadows on warm stone, gentle bokeh of green foliage, cream and sage tones, calm studious atmosphere, premium photography, no people',
  'landscape_4_3',
)
