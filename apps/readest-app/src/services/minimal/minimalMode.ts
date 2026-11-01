/**
 * Minimal mode: one switch for the fork's reading setup. Menu items, shortcuts,
 * margins and the selection toolbar check isMinimalMode() live; margins, CJK
 * font and the long-press action are a preset written once when it is toggled.
 */
import { useSettingsStore } from '@/store/settingsStore';
import { saveViewSettings } from '@/helpers/settings';
import {
  DEFAULT_ANNOTATOR_CONFIG,
  DEFAULT_BOOK_FONT,
  DEFAULT_BOOK_LAYOUT,
} from '@/services/constants';
import type { EnvConfigType } from '@/services/environment';
import type { ViewSettings } from '@/types/book';

type PresetKey =
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

type ViewPreset = Pick<ViewSettings, PresetKey>;

export const MINIMAL_VIEW_PRESET: ViewPreset = {
  marginTopPx: 60,
  marginBottomPx: 60,
  marginLeftPx: 32,
  marginRightPx: 32,
  compactMarginTopPx: 60,
  compactMarginBottomPx: 60,
  compactMarginLeftPx: 32,
  compactMarginRightPx: 32,
  defaultCJKFont: 'PingFang TC',
  annotationQuickAction: 'dictionary',
};

const UPSTREAM_VIEW_PRESET: ViewPreset = {
  marginTopPx: DEFAULT_BOOK_LAYOUT.marginTopPx,
  marginBottomPx: DEFAULT_BOOK_LAYOUT.marginBottomPx,
  marginLeftPx: DEFAULT_BOOK_LAYOUT.marginLeftPx,
  marginRightPx: DEFAULT_BOOK_LAYOUT.marginRightPx,
  compactMarginTopPx: DEFAULT_BOOK_LAYOUT.compactMarginTopPx,
  compactMarginBottomPx: DEFAULT_BOOK_LAYOUT.compactMarginBottomPx,
  compactMarginLeftPx: DEFAULT_BOOK_LAYOUT.compactMarginLeftPx,
  compactMarginRightPx: DEFAULT_BOOK_LAYOUT.compactMarginRightPx,
  defaultCJKFont: DEFAULT_BOOK_FONT.defaultCJKFont,
  annotationQuickAction: DEFAULT_ANNOTATOR_CONFIG.annotationQuickAction,
};

// Optional chaining: upstream tests mock useSettingsStore without getState.
export const isMinimalMode = () => useSettingsStore.getState?.()?.settings?.minimalMode ?? false;

export const applyMinimalPreset = async (envConfig: EnvConfigType, minimal: boolean) => {
  const preset = minimal ? MINIMAL_VIEW_PRESET : UPSTREAM_VIEW_PRESET;
  for (const key of Object.keys(preset) as PresetKey[]) {
    await saveViewSettings(envConfig, '', key, preset[key]);
  }
};
