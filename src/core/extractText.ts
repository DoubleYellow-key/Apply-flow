// 简历文件 -> 纯文本(PDF/DOCX),动态加载解析库避免拖慢选项页首屏

export type ResumeFileType = 'pdf' | 'docx'

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdfText(file)
  if (name.endsWith('.docx')) return extractDocxText(file)
  // 纯文本兜底(用户可粘贴保存的 txt)
  if (name.endsWith('.txt')) return file.text()
  throw new Error(`不支持的文件类型:${file.name}(支持 PDF/DOCX/TXT)`)
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // ?url 导入对 .mjs 会得到一个转发 stub,其默认导出是根绝对路径(如 /assets/pdf.worker.min-xxx.mjs),
  // 需按当前 origin 解析成扩展内绝对 URL,MV3 CSP(禁远程代码/eval)下可用
  const stubUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(stubUrl, self.location.href).href

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false }).promise

  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // 按 y 坐标聚合成行(PDF 坐标系 y 向上,故按 y 降序)
    const lines = new Map<number, Array<{ x: number; str: string }>>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      const arr = lines.get(y) ?? []
      arr.push({ x: item.transform[4], str: item.str })
      lines.set(y, arr)
    }
    const sorted = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map((it) => it.str).join(' '))
    pageTexts.push(sorted.join('\n'))
  }
  return pageTexts.join('\n')
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
