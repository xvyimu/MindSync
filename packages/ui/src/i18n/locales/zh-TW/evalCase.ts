const messages = {
  evalCase: {
    title: '可複現用例',
    hint: '儲存小型用例並用「輸出包含」斷言重複跑批；匯出本機證據 JSON，無需雲端。',
    addTitle: '新增 / 編輯用例',
    listTitle: '用例（{count}）',
    empty: '尚無用例',
    fields: {
      name: '用例名稱',
      input: '傳送給模型的使用者輸入 / 任務',
      systemPromptOptional: '系統提示（可選）',
      contains: '輸出必須包含…',
    },
    add: '新增用例',
    update: '更新用例',
    runAll: '執行全部',
    export: '匯出證據',
    resultsTitle: '最近一次執行',
    summary: '共 {total} · 通過 {passed} · 失敗 {failed}',
    pass: '通過',
    fail: '失敗',
    model: '模型：{model}',
    open: '用例',
    saved: '用例已儲存',
    removed: '用例已刪除',
    runDone: '執行完成',
    exportDone: '證據已匯出',
    needModel: '請先選擇模型',
    needServices: '服務未就緒',
  },
}

export default messages
