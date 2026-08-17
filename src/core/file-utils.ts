// 文件 <-> dataUrl 工具(附件/证件照上传用)

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** dataUrl -> File(DataTransfer 填文件上传控件用) */
export function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?)(;|$)/)?.[1] ?? 'application/octet-stream'
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], name, { type: mime })
}
