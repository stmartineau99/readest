/**
 * Imports the bundled MoeDict StarDict (public/dictionaries/, copied in by
 * scripts/copy-dictionaries.mjs) through the same path as the Settings import
 * button, once per BUNDLED_DICTIONARY_VERSION. A newer version replaces the
 * previous copy in place (same order and enabled state). A copy the user
 * deleted stays deleted: importDictionaries would otherwise revive its
 * tombstone, so the version is recorded without importing.
 */
import { EnvConfigType } from '@/services/environment';
import { useSettingsStore } from '@/store/settingsStore';
import { useCustomDictionaryStore } from '@/store/customDictionaryStore';
import { evictProvider } from './registry';

/** Bump whenever tools/moedict_stardict is rebuilt. */
export const BUNDLED_DICTIONARY_VERSION = 2;
/** Every name the bundled MoeDict has had (the rebuilt .ifo gets a new contentId, so match by name). */
const BUNDLED_NAMES = ['重編國語辭典修訂本', '重編國語辭典修訂本（中英）'];
const BUNDLED_FILES = ['moedict_zh_en.ifo', 'moedict_zh_en.idx', 'moedict_zh_en.dict.dz'];

let importPromise: Promise<void> | null = null;

const fetchBundledFiles = async (): Promise<File[] | null> => {
  const responses = await Promise.all(BUNDLED_FILES.map((name) => fetch(`/dictionaries/${name}`)));
  if (responses.some((response) => !response.ok)) return null;
  const blobs = await Promise.all(responses.map((response) => response.blob()));
  return blobs.map((blob, i) => new File([blob], BUNDLED_FILES[i]!));
};

const recordVersion = async (envConfig: EnvConfigType): Promise<void> => {
  // saveCustomDictionaries writes the whole settings object, version included.
  const { settings, setSettings } = useSettingsStore.getState();
  const { bundledDictionaryImported: _legacy, ...rest } = settings;
  setSettings({ ...rest, bundledDictionaryVersion: BUNDLED_DICTIONARY_VERSION });
  await useCustomDictionaryStore.getState().saveCustomDictionaries(envConfig, {
    publishOrderChange: true,
  });
};

const importBundledDictionary = async (envConfig: EnvConfigType): Promise<void> => {
  const settings = useSettingsStore.getState().settings;
  const installed =
    settings?.bundledDictionaryVersion ?? (settings?.bundledDictionaryImported ? 1 : 0);
  if (installed >= BUNDLED_DICTIONARY_VERSION) return;

  const store = useCustomDictionaryStore.getState();
  const previous = store.dictionaries.filter(
    (dict) => BUNDLED_NAMES.includes(dict.name) && !dict.deletedAt,
  );
  if (installed > 0 && previous.length === 0) {
    await recordVersion(envConfig);
    return;
  }

  const files = await fetchBundledFiles();
  if (!files) return;

  const appService = await envConfig.getAppService();
  const result = await appService.importDictionaries(
    files.map((file) => ({ file })),
    store.dictionaries,
  );
  for (const dict of result.imported) {
    if (previous.length > 0) {
      for (const old of previous) {
        await appService.deleteDictionary(old).catch((err) => {
          console.warn('Failed to delete the previous bundled dictionary:', err);
        });
        evictProvider(old.id);
      }
      store.replaceDictionaries(
        previous.map((old) => old.id),
        dict,
      );
    } else {
      store.addDictionary(dict);
    }
    if (dict.contentId) store.markAvailableByContentId(dict.contentId);
  }
  for (const { oldIds, newDict } of result.replacements) {
    store.replaceDictionaries(oldIds, newDict);
    if (newDict.contentId) store.markAvailableByContentId(newDict.contentId);
    for (const oldId of oldIds) evictProvider(oldId);
  }

  await recordVersion(envConfig);
};

export const ensureBundledDictionary = (envConfig: EnvConfigType): Promise<void> => {
  if (!importPromise) {
    importPromise = importBundledDictionary(envConfig).finally(() => {
      importPromise = null;
    });
  }
  return importPromise;
};
