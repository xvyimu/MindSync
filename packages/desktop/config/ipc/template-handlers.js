/**
 * 注册模板管理相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerTemplateIpcHandlers({
  registerSensitiveIpc,
  templateManager,
  safeSerialize,
}) {
  registerSensitiveIpc('template-getTemplates', async () => templateManager.listTemplates());

  registerSensitiveIpc('template-getTemplate', async (_event, id) => templateManager.getTemplate(id));

  registerSensitiveIpc('template-createTemplate', async (_event, template) => {
    await templateManager.saveTemplate(safeSerialize(template));
    return null;
  });

  registerSensitiveIpc('template-updateTemplate', async (_event, id, updates) => {
    const existingTemplate = await templateManager.getTemplate(id);
    const safeUpdates = safeSerialize(updates);
    const updatedTemplate = { ...existingTemplate, ...safeUpdates, id };
    await templateManager.saveTemplate(updatedTemplate);
    return null;
  });

  registerSensitiveIpc('template-deleteTemplate', async (_event, id) => {
    await templateManager.deleteTemplate(id);
    return null;
  });

  registerSensitiveIpc('template-listTemplatesByType', async (_event, type) => {
    return templateManager.listTemplatesByType(type);
  });

  registerSensitiveIpc('template-exportTemplate', async (_event, id) => {
    return templateManager.exportTemplate(id);
  });

  registerSensitiveIpc('template-importTemplate', async (_event, jsonString) => {
    await templateManager.importTemplate(jsonString);
    return null;
  });

  registerSensitiveIpc('template-exportData', async () => templateManager.exportData());

  registerSensitiveIpc('template-importData', async (_event, data) => {
    await templateManager.importData(safeSerialize(data));
    return null;
  });

  registerSensitiveIpc('template-getDataType', async () => templateManager.getDataType());

  registerSensitiveIpc('template-validateData', async (_event, data) => {
    return templateManager.validateData(safeSerialize(data));
  });

  registerSensitiveIpc('template-changeBuiltinTemplateLanguage', async (_event, language) => {
    await templateManager.changeBuiltinTemplateLanguage(language);
    return null;
  });

  registerSensitiveIpc('template-getCurrentBuiltinTemplateLanguage', async () => {
    return templateManager.getCurrentBuiltinTemplateLanguage();
  });

  registerSensitiveIpc('template-getSupportedBuiltinTemplateLanguages', async () => {
    return templateManager.getSupportedBuiltinTemplateLanguages();
  });
}

module.exports = {
  registerTemplateIpcHandlers,
};
