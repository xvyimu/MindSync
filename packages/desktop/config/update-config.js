/**
 * 自动更新配置
 * 集中管理更新相关的配置信息，避免硬编码
 */

// 导入静态常量
const { IPC_EVENTS, PREFERENCE_KEYS, DEFAULT_CONFIG } = require('./constants');

// 从package.json读取仓库信息
const packageJson = require('../package.json');

const GITHUB_OWNER_PATTERN = /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;

const parseRepositorySlug = (value) => {
  if (typeof value !== 'string') return null;

  const parts = value.trim().split('/').map(part => part.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (parts.some(part => part.toLowerCase() === 'unknown')) return null;
  if (!GITHUB_OWNER_PATTERN.test(parts[0]) || !GITHUB_REPO_PATTERN.test(parts[1])) return null;

  return { owner: parts[0], repo: parts[1] };
};

const parseRepositoryUrl = (value) => {
  if (typeof value !== 'string') return null;

  const repositoryUrl = value.trim();
  const scpMatch = repositoryUrl.match(/^git@github\.com:([^/\s]+)\/([^/\s]+)$/i);
  if (scpMatch) {
    return parseRepositorySlug(`${scpMatch[1]}/${scpMatch[2].replace(/\.git$/i, '')}`);
  }

  const normalizedUrl = repositoryUrl.replace(/^git\+/, '');
  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return null;
  }

  if (
    !['https:', 'http:', 'git:', 'ssh:'].includes(parsedUrl.protocol) ||
    parsedUrl.hostname.toLowerCase() !== 'github.com'
  ) {
    return null;
  }

  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 2) return null;

  return parseRepositorySlug(`${pathParts[0]}/${pathParts[1].replace(/\.git$/i, '')}`);
};

const getPublishRepositoryInfo = (packageMetadata = packageJson) => {
  const publish = packageMetadata?.build?.publish;
  if (!publish || typeof publish !== 'object' || Array.isArray(publish)) return null;
  if (publish.provider !== 'github') return null;
  if (typeof publish.owner !== 'string' || typeof publish.repo !== 'string') return null;

  return parseRepositorySlug(`${publish.owner}/${publish.repo}`);
};

// 从环境变量或package.json获取仓库信息
const getRepositoryInfo = ({
  environment = process.env,
  packageMetadata = packageJson,
} = {}) => {
  // GitHub Actions/runtime 显式仓库优先
  const githubRepository = parseRepositorySlug(environment.GITHUB_REPOSITORY);
  if (githubRepository) return githubRepository;

  // 本地开发更新源必须与 Release 页面使用同一仓库
  const devOwner = typeof environment.DEV_REPO_OWNER === 'string'
    ? environment.DEV_REPO_OWNER.trim()
    : '';
  const devRepo = typeof environment.DEV_REPO_NAME === 'string'
    ? environment.DEV_REPO_NAME.trim()
    : '';
  if (devOwner && devRepo) {
    const devRepository = parseRepositorySlug(`${devOwner}/${devRepo}`);
    if (devRepository) return devRepository;
  }

  // electron-builder uses build.publish to generate app-update.yml, so this is
  // the authoritative packaged updater source when no runtime override exists.
  const publishRepository = getPublishRepositoryInfo(packageMetadata);
  if (publishRepository) return publishRepository;
  if (packageMetadata?.build?.publish != null) {
    console.warn('[Update Config] Unsupported or invalid build.publish configuration');
    return { owner: 'unknown', repo: 'unknown' };
  }
  
  // repository.url is metadata only; use it as a fallback when publish config is absent.
  if (packageMetadata?.repository?.url) {
    const repositoryInfo = parseRepositoryUrl(packageMetadata.repository.url);
    if (repositoryInfo) return repositoryInfo;
  }
  
  // 最后的fallback（应该避免到达这里）
  console.warn('[Update Config] No repository info found, using fallback');
  return { owner: 'unknown', repo: 'unknown' };
};

const toRepositorySlug = (repositoryInfo) => {
  if (!repositoryInfo || typeof repositoryInfo !== 'object') return null;
  if (typeof repositoryInfo.owner !== 'string' || typeof repositoryInfo.repo !== 'string') return null;

  const parsed = parseRepositorySlug(`${repositoryInfo.owner}/${repositoryInfo.repo}`);
  return parsed ? `${parsed.owner}/${parsed.repo}` : null;
};

const resolveUpdateRepositoryConfig = ({
  environment = process.env,
  packageMetadata = packageJson,
} = {}) => {
  const packagedRepositoryInfo = getRepositoryInfo({ environment: {}, packageMetadata });
  const repositoryInfo = getRepositoryInfo({ environment, packageMetadata });
  const packagedRepositorySlug = toRepositorySlug(packagedRepositoryInfo);
  const repositorySlug = toRepositorySlug(repositoryInfo);

  return {
    packagedRepositoryInfo,
    repositoryInfo,
    packagedRepositorySlug,
    repositorySlug,
    shouldOverrideFeed: Boolean(
      repositorySlug && repositorySlug !== packagedRepositorySlug
    ),
  };
};

// 验证版本号格式
const validateVersion = (version) => {
  if (!version || typeof version !== 'string') {
    return false;
  }
  
  // 基本的版本号格式验证（支持语义化版本）
  const versionRegex = /^v?\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
  return versionRegex.test(version);
};

// 构建安全的Release URL
const buildReleaseUrl = (version, repositoryInfo = getRepositoryInfo()) => {
  if (!validateVersion(version)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  const resolvedRepository = (
    repositoryInfo &&
    typeof repositoryInfo === 'object' &&
    typeof repositoryInfo.owner === 'string' &&
    typeof repositoryInfo.repo === 'string'
  ) ? parseRepositorySlug(`${repositoryInfo.owner}/${repositoryInfo.repo}`) : null;
  
  if (
    !resolvedRepository ||
    resolvedRepository.owner === 'unknown' ||
    resolvedRepository.repo === 'unknown'
  ) {
    throw new Error('Repository information not available');
  }
  const { owner, repo } = resolvedRepository;
  
  // 确保版本号以v开头
  const versionTag = version.startsWith('v') ? version : `v${version}`;
  
  // 使用URL构造器确保安全性
  const baseUrl = 'https://github.com';
  return `${baseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tag/${encodeURIComponent(versionTag)}`;
};

// 注意：静态常量已移至 constants.js 文件
// 这里只保留动态逻辑函数

module.exports = {
  // 动态函数
  getPublishRepositoryInfo,
  getRepositoryInfo,
  resolveUpdateRepositoryConfig,
  validateVersion,
  buildReleaseUrl,

  // 重新导出静态常量（保持向后兼容）
  IPC_EVENTS,
  PREFERENCE_KEYS,
  DEFAULT_CONFIG
};
