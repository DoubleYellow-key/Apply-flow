// MV3 service worker:点击工具栏图标打开侧边栏 + 消息路由

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      sendResponse({ ok: true, tab: tabs[0] ?? null })
    })
    return true // 异步响应
  }
  return false
})
