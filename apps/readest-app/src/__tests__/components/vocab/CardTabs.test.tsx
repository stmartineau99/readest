import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { CardTabRow, SentencesPanel, useCardTab } from '@/components/vocab/CardTabs';
import { getExampleSentences } from '@/services/examples/sentences';

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));
const env = vi.hoisted(() => ({ appService: {} }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => env }));
vi.mock('@/services/examples/sentences', () => ({ getExampleSentences: vi.fn() }));

const tab = (name: string) => screen.getByRole('tab', { name });

beforeEach(() => {
  useCardTab.setState({ tab: 'dict' });
  vi.mocked(getExampleSentences).mockResolvedValue([
    { zh: '他詳細地解釋了。', en: 'He explained in detail.', mainland: [] },
  ]);
});
afterEach(() => {
  cleanup();
  vi.mocked(getExampleSentences).mockReset();
});

describe('CardTabRow', () => {
  it('shows Dictionary and Sentences, with Dictionary selected', () => {
    render(<CardTabRow />);

    const row = screen.getByRole('tablist');
    expect(row.className).toContain('md-tab-row');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Dictionary',
      'Sentences',
    ]);
    expect(tab('Dictionary').getAttribute('aria-selected')).toBe('true');
    expect(tab('Dictionary').className).toContain('md-tab-selected');
    expect(tab('Sentences').getAttribute('aria-selected')).toBe('false');
    expect(tab('Sentences').className).not.toContain('md-tab-selected');
  });

  it('moves the selection to the tapped tab and back', () => {
    render(<CardTabRow />);

    fireEvent.click(tab('Sentences'));
    expect(tab('Sentences').getAttribute('aria-selected')).toBe('true');
    expect(tab('Sentences').className).toContain('md-tab-selected');
    expect(tab('Dictionary').getAttribute('aria-selected')).toBe('false');

    fireEvent.click(tab('Dictionary'));
    expect(useCardTab.getState().tab).toBe('dict');
  });
});

describe('SentencesPanel', () => {
  it('renders nothing on the Dictionary tab', () => {
    const { container } = render(<SentencesPanel word='詳細' fontScale={1} />);
    expect(container.innerHTML).toBe('');
    expect(getExampleSentences).not.toHaveBeenCalled();
  });

  it('shows the sentences in a scrolling panel when Sentences is tapped in the row', async () => {
    // The row is in the card header and the panel in the body: two separate trees.
    render(<CardTabRow />);
    render(<SentencesPanel word='詳細' fontScale={1} />);

    fireEvent.click(tab('Sentences'));
    const panel = screen.getByRole('tabpanel');
    expect(panel.className).toContain('md-sents-panel');
    expect(panel.className).toContain('overflow-y-auto');
    // Long press selects a sentence, though the reader page is select-none.
    expect(panel.className).toContain('select-text');
    expect((await screen.findByRole('listitem')).textContent).toContain('He explained in detail.');
    expect(getExampleSentences).toHaveBeenCalledWith(env.appService, '詳細');
  });

  it('opens a new word on Dictionary', () => {
    const { rerender } = render(<SentencesPanel word='詳細' fontScale={1} />);
    act(() => useCardTab.getState().setTab('sents'));
    expect(screen.getByRole('tabpanel')).toBeTruthy();

    rerender(<SentencesPanel word='仔細' fontScale={1} />);
    expect(useCardTab.getState().tab).toBe('dict');
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });

  it('starts on Dictionary even when the last card was left on Sentences', () => {
    useCardTab.setState({ tab: 'sents' });
    render(<SentencesPanel word='詳細' fontScale={1} />);
    expect(useCardTab.getState().tab).toBe('dict');
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });
});
