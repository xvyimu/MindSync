const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildReleaseUrl,
  getPublishRepositoryInfo,
  getRepositoryInfo,
  resolveUpdateRepositoryConfig,
} = require('./update-config');

const packageMetadata = {
  repository: {
    url: 'https://github.com/package-owner/package-repo.git',
  },
  build: {
    publish: {
      provider: 'github',
      owner: 'publish-owner',
      repo: 'publish-repo',
    },
  },
};

test('runtime repository resolution uses one explicit precedence order', () => {
  assert.deepEqual(
    getRepositoryInfo({
      environment: {
        GITHUB_REPOSITORY: 'actions-owner/actions-repo',
        DEV_REPO_OWNER: 'dev-owner',
        DEV_REPO_NAME: 'dev-repo',
      },
      packageMetadata,
    }),
    { owner: 'actions-owner', repo: 'actions-repo' },
  );

  assert.deepEqual(
    getRepositoryInfo({
      environment: {
        DEV_REPO_OWNER: 'dev-owner',
        DEV_REPO_NAME: 'dev-repo',
      },
      packageMetadata,
    }),
    { owner: 'dev-owner', repo: 'dev-repo' },
  );

  assert.deepEqual(
    getRepositoryInfo({
      environment: { DEV_REPO_OWNER: 'incomplete-owner' },
      packageMetadata,
    }),
    { owner: 'publish-owner', repo: 'publish-repo' },
  );
});

test('packaged updater source prioritizes build.publish over repository metadata', () => {
  assert.deepEqual(
    getPublishRepositoryInfo(packageMetadata),
    { owner: 'publish-owner', repo: 'publish-repo' },
  );
  assert.deepEqual(
    getRepositoryInfo({ environment: {}, packageMetadata }),
    { owner: 'publish-owner', repo: 'publish-repo' },
  );
});

test('fork runtime override stays distinct from a conflicting packaged updater source', () => {
  const forkPackageMetadata = {
    repository: { url: 'https://github.com/fork-owner/fork-repo.git' },
    build: {
      publish: {
        provider: 'github',
        owner: 'upstream-owner',
        repo: 'upstream-repo',
      },
    },
  };

  const resolved = resolveUpdateRepositoryConfig({
    environment: {
      DEV_REPO_OWNER: 'fork-owner',
      DEV_REPO_NAME: 'fork-repo',
    },
    packageMetadata: forkPackageMetadata,
  });

  assert.deepEqual(resolved.packagedRepositoryInfo, { owner: 'upstream-owner', repo: 'upstream-repo' });
  assert.deepEqual(resolved.repositoryInfo, { owner: 'fork-owner', repo: 'fork-repo' });
  assert.equal(resolved.packagedRepositorySlug, 'upstream-owner/upstream-repo');
  assert.equal(resolved.repositorySlug, 'fork-owner/fork-repo');
  assert.equal(resolved.shouldOverrideFeed, true);
});

test('unsupported publish shapes fail closed instead of selecting a different GitHub provider', () => {
  for (const publish of [
    [
      { provider: 'generic', url: 'https://updates.example.com' },
      { provider: 'github', owner: 'secondary-owner', repo: 'secondary-repo' },
    ],
    { provider: 'generic', url: 'https://updates.example.com' },
  ]) {
    const metadata = {
      repository: { url: 'https://github.com/metadata-owner/metadata-repo.git' },
      build: { publish },
    };

    assert.equal(getPublishRepositoryInfo(metadata), null);
    assert.deepEqual(
      getRepositoryInfo({ environment: {}, packageMetadata: metadata }),
      { owner: 'unknown', repo: 'unknown' },
    );
  }
});

test('repository metadata remains a fallback when publish config is absent', () => {
  for (const url of [
    'git@github.com:package-owner/package.repo.git',
    'https://github.com/package-owner/package.repo.git',
    'git+https://github.com/package-owner/package.repo.git',
  ]) {
    assert.deepEqual(
      getRepositoryInfo({
        environment: {},
        packageMetadata: { repository: { url } },
      }),
      { owner: 'package-owner', repo: 'package.repo' },
    );
  }
});

test('repository metadata fallback rejects non-GitHub and lookalike hosts', () => {
  for (const url of [
    'https://notgithub.com/attacker/repo',
    'https://github.com.evil.example/attacker/repo',
    'https://example.com/github.com/attacker/repo',
  ]) {
    assert.deepEqual(
      getRepositoryInfo({
        environment: {},
        packageMetadata: { repository: { url } },
      }),
      { owner: 'unknown', repo: 'unknown' },
    );
  }
});

test('malformed runtime repository overrides fall back to packaged publish config', () => {
  for (const environment of [
    { GITHUB_REPOSITORY: '\\\\evil.example/repo' },
    { GITHUB_REPOSITORY: '../repo' },
    { GITHUB_REPOSITORY: 'double--hyphen/repo' },
    { GITHUB_REPOSITORY: 'unknown/repo' },
    { DEV_REPO_OWNER: '\\\\evil.example', DEV_REPO_NAME: 'repo' },
    { DEV_REPO_OWNER: 'valid-owner', DEV_REPO_NAME: '../repo' },
  ]) {
    assert.deepEqual(
      getRepositoryInfo({ environment, packageMetadata }),
      { owner: 'publish-owner', repo: 'publish-repo' },
    );
  }
});

test('release URL uses the same resolved repository as the update feed', () => {
  const repositoryInfo = getRepositoryInfo({
    environment: {
      DEV_REPO_OWNER: 'custom-owner',
      DEV_REPO_NAME: 'custom-repo',
    },
    packageMetadata,
  });

  assert.equal(
    buildReleaseUrl('2.12.0', repositoryInfo),
    'https://github.com/custom-owner/custom-repo/releases/tag/v2.12.0',
  );
});

test('release URL rejects malformed repository information', () => {
  assert.throws(
    () => buildReleaseUrl('2.12.0', { owner: '\\\\evil.example', repo: 'repo' }),
    /Repository information not available/,
  );
  assert.throws(
    () => buildReleaseUrl('2.12.0', { owner: 'unknown', repo: 'unknown' }),
    /Repository information not available/,
  );
  assert.throws(
    () => buildReleaseUrl('2.12.0', {}),
    /Repository information not available/,
  );
});
