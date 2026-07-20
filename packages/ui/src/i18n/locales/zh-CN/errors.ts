const messages = {
  "error": {
    "evaluation": {
      "validation": "评估请求验证错误: {details}",
      "model_not_found": "评估模型错误: 模型 \"{context}\" 不存在或未启用",
      "template_not_found": "评估模板错误: 模板 \"{context}\" 不存在",
      "parse": "评估结果解析错误: {details}",
      "execution": "评估执行错误: {details}"
    },
    "llm": {
      "api": "API错误: {details}",
      "config": "配置错误: {details}",
      "validation": "验证错误: {details}",
      "initialization": "初始化错误: {details}",
      "api_key_required": "优化失败: API密钥不能为空",
      "model_not_found": "优化失败: 模型不存在",
      "template_invalid": "优化失败: 提示词格式无效",
      "empty_input": "优化失败: 提示词不能为空",
      "optimization_failed": "优化失败",
      "iteration_failed": "迭代失败",
      "test_failed": "测试失败",
      "model_key_required": "优化失败: 模型Key不能为空",
      "input_too_long": "优化失败: 输入内容过长"
    },
    "history": {
      "not_found": "未找到ID为 \"{context}\" 的历史记录",
      "chain": "历史记录链错误: {details}",
      "record_not_found": "记录不存在: {details}",
      "storage": "历史记录存储错误: {details}",
      "validation": "记录验证错误: {details}"
    },
    "compare": {
      "validation": "输入验证错误: {details}",
      "calculation": "对比计算错误: {details}"
    },
    "storage": {
      "read": "存储读取错误: {details}",
      "write": "存储写入错误: {details}",
      "delete": "存储删除错误: {details}",
      "clear": "存储清空错误: {details}",
      "config": "存储配置错误: {details}"
    },
    "model": {
      "validation": "模型验证错误: {details}",
      "config": "模型配置错误: {details}"
    },
    "template": {
      "load": "模板加载错误: {details}",
      "not_found": "模板不存在: {context}",
      "validation": "模板验证错误: {details}",
      "cache": "模板缓存错误: {details}",
      "storage": "模板存储错误: {details}"
    },
    "prompt": {
      "optimization": "优化错误: {details}",
      "iteration": "迭代错误: {details}",
      "test": "测试错误: {details}",
      "service_dependency": "服务依赖错误: {details}"
    },
    "favorite": {
      "not_found": "收藏不存在: {context}",
      "already_exists": "收藏已存在",
      "category_not_found": "分类不存在: {context}",
      "validation": "验证错误: {details}",
      "storage": "存储错误: {details}",
      "tag": "标签错误: {details}",
      "tag_already_exists": "标签已存在: {context}",
      "tag_not_found": "标签不存在: {context}",
      "migration": "数据迁移错误: {details}",
      "import_export": "导入导出错误: {details}"
    },
    "image": {
      "prompt_empty": "提示词不能为空",
      "config_id_empty": "图像模型配置ID不能为空",
      "config_not_found": "未找到图像模型配置: {configId}",
      "config_not_enabled": "图像模型配置未启用: {configName}",
      "config_already_exists": "图像模型配置已存在: {configId}",
      "config_does_not_exist": "图像模型配置不存在: {configId}",
      "config_invalid": "图像模型配置无效: {details}",
      "api_key_required": "{providerName} 需要 API Key",
      "model_id_required": "模型ID不能为空",
      "config_provider_mismatch": "配置提供商不匹配: config={configProviderId}, adapter={adapterProviderId}",
      "connection_config_missing_field": "连接配置缺少必填字段: {field}",
      "connection_config_invalid_field_type": "连接配置字段类型错误: {field} 需要 {expectedType}，实际 {actualType}",
      "provider_not_found": "未找到图像提供商: {providerId}",
      "dynamic_models_not_supported": "{providerName} 不支持动态模型获取",
      "unsupported_test_type": "不支持的测试类型: {testType}",
      "invalid_response_format": "API 返回格式无效",
      "base64_decoding_not_supported": "当前环境不支持 Base64 解码",
      "only_single_image_supported": "当前仅支持生成1张图片",
      "text2image_input_image_not_allowed": "文生图不支持输入图像",
      "image2image_input_image_required": "图生图需要提供输入图像",
      "input_image_b64_required": "输入图像必须为 base64",
      "input_image_url_not_supported": "输入图像不支持 URL（仅支持 base64）",
      "input_image_invalid_format": "输入图像格式无效",
      "input_image_unsupported_mime": "仅支持 PNG/JPEG 格式（当前: {mimeType}）",
      "input_image_too_large": "输入图像过大（最大 {maxSizeMB}MB）",
      "input_image_too_many": "输入图像数量过多（最多 {maxCount} 张，当前 {actualCount} 张）",
      "model_not_support_text2image": "当前模型不支持文生图: {modelName}",
      "model_not_support_image2image": "当前模型不支持图生图: {modelName}",
      "model_only_supports_image2image_need_input": "当前模型仅支持图生图，请提供输入图像: {modelName}",
      "generation_failed": "图像生成失败: {details}"
    },
    "context": {
      "not_found": "上下文不存在: {context}",
      "minimum_violation": "无法删除最后一个上下文",
      "invalid_id": "无效的上下文ID: {context}",
      "import_format": "上下文导入格式错误: {details}",
      "invalid_store": "上下文存储数据无效: {details}",
      "storage": "上下文存储错误: {details}",
      "electron_api_unavailable": "当前环境不支持上下文服务"
    },
    "variable_extraction": {
      "validation": "变量提取请求验证错误: {details}",
      "model_not_found": "变量提取模型不存在或未启用: {context}",
      "parse": "变量提取结果解析错误: {details}",
      "execution": "变量提取执行错误: {details}"
    },
    "variable_value_generation": {
      "validation": "变量值生成请求验证错误: {details}",
      "model_not_found": "变量值生成模型不存在或未启用: {context}",
      "parse": "变量值生成结果解析错误: {details}",
      "execution": "变量值生成执行错误: {details}"
    },
    "import_export": {
      "export_failed": "导出失败: {details}",
      "import_failed": "导入失败: {details}",
      "validation": "导入导出验证错误: {details}"
    },
    "data": {
      "invalid_json": "JSON 无效: {details}",
      "invalid_format": "数据格式无效: {details}",
      "import_partial_failed": "导入完成但有 {count} 个错误: {details}",
      "export_failed": "数据导出失败: {details}",
      "electron_api_unavailable": "当前环境不支持数据服务"
    },
    "core": {
      "ipc_serialization_failed": "IPC 序列化失败: {details}"
    },
    "transport": {
      "offline": "网络已断开，请检查后重试",
      "network": "网络连接异常，请稍后重试",
      "timeout": "请求超时，请稍后重试",
      "aborted": "已取消",
      "auth": "身份验证失败，请检查 API Key",
      "permission": "无访问权限（403），请检查 API Key 或模型是否可用",
      "rateLimit": "请求过于频繁（429），请稍后重试",
      "server": "服务端异常，请稍后重试",
      "notFound": "资源不存在（404）",
      "invalidRequest": "请求参数有误，请检查配置",
      "modelUnavailable": "模型不可用，请更换模型或稍后重试",
      "unknown": "请求失败，请稍后重试"
    }
  }
} as const;

export default messages;
