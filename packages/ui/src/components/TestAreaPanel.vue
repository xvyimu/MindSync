<template>
    <NFlex vertical :style="{ height: '100%', gap: '8px' }">
        <!-- 测试输入区域 (仅在系统提示词优化模式下显示) -->
        <NCard v-if="showTestInput" :style="{ flexShrink: 0 }" size="small">
            <TestInputSection
                v-model="testContentProxy"
                :label="t('test.content')"
                :placeholder="t('test.placeholder')"
                :help-text="t('test.simpleMode.help')"
                :disabled="isTestRunning"
                :mode="adaptiveInputMode"
                :size="inputSize"
                :enable-fullscreen="enableFullscreen"
                :test-id="props.testIdPrefix ? `${props.testIdPrefix}-test-input` : undefined"
            />
        </NCard>

        <!-- 控制工具栏 -->
        <NCard :style="{ flexShrink: 0 }" size="small">
            <TestControlBar
                :model-label="t('test.model')"
                :model-name="props.modelName"
                :show-compare-toggle="enableCompareMode"
                :is-compare-mode="props.isCompareMode"
                :primary-action-text="primaryActionText"
                :primary-action-disabled="primaryActionDisabled"
                :primary-action-loading="isTestRunning"
                :button-size="adaptiveButtonSize"
                :compare-toggle-test-id="props.testIdPrefix ? `${props.testIdPrefix}-test-compare-toggle` : undefined"
                :primary-action-test-id="props.testIdPrefix ? `${props.testIdPrefix}-test-run` : undefined"
                @compare-toggle="handleCompareToggle"
                @primary-action="handleTest"
            >
                <template #model-select>
                    <slot name="model-select"></slot>
                </template>
                <template #secondary-controls>
                    <slot name="secondary-controls"></slot>
                </template>
                <template #custom-actions>
                    <slot name="custom-actions"></slot>
                </template>
            </TestControlBar>
        </NCard>

        <!-- 测试结果区域 -->
        <TestResultSection
            :is-compare-mode="props.isCompareMode && enableCompareMode"
            :vertical-layout="adaptiveResultVerticalLayout"
            :show-primary="showPrimaryResult"
            :primary-title="primaryResultTitle"
            :secondary-title="secondaryResultTitle"
            :single-result-title="singleResultTitle"
            :primary-result="primaryResult"
            :secondary-result="secondaryResult"
            :single-result="singleResult"
            :size="adaptiveButtonSize"
            :style="{ flex: 1, minHeight: 0 }"
            :show-evaluation="showEvaluation"
            :has-primary-result="hasPrimaryResult"
            :has-secondary-result="hasSecondaryResult"
            :is-evaluating-primary="isEvaluatingPrimary"
            :is-evaluating-secondary="isEvaluatingSecondary"
            :primary-score="primaryScore"
            :secondary-score="secondaryScore"
            :has-primary-evaluation="hasPrimaryEvaluation"
            :has-secondary-evaluation="hasSecondaryEvaluation"
            :primary-evaluation-result="primaryEvaluationResult"
            :secondary-evaluation-result="secondaryEvaluationResult"
            :primary-score-level="primaryScoreLevel"
            :secondary-score-level="secondaryScoreLevel"
            @evaluate-primary="handleEvaluatePrimary"
            @evaluate-secondary="handleEvaluateSecondary"
            @evaluate-with-feedback="handleEvaluateWithFeedback"
            @show-primary-detail="handleShowPrimaryDetail"
            @show-secondary-detail="handleShowSecondaryDetail"
            @apply-improvement="handleApplyImprovement"
            @apply-patch="handleApplyPatch"
        >
            <template #primary-result>
                <div class="result-container">
                    <ToolCallDisplay
                        v-if="variantToolCalls[COMPARE_BASELINE_VARIANT_ID].length > 0"
                        :tool-calls="variantToolCalls[COMPARE_BASELINE_VARIANT_ID]"
                        :size="
                            adaptiveButtonSize === 'large' ? 'medium' : 'small'
                        "
                        class="tool-calls-section"
                    />

                    <div class="result-body">
                        <slot name="primary-result"></slot>
                    </div>
                </div>
            </template>
            <template #secondary-result>
                <div class="result-container">
                    <ToolCallDisplay
                        v-if="variantToolCalls[COMPARE_CANDIDATE_VARIANT_ID].length > 0"
                        :tool-calls="variantToolCalls[COMPARE_CANDIDATE_VARIANT_ID]"
                        :size="
                            adaptiveButtonSize === 'large' ? 'medium' : 'small'
                        "
                        class="tool-calls-section"
                    />

                    <div class="result-body">
                        <slot name="secondary-result"></slot>
                    </div>
                </div>
            </template>
            <template #single-result>
                <div class="result-container">
                    <ToolCallDisplay
                        v-if="variantToolCalls[SINGLE_TEST_VARIANT_ID].length > 0"
                        :tool-calls="variantToolCalls[SINGLE_TEST_VARIANT_ID]"
                        :size="
                            adaptiveButtonSize === 'large' ? 'medium' : 'small'
                        "
                        class="tool-calls-section"
                    />

                    <div class="result-body">
                        <slot name="single-result"></slot>
                    </div>
                </div>
            </template>
        </TestResultSection>
    </NFlex>
