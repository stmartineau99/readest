/**
 * The view settings minimal mode writes when it is switched on. Kept apart
 * from minimalMode.ts so settingsService can import it without the stores.
 */
import type { SystemSettings } from '@/types/settings';
import type { ViewSettings } from '@/types/book';

export type PresetKey =
  | 'marginTopPx'
  | 'marginBottomPx'
  | 'marginLeftPx'
  | 'marginRightPx'
  | 'compactMarginTopPx'
  | 'compactMarginBottomPx'
  | 'compactMarginLeftPx'
  | 'compactMarginRightPx'
  | 'defaultCJKFont'
  | 'annotationQuickAction';

export type ViewPreset = Pick<ViewSettings, PresetKey>;

export const MINIMAL_VIEW_PRESET: ViewPreset = {
  marginTopPx: 80,
  marginBottomPx: 80,
  marginLeftPx: 32,
  marginRightPx: 32,
  compactMarginTopPx: 80,
  compactMarginBottomPx: 80,
  compactMarginLeftPx: 32,
  compactMarginRightPx: 32,
  defaultCJKFont: 'PingFang TC',
  annotationQuickAction: 'dictionary',
};

/**
 * First load only: a settings file without minimalPresetApplied gets the
 * preset if minimal mode is on (new installs, since it is on by default).
 * Returns true when the settings changed and need saving.
 */
export const migrateMinimalPreset = (settings: SystemSettings): boolean => {
  if (settings.minimalPresetApplied) return false;
  settings.minimalPresetApplied = true;
  if (settings.minimalMode) {
    settings.globalViewSettings = { ...settings.globalViewSettings, ...MINIMAL_VIEW_PRESET };
  }
  return true;
};
