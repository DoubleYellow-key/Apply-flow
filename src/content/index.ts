// content script 入口:接收面板的扫描/填充指令,在页面上下文执行

import { MSG, type FillRequest, type ScanResult } from '../shared/messages'
import { scanDocument } from '../scanner/scan'
import { executeFill } from '../filler/fill'
import { storage, STORAGE_KEYS } from '../core/storage'
import { sanitizeProfile } from '../core/profile-merge'
import type { Profile } from '../core/profile'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.PING) {
    sendResponse({ ok: true, url: location.href })
    return false
  }

  if (message?.type === MSG.SCAN) {
    try {
      sendResponse({ ok: true, result: scanDocument() satisfies ScanResult })
    } catch (err) {
      sendResponse({ ok: false, error: String(err) })
    }
    return false
  }

  if (message?.type === MSG.FILL) {
    const req = message as FillRequest
    void (async () => {
      try {
        const saved = await storage.get<Profile>(STORAGE_KEYS.profile)
        const profile = sanitizeProfile(saved)
        const result = await executeFill(req.instructions, profile)
        sendResponse({ ok: true, result })
      } catch (err) {
        sendResponse({ ok: false, error: String(err) })
      }
    })()
    return true // 异步响应
  }

  return false
})
