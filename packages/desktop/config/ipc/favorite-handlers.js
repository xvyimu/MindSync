/**
 * 注册收藏管理相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封（保留 error.code）。
 */
function registerFavoriteIpcHandlers({
  registerSensitiveIpc,
  favoriteManager,
  safeSerialize,
}) {
  registerSensitiveIpc('favorite-addFavorite', async (_event, favorite) => {
    return favoriteManager.addFavorite(safeSerialize(favorite));
  });

  registerSensitiveIpc('favorite-getFavorites', async (_event, options) => {
    return favoriteManager.getFavorites(safeSerialize(options) || undefined);
  });

  registerSensitiveIpc('favorite-getFavorite', async (_event, id) => {
    return favoriteManager.getFavorite(id);
  });

  registerSensitiveIpc('favorite-updateFavorite', async (_event, id, updates) => {
    await favoriteManager.updateFavorite(id, safeSerialize(updates));
    return null;
  });

  registerSensitiveIpc('favorite-setFavoritePromptAssetCurrentVersion', async (_event, id, versionId) => {
    await favoriteManager.setFavoritePromptAssetCurrentVersion(id, versionId);
    return null;
  });

  registerSensitiveIpc('favorite-deleteFavoritePromptAssetVersion', async (_event, id, versionId) => {
    await favoriteManager.deleteFavoritePromptAssetVersion(id, versionId);
    return null;
  });

  registerSensitiveIpc('favorite-deleteFavorite', async (_event, id) => {
    await favoriteManager.deleteFavorite(id);
    return null;
  });

  registerSensitiveIpc('favorite-deleteFavorites', async (_event, ids) => {
    await favoriteManager.deleteFavorites(safeSerialize(ids));
    return null;
  });

  registerSensitiveIpc('favorite-incrementUseCount', async (_event, id) => {
    await favoriteManager.incrementUseCount(id);
    return null;
  });

  registerSensitiveIpc('favorite-getCategories', async () => favoriteManager.getCategories());

  registerSensitiveIpc('favorite-addCategory', async (_event, category) => {
    return favoriteManager.addCategory(safeSerialize(category));
  });

  registerSensitiveIpc('favorite-updateCategory', async (_event, id, updates) => {
    await favoriteManager.updateCategory(id, safeSerialize(updates));
    return null;
  });

  registerSensitiveIpc('favorite-deleteCategory', async (_event, id) => {
    return favoriteManager.deleteCategory(id);
  });

  registerSensitiveIpc('favorite-getStats', async () => favoriteManager.getStats());

  registerSensitiveIpc('favorite-searchFavorites', async (_event, keyword, options) => {
    return favoriteManager.searchFavorites(keyword, safeSerialize(options) || undefined);
  });

  registerSensitiveIpc('favorite-exportFavorites', async (_event, ids) => {
    return favoriteManager.exportFavorites(safeSerialize(ids) || undefined);
  });

  registerSensitiveIpc('favorite-importFavorites', async (_event, data, options) => {
    const safeData = typeof data === 'string' ? data : safeSerialize(data);
    return favoriteManager.importFavorites(safeData, safeSerialize(options) || undefined);
  });

  registerSensitiveIpc('favorite-getAllTags', async () => favoriteManager.getAllTags());

  registerSensitiveIpc('favorite-addTag', async (_event, tag) => {
    await favoriteManager.addTag(tag);
    return null;
  });

  registerSensitiveIpc('favorite-renameTag', async (_event, oldTag, newTag) => {
    return favoriteManager.renameTag(oldTag, newTag);
  });

  registerSensitiveIpc('favorite-mergeTags', async (_event, sourceTags, targetTag) => {
    return favoriteManager.mergeTags(safeSerialize(sourceTags), targetTag);
  });

  registerSensitiveIpc('favorite-deleteTag', async (_event, tag) => {
    return favoriteManager.deleteTag(tag);
  });

  registerSensitiveIpc('favorite-reorderCategories', async (_event, categoryIds) => {
    await favoriteManager.reorderCategories(safeSerialize(categoryIds));
    return null;
  });

  registerSensitiveIpc('favorite-getCategoryUsage', async (_event, categoryId) => {
    return favoriteManager.getCategoryUsage(categoryId);
  });

  registerSensitiveIpc('favorite-ensureDefaultCategories', async (_event, defaultCategories) => {
    await favoriteManager.ensureDefaultCategories(safeSerialize(defaultCategories));
    return null;
  });
}

module.exports = {
  registerFavoriteIpcHandlers,
};
