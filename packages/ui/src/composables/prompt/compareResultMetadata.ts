import type {
  CompareConflictSignal,
  CompareStopSignals,
  EvaluationResponse,
  StructuredCompareRole,
} from '@mindsync/core'

export type CompareJudgementVerdict =
  | 'left-better'
  | 'right-better'
  | 'mixed'
  | 'similar'

export type CompareJudgementConfidence = 'low' | 'medium' | 'high'

export type CompareJudgementRecord = {
  pairKey: string
  pairType: string
  pairLabel: string
  leftSnapshotId: string
  leftSnapshotLabel: string
  leftRole?: StructuredCompareRole
  rightSnapshotId: string
  rightSnapshotLabel: string
  rightRole?: StructuredCompareRole
  verdict: CompareJudgementVerdict
  winner: 'left' | 'right' | 'none'
  confidence: CompareJudgementConfidence
  pairSignal: string
  analysis: string
  evidence: string[]
  learnableSignals: string[]
  overfitWarnings: string[]
}

export type CompareInsightRecord = {
  pairHighlights: Array<{
    pairKey: string
    pairType: string
    pairLabel: string
    pairSignal: string
    verdict: CompareJudgementVerdict
    confidence: CompareJudgementConfidence
    analysis: string
  }>
  progressSummary?: {
    pairKey: string
    pairType: string
    pairLabel: string
    pairSignal: string
    verdict: CompareJudgementVerdict
    confidence: CompareJudgementConfidence
    analysis: string
  }
  referenceGapSummary?: {
    pairKey: string
    pairType: string
    pairLabel: string
    pairSignal: string
    verdict: CompareJudgementVerdict
    confidence: CompareJudgementConfidence
    analysis: string
  }
  promptChangeSummary?: {
    pairKey: string
    pairType: string
    pairLabel: string
    pairSignal: string
    verdict: CompareJudgementVerdict
    confidence: CompareJudgementConfidence
    analysis: string
  }
  stabilitySummary?: {
    pairKey: string
    pairType: string
    pairLabel: string
    pairSignal: string
    verdict: CompareJudgementVerdict
    confidence: CompareJudgementConfidence
    analysis: string
  }
  evidenceHighlights?: string[]
  learnableSignals?: string[]
  overfitWarnings?: string[]
  conflictSignals?: CompareConflictSignal[]
}

export type CompareEvaluationMetadata = NonNullable<EvaluationResponse['metadata']> & {
  compareJudgements?: CompareJudgementRecord[]
  compareInsights?: CompareInsightRecord
}

export const getCompareEvaluationMetadata = (
  result: EvaluationResponse | null | undefined,
): CompareEvaluationMetadata | null => {
  const metadata = result?.metadata
  return metadata ? (metadata as CompareEvaluationMetadata) : null
}

export const getCompareMode = (
  result: EvaluationResponse | null | undefined,
): 'generic' | 'structured' | null =>
  getCompareEvaluationMetadata(result)?.compareMode ?? null

export const getCompareStopSignals = (
  result: EvaluationResponse | null | undefined,
): CompareStopSignals | null =>
  getCompareEvaluationMetadata(result)?.compareStopSignals ?? null

export const getCompareSnapshotRoles = (
  result: EvaluationResponse | null | undefined,
): Record<string, StructuredCompareRole> | null =>
  getCompareEvaluationMetadata(result)?.snapshotRoles ?? null

export const getCompareJudgements = (
  result: EvaluationResponse | null | undefined,
): CompareJudgementRecord[] =>
  getCompareEvaluationMetadata(result)?.compareJudgements ?? []

export const getCompareInsights = (
  result: EvaluationResponse | null | undefined,
): CompareInsightRecord | undefined =>
  getCompareEvaluationMetadata(result)?.compareInsights
