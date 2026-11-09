// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/services/sync/replicaPublish', () => ({
  publishReplicaDelete: vi.fn(),
  publishReplicaUpsert: vi.fn(),
}));
vi.mock('@/services/dictionaries/registry', () => ({ evictProvider: vi.fn() }));

import {
  BUNDLED_DICTIONARY_VERSION,
  ensureBundledDictionary,
} from '@/services/dictionaries/bundledDictionary';
import { evictProvider } from '@/services/dictionaries/registry';
import { useCustomDictionaryStore } from '@/store/customDictionaryStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { EnvConfigType } from '@/services/environment';
import type { ImportedDictionary } from '@/services/dictionaries/types';
import type { SystemSettings } from '@/types/settings';

const dict = (id: string, name: string, patch: Partial<ImportedDictionary> = {}) =>
  ({
    id,
    kind: 'stardict',
    name,
    contentId: `content-${id}`,
    bundleDir: id,
    files: {},
    addedAt: 1,
    ...patch,
  }) as ImportedDictionary;

const OLD = dict('old-moedict', '重編國語辭典修訂本（中英）');
const NEW = dict('new-moedict', '重編國語辭典修訂本');
const OTHER = dict('other', 'Some Other Dictionary');

const importDictionaries = vi.fn();
const deleteDictionary = vi.fn();
const envConfig = {
  getAppService: async () => ({ importDictionaries, deleteDictionary }),
} as unknown as EnvConfigType;
const saveCustomDictionaries = vi.fn();
const fetchMock = vi.fn();

const setup = (settings: Partial<SystemSettings>, dictionaries: ImportedDictionary[]) => {
  useSettingsStore.setState({ settings: settings as SystemSettings });
  useCustomDictionaryStore.setState({
    dictionaries,
    settings: {
      providerOrder: dictionaries.map((d) => d.id),
      providerEnabled: Object.fromEntries(dictionaries.map((d) => [d.id, d.id !== OTHER.id])),
      webSearches: [],
    },
    saveCustomDictionaries,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  importDictionaries.mockResolvedValue({ imported: [NEW], replacements: [] });
  deleteDictionary.mockResolvedValue(undefined);
  saveCustomDictionaries.mockResolvedValue(undefined);
  fetchMock.mockImplementation(async () => new Response(new Blob(['x'])));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureBundledDictionary', () => {
  it('imports MoeDict on a fresh install and records the version', async () => {
    setup({}, [OTHER]);
    await ensureBundledDictionary(envConfig);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useCustomDictionaryStore.getState().dictionaries.map((d) => d.id)).toEqual([
      'other',
      'new-moedict',
    ]);
    expect(useSettingsStore.getState().settings.bundledDictionaryVersion).toBe(
      BUNDLED_DICTIONARY_VERSION,
    );
    expect(saveCustomDictionaries).toHaveBeenCalledTimes(1);
  });

  it('replaces the version 1 copy in place: same slot, enabled, old files deleted', async () => {
    setup({ bundledDictionaryImported: true }, [OLD, OTHER]);
    await ensureBundledDictionary(envConfig);

    const store = useCustomDictionaryStore.getState();
    expect(store.dictionaries.map((d) => d.id).sort()).toEqual(['new-moedict', 'other']);
    expect(store.settings.providerOrder).toEqual(['new-moedict', 'other']);
    expect(store.settings.providerEnabled['new-moedict']).toBe(true);
    expect(deleteDictionary).toHaveBeenCalledWith(OLD);
    expect(evictProvider).toHaveBeenCalledWith('old-moedict');

    const settings = useSettingsStore.getState().settings;
    expect(settings.bundledDictionaryVersion).toBe(BUNDLED_DICTIONARY_VERSION);
    expect(settings.bundledDictionaryImported).toBeUndefined();
  });

  it('keeps a disabled MoeDict disabled after the upgrade', async () => {
    setup({ bundledDictionaryImported: true }, [OLD]);
    useCustomDictionaryStore.setState((state) => ({
      settings: { ...state.settings, providerEnabled: { [OLD.id]: false } },
    }));
    await ensureBundledDictionary(envConfig);

    expect(useCustomDictionaryStore.getState().settings.providerEnabled['new-moedict']).toBe(false);
  });

  it('does not bring back a MoeDict the user deleted', async () => {
    setup({ bundledDictionaryImported: true }, [{ ...OLD, deletedAt: 5 }, OTHER]);
    await ensureBundledDictionary(envConfig);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(importDictionaries).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().settings.bundledDictionaryVersion).toBe(
      BUNDLED_DICTIONARY_VERSION,
    );
  });

  it('does not bring it back when the deleted entry is already gone from the list', async () => {
    setup({ bundledDictionaryImported: true }, [OTHER]);
    await ensureBundledDictionary(envConfig);

    expect(importDictionaries).not.toHaveBeenCalled();
  });

  it('does nothing once the current version is installed', async () => {
    setup({ bundledDictionaryVersion: BUNDLED_DICTIONARY_VERSION }, [NEW]);
    await ensureBundledDictionary(envConfig);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveCustomDictionaries).not.toHaveBeenCalled();
  });

  it('leaves everything as it was when the bundled files are missing', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 404 }));
    setup({ bundledDictionaryImported: true }, [OLD]);
    await ensureBundledDictionary(envConfig);

    expect(importDictionaries).not.toHaveBeenCalled();
    expect(useCustomDictionaryStore.getState().dictionaries).toEqual([OLD]);
    expect(useSettingsStore.getState().settings.bundledDictionaryVersion).toBeUndefined();
  });
});
