import { computed, unref, type CSSProperties, type MaybeRef } from 'vue'

import { useThemeVars, type TooltipProps } from 'naive-ui';

type TooltipThemeOverrides = NonNullable<TooltipProps['themeOverrides']>;
export type TooltipDensity = 'compact' | 'rich';
export type TooltipVariant = 'auto' | TooltipDensity;

const COMPACT_LABEL_MAX_LENGTH = 18;
const COMPACT_TOOLTIP_PADDING = '4px 8px';
const RICH_TOOLTIP_PADDING = '8px';

interface UseTooltipThemeOptions {
  density?: MaybeRef<TooltipDensity>;
  maxWidth?: CSSProperties['maxWidth'];
  maxHeight?: CSSProperties['maxHeight'];
  whiteSpace?: CSSProperties['whiteSpace'];
  wordBreak?: CSSProperties['wordBreak'];
  overflowWrap?: CSSProperties['overflowWrap'];
  padding?: CSSProperties['padding'];
  overflowY?: CSSProperties['overflowY'];
}

export function resolveTooltipDensity(options: {
  variant?: TooltipVariant;
  label?: string;
  hasContentSlot?: boolean;
}): TooltipDensity {
  if (options.variant === 'compact' || options.variant === 'rich') {
    return options.variant;
  }

  if (options.hasContentSlot) {
    return 'rich';
  }

  const label = options.label?.trim() ?? '';
  if (!label) {
    return 'rich';
  }

  if (/[\r\n]/.test(label)) {
    return 'rich';
  }

  return label.length <= COMPACT_LABEL_MAX_LENGTH ? 'compact' : 'rich';
}

function formatTooltipPadding(
  padding: CSSProperties['padding'] | undefined,
  fallback: string,
): string {
  if (padding === undefined || padding === null) {
    return fallback;
  }

  return typeof padding === 'number' ? `${padding}px` : String(padding);
}

/**
 * Naive UI 默认会将 Tooltip 叠加层合成成接近黑色的背景，这在浅色主题下会显得突兀。
 * 这里基于 ConfigProvider 的主题变量构建 tooltip 的 themeOverrides，并提供常用的内容样式，
 * 让 Tooltip 的背景与弹层类组件保持一致，同时限制尺寸防止遮挡。
 */
export function useTooltipTheme(options: UseTooltipThemeOptions = {}) {
  const themeVars = useThemeVars();
  const density = computed<TooltipDensity>(() => unref(options.density) ?? 'rich');

  const tooltipThemeOverrides = computed<TooltipThemeOverrides>(() => {
    const vars = themeVars.value;
    const isCompact = density.value === 'compact';

    return {
      color: vars.popoverColor,
      textColor: vars.textColor2,
      padding: isCompact
        ? formatTooltipPadding(options.padding, COMPACT_TOOLTIP_PADDING)
        : '0',
      boxShadow: isCompact ? (vars.boxShadow1 ?? '0 6px 18px rgba(15, 23, 42, 0.10)') : vars.boxShadow2,
      borderRadius: vars.borderRadius
    };
  });

  const tooltipOverlayStyle = computed<CSSProperties>(() => ({
    maxWidth: options.maxWidth ?? 'calc(100vw - 32px)',
    maxHeight: options.maxHeight ?? 'calc(100vh - 32px)'
  }));

  const tooltipContentStyle = computed<CSSProperties>(() => ({
    maxWidth: '100%',
    maxHeight: options.maxHeight ?? 'calc(100vh - 32px)',
    whiteSpace: options.whiteSpace ?? (density.value === 'compact' ? 'nowrap' : 'pre-wrap'),
    wordBreak: options.wordBreak ?? 'break-word',
    overflowWrap: options.overflowWrap ?? 'anywhere',
    ...(density.value === 'rich'
      ? { padding: formatTooltipPadding(options.padding, RICH_TOOLTIP_PADDING) }
      : {}),
    overflowY: options.overflowY ?? (density.value === 'compact' ? 'visible' : 'auto'),
    border: density.value === 'compact' ? 'none' : `1px solid ${themeVars.value.dividerColor}`,
    boxSizing: 'border-box'
  }));

  return {
    tooltipThemeOverrides,
    tooltipOverlayStyle,
    tooltipContentStyle
  };
}
