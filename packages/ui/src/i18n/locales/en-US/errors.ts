const messages = {
  "error": {
    "evaluation": {
      "validation": "Evaluation validation error: {details}",
      "model_not_found": "Evaluation model error: Model \"{context}\" does not exist or is not enabled",
      "template_not_found": "Evaluation template error: Template \"{context}\" does not exist",
      "parse": "Evaluation parse error: {details}",
      "execution": "Evaluation execution error: {details}"
    },
    "llm": {
      "api": "API error: {details}",
      "config": "Configuration error: {details}",
      "validation": "Validation error: {details}",
      "initialization": "Initialization error: {details}",
      "api_key_required": "Optimization failed: API key cannot be empty",
      "model_not_found": "Optimization failed: Model not found",
      "template_invalid": "Optimization failed: Invalid prompt format",
      "empty_input": "Optimization failed: Prompt cannot be empty",
      "optimization_failed": "Optimization failed",
      "iteration_failed": "Iteration failed",
      "test_failed": "Test failed",
      "model_key_required": "Optimization failed: Model key cannot be empty",
      "input_too_long": "Optimization failed: Input content too long"
    },
    "history": {
      "not_found": "History record with ID \"{context}\" not found",
      "chain": "History chain error: {details}",
      "record_not_found": "Record not found: {details}",
      "storage": "History storage error: {details}",
      "validation": "Record validation error: {details}"
    },
    "compare": {
      "validation": "Input validation error: {details}",
      "calculation": "Compare calculation error: {details}"
    },
    "storage": {
      "read": "Storage read error: {details}",
      "write": "Storage write error: {details}",
      "delete": "Storage delete error: {details}",
      "clear": "Storage clear error: {details}",
      "config": "Storage configuration error: {details}"
    },
    "model": {
      "validation": "Model validation error: {details}",
      "config": "Model configuration error: {details}"
    },
    "template": {
      "load": "Template load error: {details}",
      "not_found": "Template not found: {context}",
      "validation": "Template validation error: {details}",
      "cache": "Template cache error: {details}",
      "storage": "Template storage error: {details}"
    },
    "prompt": {
      "optimization": "Optimization error: {details}",
      "iteration": "Iteration error: {details}",
      "test": "Test error: {details}",
      "service_dependency": "Service dependency error: {details}"
    },
    "favorite": {
      "not_found": "Favorite not found: {context}",
      "already_exists": "Favorite already exists",
      "category_not_found": "Category not found: {context}",
      "validation": "Validation error: {details}",
      "storage": "Storage error: {details}",
      "tag": "Tag error: {details}",
      "tag_already_exists": "Tag already exists: {context}",
      "tag_not_found": "Tag not found: {context}",
      "migration": "Migration error: {details}",
      "import_export": "Import/export error: {details}"
    },
    "image": {
      "prompt_empty": "Prompt cannot be empty",
      "config_id_empty": "Image model config ID cannot be empty",
      "config_not_found": "Image model config not found: {configId}",
      "config_not_enabled": "Image model config is not enabled: {configName}",
      "config_already_exists": "Image model config already exists: {configId}",
      "config_does_not_exist": "Image model config does not exist: {configId}",
      "config_invalid": "Invalid image model config: {details}",
      "api_key_required": "API key is required for {providerName}",
      "model_id_required": "Model ID is required",
      "config_provider_mismatch": "Image config provider mismatch: config={configProviderId}, adapter={adapterProviderId}",
      "connection_config_missing_field": "Missing required connection field: {field}",
      "connection_config_invalid_field_type": "Connection field {field} must be {expectedType}, got {actualType}",
      "provider_not_found": "Image provider not found: {providerId}",
      "dynamic_models_not_supported": "{providerName} does not support dynamic model fetching",
      "unsupported_test_type": "Unsupported test type: {testType}",
      "invalid_response_format": "Invalid API response format",
      "base64_decoding_not_supported": "Base64 decoding is not supported in this environment",
      "only_single_image_supported": "Only single image generation is supported",
      "text2image_input_image_not_allowed": "Input image is not allowed for text-to-image",
      "image2image_input_image_required": "Input image is required for image-to-image",
      "input_image_b64_required": "Input image must be base64",
      "input_image_url_not_supported": "Input image URL is not supported (base64 only)",
      "input_image_invalid_format": "Invalid input image format",
      "input_image_unsupported_mime": "Only PNG/JPEG is supported (current: {mimeType})",
      "input_image_too_large": "Input image is too large (max {maxSizeMB}MB)",
      "input_image_too_many": "Too many input images (max {maxCount}, got {actualCount})",
      "model_not_support_text2image": "Model does not support text-to-image: {modelName}",
      "model_not_support_image2image": "Model does not support image-to-image: {modelName}",
      "model_only_supports_image2image_need_input": "Model only supports image-to-image. Please provide an input image: {modelName}",
      "generation_failed": "Image generation failed: {details}"
    },
    "context": {
      "not_found": "Context not found: {context}",
      "minimum_violation": "Cannot remove the last context",
      "invalid_id": "Invalid context ID: {context}",
      "import_format": "Invalid context import format: {details}",
      "invalid_store": "Invalid context store: {details}",
      "storage": "Context storage error: {details}",
      "electron_api_unavailable": "Context service is not available in this environment"
    },
    "variable_extraction": {
      "validation": "Variable extraction validation error: {details}",
      "model_not_found": "Variable extraction model not found: {context}",
      "parse": "Variable extraction parse error: {details}",
      "execution": "Variable extraction execution error: {details}"
    },
    "variable_value_generation": {
      "validation": "Variable value generation validation error: {details}",
      "model_not_found": "Variable value generation model not found: {context}",
      "parse": "Variable value generation parse error: {details}",
      "execution": "Variable value generation execution error: {details}"
    },
    "import_export": {
      "export_failed": "Export failed: {details}",
      "import_failed": "Import failed: {details}",
      "validation": "Import/export validation error: {details}"
    },
    "data": {
      "invalid_json": "Invalid JSON: {details}",
      "invalid_format": "Invalid data format: {details}",
      "import_partial_failed": "Import completed with {count} errors: {details}",
      "export_failed": "Data export failed: {details}",
      "electron_api_unavailable": "Data service is not available in this environment"
    },
    "core": {
      "ipc_serialization_failed": "IPC serialization failed: {details}"
    },
    "transport": {
      "offline": "You appear to be offline. Please check your connection and retry.",
      "network": "Network error, please retry.",
      "timeout": "Request timed out, please retry.",
      "aborted": "Cancelled.",
      "auth": "Authentication failed. Please verify your API key.",
      "permission": "Access denied (403). Verify API key or model availability.",
      "rateLimit": "Rate limited (429). Please retry later.",
      "server": "Server error. Please retry later.",
      "notFound": "Resource not found (404).",
      "invalidRequest": "Invalid request. Please review the configuration.",
      "modelUnavailable": "Model unavailable. Try another model or retry later.",
      "unknown": "Request failed. Please retry."
    }
  }
} as const;

export default messages;
