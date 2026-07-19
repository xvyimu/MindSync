const messages = {
  "error": {
    "evaluation": {
      "validation": "評估請求驗證錯誤: {details}",
      "model_not_found": "評估模型錯誤: 模型 \"{context}\" 不存在或未啟用",
      "template_not_found": "評估模板錯誤: 模板 \"{context}\" 不存在",
      "parse": "評估結果解析錯誤: {details}",
      "execution": "評估執行錯誤: {details}"
    },
    "llm": {
      "api": "API錯誤: {details}",
      "config": "配置錯誤: {details}",
      "validation": "驗證錯誤: {details}",
      "initialization": "初始化錯誤: {details}",
      "api_key_required": "優化失敗: API密鑰不能為空",
      "model_not_found": "優化失敗: 模型不存在",
      "template_invalid": "優化失敗: 提示詞格式無效",
      "empty_input": "優化失敗: 提示詞不能為空",
      "optimization_failed": "優化失敗",
      "iteration_failed": "迭代失敗",
      "test_failed": "測試失敗",
      "model_key_required": "優化失敗: 模型Key不能為空",
      "input_too_long": "優化失敗: 輸入內容過長"
    },
    "history": {
      "not_found": "未找到ID為 \"{context}\" 的歷史記錄",
      "chain": "歷史記錄鏈錯誤: {details}",
      "record_not_found": "記錄不存在: {details}",
      "storage": "歷史記錄存儲錯誤: {details}",
      "validation": "記錄驗證錯誤: {details}"
    },
    "compare": {
      "validation": "輸入驗證錯誤: {details}",
      "calculation": "對比計算錯誤: {details}"
    },
    "storage": {
      "read": "存儲讀取錯誤: {details}",
      "write": "存儲寫入錯誤: {details}",
      "delete": "存儲刪除錯誤: {details}",
      "clear": "存儲清空錯誤: {details}",
      "config": "存儲設定錯誤: {details}"
    },
    "model": {
      "validation": "模型驗證錯誤: {details}",
      "config": "模型配置錯誤: {details}"
    },
    "template": {
      "load": "模板加載錯誤: {details}",
      "not_found": "模板不存在: {context}",
      "validation": "模板驗證錯誤: {details}",
      "cache": "模板緩存錯誤: {details}",
      "storage": "模板存儲錯誤: {details}"
    },
    "prompt": {
      "optimization": "優化錯誤: {details}",
      "iteration": "迭代錯誤: {details}",
      "test": "測試錯誤: {details}",
      "service_dependency": "服務依賴錯誤: {details}"
    },
    "favorite": {
      "not_found": "收藏不存在: {context}",
      "already_exists": "收藏已存在",
      "category_not_found": "分類不存在: {context}",
      "validation": "驗證錯誤: {details}",
      "storage": "存儲錯誤: {details}",
      "tag": "標籤錯誤: {details}",
      "tag_already_exists": "標籤已存在: {context}",
      "tag_not_found": "標籤不存在: {context}",
      "migration": "資料遷移錯誤: {details}",
      "import_export": "匯入匯出錯誤: {details}"
    },
    "image": {
      "prompt_empty": "提示詞不能為空",
      "config_id_empty": "圖像模型設定 ID 不能為空",
      "config_not_found": "未找到圖像模型設定: {configId}",
      "config_not_enabled": "圖像模型設定未啟用: {configName}",
      "config_already_exists": "圖像模型設定已存在: {configId}",
      "config_does_not_exist": "圖像模型設定不存在: {configId}",
      "config_invalid": "圖像模型設定無效: {details}",
      "api_key_required": "{providerName} 需要 API Key",
      "model_id_required": "模型 ID 不能為空",
      "config_provider_mismatch": "設定提供商不匹配: config={configProviderId}, adapter={adapterProviderId}",
      "connection_config_missing_field": "連線設定缺少必填欄位: {field}",
      "connection_config_invalid_field_type": "連線設定欄位型別錯誤: {field} 需要 {expectedType}，實際 {actualType}",
      "provider_not_found": "未找到圖像提供商: {providerId}",
      "dynamic_models_not_supported": "{providerName} 不支援動態模型獲取",
      "unsupported_test_type": "不支援的測試類型: {testType}",
      "invalid_response_format": "API 回應格式無效",
      "base64_decoding_not_supported": "目前環境不支援 Base64 解碼",
      "only_single_image_supported": "目前僅支援生成 1 張圖片",
      "text2image_input_image_not_allowed": "文生圖不支援輸入圖像",
      "image2image_input_image_required": "圖生圖需要提供輸入圖像",
      "input_image_b64_required": "輸入圖像必須為 base64",
      "input_image_url_not_supported": "輸入圖像不支援 URL（僅支援 base64）",
      "input_image_invalid_format": "輸入圖像格式無效",
      "input_image_unsupported_mime": "僅支援 PNG/JPEG 格式（目前: {mimeType}）",
      "input_image_too_large": "輸入圖像過大（最大 {maxSizeMB}MB）",
      "input_image_too_many": "輸入圖像數量過多（最多 {maxCount} 張，目前 {actualCount} 張）",
      "model_not_support_text2image": "目前模型不支援文生圖: {modelName}",
      "model_not_support_image2image": "目前模型不支援圖生圖: {modelName}",
      "model_only_supports_image2image_need_input": "目前模型僅支援圖生圖，請提供輸入圖像: {modelName}",
      "generation_failed": "圖像生成失敗: {details}"
    },
    "context": {
      "not_found": "上下文不存在: {context}",
      "minimum_violation": "無法刪除最後一個上下文",
      "invalid_id": "無效的上下文ID: {context}",
      "import_format": "上下文匯入格式錯誤: {details}",
      "invalid_store": "上下文存儲資料無效: {details}",
      "storage": "上下文存儲錯誤: {details}",
      "electron_api_unavailable": "目前環境不支援上下文服務"
    },
    "variable_extraction": {
      "validation": "變量提取請求驗證錯誤: {details}",
      "model_not_found": "變量提取模型不存在或未啟用: {context}",
      "parse": "變量提取結果解析錯誤: {details}",
      "execution": "變量提取執行錯誤: {details}"
    },
    "variable_value_generation": {
      "validation": "變量值生成請求驗證錯誤: {details}",
      "model_not_found": "變量值生成模型不存在或未啟用: {context}",
      "parse": "變量值生成結果解析錯誤: {details}",
      "execution": "變量值生成執行錯誤: {details}"
    },
    "import_export": {
      "export_failed": "匯出失敗: {details}",
      "import_failed": "匯入失敗: {details}",
      "validation": "匯入匯出驗證錯誤: {details}"
    },
    "data": {
      "invalid_json": "JSON 無效: {details}",
      "invalid_format": "資料格式無效: {details}",
      "import_partial_failed": "匯入完成但有 {count} 個錯誤: {details}",
      "export_failed": "資料匯出失敗: {details}",
      "electron_api_unavailable": "目前環境不支援資料服務"
    },
    "core": {
      "ipc_serialization_failed": "IPC 序列化失敗: {details}"
    },
    "transport": {
      "offline": "網路已中斷，請確認連線後重試",
      "network": "網路連線異常，請稍後重試",
      "timeout": "請求逾時，請稍後重試",
      "aborted": "已取消",
      "auth": "身份驗證失敗，請檢查 API Key",
      "permission": "無存取權限（403），請檢查 API Key 或模型是否可用",
      "rateLimit": "請求過於頻繁（429），請稍後重試",
      "server": "伺服器異常，請稍後重試",
      "notFound": "資源不存在（404）",
      "invalidRequest": "請求參數有誤，請檢查設定",
      "modelUnavailable": "模型不可用，請更換模型或稍後重試",
      "unknown": "請求失敗，請稍後重試"
    }
  }
} as const;

export default messages;