</template>

<script setup lang="ts">
import { computed, reactive, onUnmounted } from 'vue'

import { useI18n } from "vue-i18n";
import {
    NFlex,
    NCard,
} from "naive-ui";
import type {
    OptimizationMode,
    AdvancedTestResult,
    ToolCallResult,
    ConversationMessage,
    EvaluationResponse,
    EvaluationType,
    PatchOperation,
} from "@mindsync/core";
import type { ScoreLevel } from './evaluation/types';
import { useResponsive } from '../composables/ui/useResponsive';
import { usePerformanceMonitor } from "../composables/performance/usePerformanceMonitor";
import { useDebounceThrottle } from "../composables/performance/useDebounceThrottle";
import {
    COMPARE_BASELINE_VARIANT_ID,
    COMPARE_CANDIDATE_VARIANT_ID,
    SINGLE_TEST_VARIANT_ID,
} from "../composables/prompt/testVariantState";
import TestInputSection from "./TestInputSection.vue";
import TestControlBar from "./TestControlBar.vue";
import TestResultSection from "./TestResultSection.vue";
import ToolCallDisplay from "./ToolCallDisplay.vue";

const { t } = useI18n();

// 性能监控
const {
    recordUpdate,
    getPerformanceReport,
    // performanceGrade  // 保留用于性能监控
} = usePerformanceMonitor("TestAreaPanel");

// 防抖节流
const { debounce, throttle } = useDebounceThrottle();

// 响应式配置
const {
    shouldUseVerticalLayout,
    shouldUseCompactMode,
    // spaceSize,  // 保留用于响应式布局
    buttonSize,
    inputSize,
    // gridConfig  // 保留用于网格布局
} = useResponsive();

interface Props {
    // 核心状态
    optimizationMode: OptimizationMode;
    isTestRunning?: boolean;

    // 测试内容
    testContent?: string;
    optimizedPrompt?: string; // 优化后的提示词（用于变量检测）
    isCompareMode?: boolean;

    // 模型信息（用于显示标签）
    modelName?: string;

    // 功能开关
    enableCompareMode?: boolean;
    enableFullscreen?: boolean;

    // 布局配置
    inputMode?: "compact" | "normal";
    buttonSize?: "small" | "medium" | "large";

    // 结果显示配置
    showPrimaryResult?: boolean;
    resultVerticalLayout?: boolean;
    primaryResultTitle?: string;
    secondaryResultTitle?: string;
    singleResultTitle?: string;

    // 高级功能：测试结果数据（支持工具调用显示）
    primaryResult?: AdvancedTestResult;
    secondaryResult?: AdvancedTestResult;
    singleResult?: AdvancedTestResult;

