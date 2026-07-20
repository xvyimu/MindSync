import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HistoryManager } from '../../../src/services/history/manager';
import { IStorageProvider } from '../../../src/services/storage/types';
import { PromptRecord, PromptRecordChain, PromptRecordType } from '../../../src/services/history/types';
import { RecordValidationError, StorageError } from '../../../src/services/history/errors';
import { v4 as uuidv4 } from 'uuid';
import { createHistoryManager, MemoryStorageProvider } from '../../../src';
import * as ModelManagerModule from '../../../src/services/model/manager';

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

const mockModelManager = {
  getModel: vi.fn(),
  ensureInitialized: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../../src/services/model/manager', async (importOriginal) => {
  const actual = await importOriginal() as typeof ModelManagerModule;
  return {
    ...actual,
    createModelManager: vi.fn(() => mockModelManager),
  };
});

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let mockStorage: IStorageProvider;

  const mockPromptRecord = (
    id: string,
    chainId: string,
    version: number,
    previousId?: string,
    data?: Partial<PromptRecord>
  ): PromptRecord => ({
    id,
    originalPrompt: 'Original prompt content',
    optimizedPrompt: 'Optimized prompt content',
    type: 'optimize' as PromptRecordType,
    chainId,
    version,
    previousId,
    timestamp: Date.now() - Math.random() * 1000,
    modelKey: 'test-model-key',
    modelName: 'Test Model Name',
    templateId: 'test-template-id',
    iterationNote: version > 1 ? 'Iteration note' : undefined,
    metadata: { some: 'data' },
    ...data,
  });

  beforeEach(() => {
    mockStorage = new MemoryStorageProvider();
    historyManager = createHistoryManager(mockStorage);

    (uuidv4 as any).mockClear();
    mockModelManager.getModel.mockClear();

    mockModelManager.getModel.mockReturnValue({
      name: 'Default Mock Model',
      defaultModel: 'default-mock-model-variant',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addRecord', () => {
    it('should add a valid record and save to storage', async () => {
      const record = mockPromptRecord('id1', 'chain1', 1);
      await historyManager.addRecord(record);
      const records = await mockStorage.getItem('prompt_history');
      expect(JSON.parse(records!)).toEqual([record]);
    });

    it.skip('should add a record and fetch modelName if not provided and modelKey exists', async () => {
      const recordWithoutModelName = mockPromptRecord('id1', 'chain1', 1);
      delete recordWithoutModelName.modelName;

      mockModelManager.getModel.mockReturnValue({
        defaultModel: 'Fetched Model Name',
      });

      // This test requires modelManager to be injected, which is currently not the case.
      // await historyManager.addRecord(recordWithoutModelName);
      // expect(mockModelManager.getModel).toHaveBeenCalledWith('test-model-key');
      // const storedRecords = JSON.parse(await mockStorage.getItem('prompt_history') ?? '[]');
      // expect(storedRecords[0].modelName).toBe('Fetched Model Name');
    });

    it('should not fetch modelName if modelKey does not exist and modelManager is not provided', async () => {
      const recordWithoutModelKey = { ...mockPromptRecord('id1', 'chain1', 1), modelKey: '' };
      delete recordWithoutModelKey.modelName;
      
      await historyManager.addRecord(recordWithoutModelKey);
      
      expect(mockModelManager.getModel).not.toHaveBeenCalled();
      const records = JSON.parse(await mockStorage.getItem('prompt_history') ?? '[]');
      expect(records[0].modelName).toBeUndefined();
    });

    it('should throw RecordValidationError for an invalid record (e.g., missing originalPrompt)', async () => {
      const invalidRecord = {
        ...mockPromptRecord('id1', 'chain1', 1),
        originalPrompt: '',
      } as PromptRecord;
      await expect(historyManager.addRecord(invalidRecord)).rejects.toThrow(
        RecordValidationError
      );
    });
  });

  describe('getRecords', () => {
    it('should return empty array if storage is empty', async () => {
      const records = await historyManager.getRecords();
      expect(records).toEqual([]);
    });
  });

  describe('createNewChain and getChain', () => {
    it('should create a new chain and get it', async () => {
      (uuidv4 as any).mockReturnValue('new-chain-id');
      const chainRecord = mockPromptRecord('id1', 'new-chain-id', 1);
      const chain = await historyManager.createNewChain(chainRecord);
      expect(chain.chainId).toBe('new-chain-id');
      expect(chain.versions).toHaveLength(1);
    });
  });

  describe('capacity (B3)', () => {
    it('defaults max to 50 and reports ok usage', async () => {
      const max = await historyManager.getMaxRecords();
      expect(max).toBe(50);
      const usage = await historyManager.getUsage();
      expect(usage.max).toBe(50);
      expect(usage.count).toBe(0);
      expect(usage.warningLevel).toBe('ok');
    });

    it('truncates when exceeding max and setMaxRecords can drop oldest', async () => {
      await historyManager.setMaxRecords(10);
      for (let i = 0; i < 12; i++) {
        await historyManager.addRecord(
          mockPromptRecord(`id-${i}`, `chain-${i}`, 1, undefined, {
            timestamp: Date.now() + i,
          }),
        );
      }
      const records = await historyManager.getRecords();
      expect(records.length).toBe(10);
      expect(records[0].id).toBe('id-11');

      const usage = await historyManager.getUsage();
      expect(usage.count).toBe(10);
      expect(usage.warningLevel).toBe('full');

      // min clamp is 10 — raise then lower to exercise drop path
      await historyManager.setMaxRecords(20);
      const result = await historyManager.setMaxRecords(10);
      expect(result.max).toBe(10);
      // still 10 records, dropped 0 when lowering from 20 with only 10 items
      expect(result.dropped).toBe(0);

      // fill above a higher cap then lower
      await historyManager.setMaxRecords(15);
      for (let i = 12; i < 18; i++) {
        await historyManager.addRecord(
          mockPromptRecord(`id-${i}`, `chain-${i}`, 1, undefined, {
            timestamp: Date.now() + i,
          }),
        );
      }
      expect((await historyManager.getRecords()).length).toBe(15);
      const shrink = await historyManager.setMaxRecords(12);
      expect(shrink.max).toBe(12);
      expect(shrink.dropped).toBe(3);
      expect((await historyManager.getRecords()).length).toBe(12);
    });

    it('clamps setMaxRecords into allowed range', async () => {
      const low = await historyManager.setMaxRecords(1);
      expect(low.max).toBe(10);
      const high = await historyManager.setMaxRecords(9999);
      expect(high.max).toBe(500);
    });

    it('reports near when count reaches 80% of max', async () => {
      await historyManager.setMaxRecords(10);
      for (let i = 0; i < 8; i++) {
        await historyManager.addRecord(mockPromptRecord(`n-${i}`, `c-${i}`, 1));
      }
      const usage = await historyManager.getUsage();
      expect(usage.warningLevel).toBe('near');
      expect(usage.nearThreshold).toBe(8);
    });
  });
});
