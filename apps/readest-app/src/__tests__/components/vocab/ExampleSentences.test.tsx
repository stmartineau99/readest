import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ExampleSentences, { splitSentence } from '@/components/vocab/ExampleSentences';
import { getExampleSentences, type ExampleSentence } from '@/services/examples/sentences';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string, o?: Record<string, unknown>) =>
    s.replace(/{{(\w+)}}/g, (_m, k: string) => String(o?.[k])),
}));
// One object for every render: a new appService each time would rerun the
// component's load effect on every render, without end.
const env = vi.hoisted(() => ({ appService: {} }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => env }));
vi.mock('@/services/examples/sentences', () => ({ getExampleSentences: vi.fn() }));

const mockSentences = (list: ExampleSentence[]) =>
  vi.mocked(getExampleSentences).mockResolvedValue(list);

const sentence = (zh: string, mainland: ExampleSentence['mainland'] = []): ExampleSentence => ({
  zh,
  en: `en ${zh}`,
  mainland,
});

afterEach(() => {
  cleanup();
  vi.mocked(getExampleSentences).mockReset();
});

describe('splitSentence', () => {
  it('sets the looked-up word apart', () => {
    expect(splitSentence('這輛車保養起來很貴。', '保養', [])).toEqual([
      { text: '這輛車', word: false, mainland: false, taiwan: undefined },
      { text: '保養', word: true, mainland: false, taiwan: undefined },
      { text: '起來很貴。', word: false, mainland: false, taiwan: undefined },
    ]);
  });

  it('marks a mainland word and puts the Taiwan word after its last piece', () => {
    const pieces = splitSentence('自行車要保養', '保養', [{ start: 0, end: 3, taiwan: '腳踏車' }]);
    expect(pieces[0]).toEqual({ text: '自行車', word: false, mainland: true, taiwan: '腳踏車' });
    expect(pieces[2]).toMatchObject({ text: '保養', word: true, mainland: false });
  });

  it('handles a looked-up word that is itself a mainland word', () => {
    const pieces = splitSentence('他的自行車', '自行車', [{ start: 2, end: 5, taiwan: '腳踏車' }]);
    expect(pieces[1]).toEqual({ text: '自行車', word: true, mainland: true, taiwan: '腳踏車' });
  });
});

describe('ExampleSentences', () => {
  it('shows every sentence, with no More button', async () => {
    mockSentences(Array.from({ length: 20 }, (_v, n) => sentence(`保養${n}`)));
    render(<ExampleSentences word='保養' fontScale={1} />);

    expect(await screen.findAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows one line when the word has no sentences', async () => {
    mockSentences([]);
    render(<ExampleSentences word='全程' fontScale={1} />);

    expect((await screen.findByText('No example sentences')).className).toContain('md-ex-empty');
    expect(screen.queryByTestId('dict-examples')).toBeNull();
  });

  it('shows nothing while loading, so the empty line does not flash', async () => {
    vi.mocked(getExampleSentences).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ExampleSentences word='保養' fontScale={1} />);

    await vi.waitFor(() => expect(getExampleSentences).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });

  it('loads the sentences again for a new word', async () => {
    vi.mocked(getExampleSentences).mockImplementation(async (_s, word) => [sentence(`${word}了`)]);
    const { rerender } = render(<ExampleSentences word='保養' fontScale={1} />);
    expect((await screen.findByRole('listitem')).textContent).toContain('保養了');

    rerender(<ExampleSentences word='詳細' fontScale={1} />);
    await vi.waitFor(() => expect(screen.getByRole('listitem').textContent).toContain('詳細了'));
    expect(getExampleSentences).toHaveBeenLastCalledWith(env.appService, '詳細');
  });

  it('sets the card font scale on the list', async () => {
    mockSentences([sentence('保養一')]);
    render(<ExampleSentences word='保養' fontScale={1.25} />);

    const list = await screen.findByTestId('dict-examples');
    expect(list.style.getPropertyValue('--dict-font-scale')).toBe('1.25');
  });

  it('underlines a mainland word and shows the Taiwan word after it, with the English below', async () => {
    mockSentences([sentence('自行車要保養', [{ start: 0, end: 3, taiwan: '腳踏車' }])]);
    render(<ExampleSentences word='保養' fontScale={1} />);

    const item = await screen.findByRole('listitem');
    expect(item.querySelector('.md-ex-mainland')!.textContent).toBe('自行車');
    expect(item.querySelector('.md-ex-taiwan')!.textContent).toBe('（台：腳踏車）');
    expect(item.querySelector('.md-ex-word')!.textContent).toBe('保養');
    expect(item.querySelector('.md-ex-en')!.textContent).toBe('en 自行車要保養');
  });
});
