const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFallbackReleaseUrl,
  createManualUpdateRequiredError,
  getUpdateDeliveryPolicy,
  isManualReleaseDelivery,
} = require('./update-delivery-policy');

const repositoryInfo = {
  owner: 'linshenkx',
  repo: 'prompt-optimizer',
};

test('macOS uses manual release delivery with runtime details', () => {
  const policy = getUpdateDeliveryPolicy({
    platform: 'darwin',
    arch: 'arm64',
    repositoryInfo,
  });

  assert.deepEqual(policy, {
    mode: 'manual-release',
    reason: 'macos-unsigned',
    platform: 'darwin',
    arch: 'arm64',
    fallbackReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases',
  });
  assert.equal(isManualReleaseDelivery(policy), true);
});

test('Windows and Linux keep in-app update delivery', () => {
  for (const [platform, arch] of [
    ['win32', 'x64'],
    ['linux', 'arm64'],
  ]) {
    const policy = getUpdateDeliveryPolicy({ platform, arch, repositoryInfo });

    assert.deepEqual(policy, {
      mode: 'in-app',
      reason: null,
      platform,
      arch,
      fallbackReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases',
    });
    assert.equal(isManualReleaseDelivery(policy), false);
  }
});

test('fallback release URL reuses repository configuration safely', () => {
  assert.equal(
    buildFallbackReleaseUrl({ owner: 'example-owner', repo: 'example.repo' }),
    'https://github.com/example-owner/example.repo/releases',
  );
  assert.equal(buildFallbackReleaseUrl({ owner: 'unknown', repo: 'unknown' }), null);
  assert.equal(buildFallbackReleaseUrl({ owner: '', repo: 'prompt-optimizer' }), null);
});

test('manual-required error carries a structured code and delivery policy', () => {
  const policy = getUpdateDeliveryPolicy({
    platform: 'darwin',
    arch: 'x64',
    repositoryInfo,
  });

  const error = createManualUpdateRequiredError('download-specific-version', policy, {
    versionType: 'stable',
  });

  assert.equal(error.code, 'UPDATER_MANUAL_DOWNLOAD_REQUIRED');
  assert.deepEqual(error.params, {
    operation: 'download-specific-version',
    versionType: 'stable',
    updateDelivery: policy,
  });
});
