/**
 * Imports the bundled MoeDict StarDict (public/dictionaries/, copied in by
 * scripts/copy-dictionaries.mjs) once, through the same path as the Settings
 * import button. `bundledDictionaryImported` keeps a dictionary the user
 * deleted from coming back: importDictionaries would revive its tombstone.
 */
import { EnvConfigType } from '@/services/environment';
import { useSettingsStore } from '@/store/settingsStore';
import { useCustomDictionaryStore } from '@/store/customDictionaryStore';
import { evictProvider } from './registry';

const BUNDLED_FILES = ['moedict_zh_en.ifo', 'moedict_zh_en.idx', 'moedict_zh_en.dict.dz'];

let importPromise: Promise<void> | null = null;

const fetchBundledFiles = async (): Promise<File[] | null> => {
  const responses = await Promise.all(BUNDLED_FILES.map((name) => fetch(`/dictionaries/${name}`)));
  if (responses.some((response) => !response.ok)) return null;
  const blobs = await Promise.all(responses.map((response) => response.blob()));
  return blobs.map((blob, i) => new File([blob], BUNDLED_FILES[i]!));
};

const importBundledDictionary = async (envConfig: EnvConfigType): Promise<void> => {
  if (useSettingsStore.getState().settings?.bundledDictionaryImported) return;
  const files = await fetchBundledFiles();
  if (!files) return;

  const appService = await envConfig.getAppService();
  const store = useCustomDictionaryStore.getState();
  const result = await appService.importDictionaries(
    files.map((file) => ({ file })),
    store.dictionaries,
  );
  for (const dict of result.imported) {
    store.addDictionary(dict);
    if (dict.contentId) store.markAvailableByContentId(dict.contentId);
  }
  for (const { oldIds, newDict } of result.replacements) {
    store.replaceDictionaries(oldIds, newDict);
    if (newDict.contentId) store.markAvailableByContentId(newDict.contentId);
    for (const oldId of oldIds) evictProvider(oldId);
  }

  // saveCustomDictionaries writes the whole settings object, flag included.
  const { settings, setSettings } = useSettingsStore.getState();
  setSettings({ ...settings, bundledDictionaryImported: true });
  await store.saveCustomDictionaries(envConfig, { publishOrderChange: true });
};

export const ensureBundledDictionary = (envConfig: EnvConfigType): Promise<void> => {
  if (!importPromise) {
    importPromise = importBundledDictionary(envConfig).finally(() => {
      importPromise = null;
    });
  }
  return importPromise;
};