    // 评估功能配置
    showEvaluation?: boolean;
    hasPrimaryResult?: boolean;
    hasSecondaryResult?: boolean;
    isEvaluatingPrimary?: boolean;
    isEvaluatingSecondary?: boolean;
    primaryScore?: number | null;
    secondaryScore?: number | null;
    hasPrimaryEvaluation?: boolean;
    hasSecondaryEvaluation?: boolean;
    // 新增：评估结果和等级，用于悬浮预览
    primaryEvaluationResult?: EvaluationResponse | null;
    secondaryEvaluationResult?: EvaluationResponse | null;
    primaryScoreLevel?: ScoreLevel | null;
    secondaryScoreLevel?: ScoreLevel | null;

    /** E2E: stable selector prefix, e.g. "basic-system" */
    testIdPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
    isTestRunning: false,
    testContent: "",
    isCompareMode: true,
    enableCompareMode: true,
    enableFullscreen: true,
    inputMode: "normal",
    buttonSize: "medium",
    showPrimaryResult: true,
    resultVerticalLayout: false,
    primaryResultTitle: "",
    secondaryResultTitle: "",
    singleResultTitle: "",
    // 评估默认值
    showEvaluation: false,
    hasPrimaryResult: false,
    hasSecondaryResult: false,
    isEvaluatingPrimary: false,
    isEvaluatingSecondary: false,
    primaryScore: null,
    secondaryScore: null,
    hasPrimaryEvaluation: false,
    hasSecondaryEvaluation: false,
    primaryEvaluationResult: null,
    secondaryEvaluationResult: null,
    primaryScoreLevel: null,
    secondaryScoreLevel: null,
    testIdPrefix: undefined,
});

const emit = defineEmits<{
    "update:testContent": [value: string];
    "update:isCompareMode": [value: boolean];
    test: []; // 🆕 传递测试变量
    "compare-toggle": [];
    // 高级功能事件
    "open-variable-manager": [];
    "open-context-editor": [];
    "context-change": [
        messages: ConversationMessage[],
        variables: Record<string, string>,
    ];
    // 工具调用事件
    "tool-call": [toolCall: ToolCallResult, variantId: string];
    "tool-calls-updated": [
        toolCalls: ToolCallResult[],
        variantId: string,
    ];
    // 评估事件
    "evaluate-primary": [];
    "evaluate-secondary": [];
    "evaluate-with-feedback": [payload: { type: EvaluationType; feedback: string }];
    "show-primary-detail": [];
    "show-secondary-detail": [];
    "apply-improvement": [payload: { improvement: string; type: EvaluationType }];
    "apply-patch": [payload: { operation: PatchOperation }];
}>();

// 内部状态管理 - 去除防抖，保证输入即时响应
const testContentProxy = computed({
    get: () => props.testContent,
    set: (value: string) => {
        emit("update:testContent", value);
        recordUpdate();
    },
});

// 工具调用状态管理（按 variantId 分桶）
const variantToolCalls = reactive<Record<string, ToolCallResult[]>>({
    [COMPARE_BASELINE_VARIANT_ID]: [],
    [COMPARE_CANDIDATE_VARIANT_ID]: [],
    [SINGLE_TEST_VARIANT_ID]: [],
});

const ensureToolCallBucket = (variantId: string): ToolCallResult[] => {
    if (!variantToolCalls[variantId]) {
        variantToolCalls[variantId] = [];
    }
    return variantToolCalls[variantId];
};

// 处理工具调用的方法
const handleToolCall = (
    toolCall: ToolCallResult,
    variantId?: string,
) => {
    const resolvedVariantId =
        variantId ||
        (props.isCompareMode && props.enableCompareMode
            ? COMPARE_CANDIDATE_VARIANT_ID
            : SINGLE_TEST_VARIANT_ID);
    const bucket = ensureToolCallBucket(resolvedVariantId);
    bucket.push(toolCall);

    emit("tool-call", toolCall, resolvedVariantId);
    emit("tool-calls-updated", bucket, resolvedVariantId);
    recordUpdate();
};

