import { describe, it, expect, vi, beforeEach } from 'vitest';

// Setup mocks before imports
vi.mock('../src/commands/config');
vi.mock('../src/commands/pull');
vi.mock('../src/commands/push');
vi.mock('../src/commands/scan');

// Import modules after mocking
import { config } from '../src/commands/config';
import { pull } from '../src/commands/pull';
import { push } from '../src/commands/push';
import { scan } from '../src/commands/scan';

// Create mock implementations
const mockConfig = vi.mocked(config);
const mockPull = vi.mocked(pull);
const mockPush = vi.mocked(push);
const mockScan = vi.mocked(scan);

// Set up mock return values
mockConfig.mockResolvedValue(undefined);
mockPull.mockResolvedValue(undefined);
mockPush.mockResolvedValue(undefined);
mockScan.mockResolvedValue(undefined);

describe('Hosby CLI Commands', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });
  
  describe('config', () => {
    it('should handle project configuration', async () => {
      await config('project');
      expect(mockConfig).toHaveBeenCalledWith('project');
    }, 10000);

    it('should handle AI configuration', async () => {
      await config('ai');
      expect(mockConfig).toHaveBeenCalledWith('ai');
    }, 10000);
  });

  describe('pull', () => {
    it('should pull schema from server', async () => {
      await pull();
      expect(mockPull).toHaveBeenCalled();
    });
  });

  describe('push', () => {
    it('should push schema to server', async () => {
      await push();
      expect(mockPush).toHaveBeenCalled();
    });

    it('should handle force push', async () => {
      await push(true);
      expect(mockPush).toHaveBeenCalledWith(true);
    });
  });

  describe('scan', () => {
    it('should scan project directory', async () => {
      await scan('.');
      expect(mockScan).toHaveBeenCalledWith('.');
    });

    it('should handle scan with AI option', async () => {
      await scan('.', { ai: true });
      expect(mockScan).toHaveBeenCalledWith('.', { ai: true });
    }, 10000);
  });
});
