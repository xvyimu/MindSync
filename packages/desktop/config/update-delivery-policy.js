const { getRepositoryInfo } = require('./update-config');

const UPDATE_DELIVERY_MODES = Object.freeze({
  IN_APP: 'in-app',
  MANUAL_RELEASE: 'manual-release',
});

const UPDATE_DELIVERY_REASONS = Object.freeze({
  MACOS_UNSIGNED: 'macos-unsigned',
});

const buildFallbackReleaseUrl = (repositoryInfo = getRepositoryInfo()) => {
  const owner = typeof repositoryInfo?.owner === 'string' ? repositoryInfo.owner.trim() : '';
  const repo = typeof repositoryInfo?.repo === 'string' ? repositoryInfo.repo.trim() : '';

  if (!owner || !repo || owner === 'unknown' || repo === 'unknown') {
    return null;
  }

  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
};

const getUpdateDeliveryPolicy = ({
  platform = process.platform,
  arch = process.arch,
  repositoryInfo = getRepositoryInfo(),
} = {}) => {
  const isUnsignedMac = platform === 'darwin';

  return {
    mode: isUnsignedMac
      ? UPDATE_DELIVERY_MODES.MANUAL_RELEASE
      : UPDATE_DELIVERY_MODES.IN_APP,
    reason: isUnsignedMac ? UPDATE_DELIVERY_REASONS.MACOS_UNSIGNED : null,
    platform,
    arch,
    fallbackReleaseUrl: buildFallbackReleaseUrl(repositoryInfo),
  };
};

const isManualReleaseDelivery = (policy) =>
  policy?.mode === UPDATE_DELIVERY_MODES.MANUAL_RELEASE;

const createManualUpdateRequiredError = (operation, policy, details = {}) => {
  const error = new Error('In-app updates are unavailable for this build. Use the release page to update manually.');
  error.code = 'UPDATER_MANUAL_DOWNLOAD_REQUIRED';
  error.params = {
    operation,
    ...details,
    updateDelivery: policy,
  };
  return error;
};

module.exports = {
  UPDATE_DELIVERY_MODES,
  UPDATE_DELIVERY_REASONS,
  buildFallbackReleaseUrl,
  getUpdateDeliveryPolicy,
  isManualReleaseDelivery,
  createManualUpdateRequiredError,
};
