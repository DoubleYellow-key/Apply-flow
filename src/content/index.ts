// content script 入口:接收面板的扫描/填充指令
// M0 阶段为空壳,扫描与填充引擎在 M2/M3 接入

import { MSG, type ScanResult } from '../shared/messages'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.PING) {
    sendResponse({ ok: true, url: location.href })
    return false
  }

  if (message?.type === MSG.SCAN) {
    // TODO(M2): 调用 scanner 扫描表单
    const stub: ScanResult = {
      system: 'generic',
      url: location.href,
      title: document.title,
      fields: [],
      signature: '',
    }
    sendResponse({ ok: true, result: stub })
    return false
  }

  return false
})