// 清除工具调用数据的方法
const clearToolCalls = (variantId?: string) => {
    if (!variantId) {
        Object.keys(variantToolCalls).forEach((key) => {
            variantToolCalls[key] = [];
        });
        return;
    }
    variantToolCalls[variantId] = [];
};

// 移除结果缓存与相关节流逻辑，避免不必要的复杂度

// 关键计算属性：showTestInput 取决于优化模式
// 基础模式：仅在系统提示词优化时需要测试内容输入
const showTestInput = computed(() => {
    return props.optimizationMode === "system";
});

// 响应式布局配置
const adaptiveInputMode = computed(() => {
    if (shouldUseCompactMode.value) return "compact";
    return props.inputMode || "normal";
});

const adaptiveButtonSize = computed<"small" | "medium" | "large">(() => {
    return props.buttonSize || buttonSize.value;
});

const adaptiveResultVerticalLayout = computed(() => {
    return shouldUseVerticalLayout.value || props.resultVerticalLayout;
});

// 主要操作按钮文本
const primaryActionText = computed(() => {
    if (props.isTestRunning) {
        return t("test.testing");
    }
    return props.isCompareMode && props.enableCompareMode
        ? t("test.startCompare")
        : t("test.startTest");
});

// 主要操作按钮禁用状态
const primaryActionDisabled = computed(() => {
    if (props.isTestRunning) return true;

    // 系统提示词模式需要测试内容
    if (props.optimizationMode === "system" && !props.testContent.trim()) {
        return true;
    }

    return false;
});

// 事件处理 - 立即切换对比模式，避免点击延迟
const handleCompareToggle = () => {
    const newValue = !props.isCompareMode;
    emit("update:isCompareMode", newValue);
    emit("compare-toggle");
    recordUpdate();
};

const handleTest = throttle(
    () => {
        emit("test");
        recordUpdate();
    },
    200,
    "handleTest",
);

// ========== 评估事件处理 ==========
const handleEvaluatePrimary = () => {
    emit("evaluate-primary");
};

const handleEvaluateSecondary = () => {
    emit("evaluate-secondary");
};

const handleEvaluateWithFeedback = (payload: { type: EvaluationType; feedback: string }) => {
    emit("evaluate-with-feedback", payload);
};

const handleShowPrimaryDetail = () => {
    emit("show-primary-detail");
};

const handleShowSecondaryDetail = () => {
    emit("show-secondary-detail");
};

// 应用改进建议处理
const handleApplyImprovement = (payload: { improvement: string; type: EvaluationType }) => {
    emit("apply-improvement", payload);
};

// 应用补丁处理
const handleApplyPatch = (payload: { operation: PatchOperation }) => {
    emit("apply-patch", payload);
};

// ========== 变量管理 ==========

// 🆕 添加变量对话框状态






// 开发环境下的性能调试
if (import.meta.env.DEV) {
    const logPerformance = debounce(
        () => {
            const report = getPerformanceReport();
            if (report.grade.grade === "F") {
                console.warn('TestAreaPanel performance is poor:', report);
            }
        },
        5000,
        false,
        "performanceLog",
    );

    // 定期检查性能
    const timer = setInterval(logPerformance, 10000);
    onUnmounted(() => clearInterval(timer));
}

// 暴露方法供父组件调用
defineExpose({
    handleToolCall,
    clearToolCalls,
    // 获取当前工具调用状态
    getToolCalls: () => ({ ...variantToolCalls }),

});
</script>

<style scoped>
.result-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.result-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
}

.tool-calls-section {
    flex: 0 0 auto;
}

/* 当存在工具调用列表时，隐藏结果区中的空内容占位 */
/* 依赖同级容器存在 .tool-call-display 时，隐藏 Naive UI 的 NEmpty */
.result-container:has(.tool-call-display) :deep(.n-empty) {
    display: none;
}
</style>
