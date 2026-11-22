import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SchemeCard from './SchemeCard';
import { loadTracker, removeEntry, TRACKER_KEY } from '../lib/tracker';
import type { MatchResult, Scheme } from '../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const scheme: Scheme = {
  id: 'test-scheme',
  name: 'Test Scheme',
  level: 'central',
  state: 'ALL',
  category: 'agriculture',
  benefit_summary: 'Test benefit',
  official_url: 'https://example.gov.in',
  last_verified: '2025-01-01',
  rules: [],
  documents: [],
  apply_steps: [],
  deadline: { type: 'fixed', date: '2025-06-30', note: 'Apply before the end of June.' },
};

const result: MatchResult = {
  schemeId: 'test-scheme',
  status: 'likely_eligible',
  ruleResults: [],
  missingFields: [],
};

let container: HTMLDivElement;
let root: Root;

function renderCard() {
  act(() => {
    root.render(
      <MemoryRouter>
        <SchemeCard scheme={scheme} result={result} />
      </MemoryRouter>,
    );
  });
}

function findButton(text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

describe('SchemeCard tracker button', () => {
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('adds an entry to localStorage when "Add to tracker" is clicked', () => {
    renderCard();
    act(() => {
      findButton('Add to tracker').click();
    });

    const raw = localStorage.getItem(TRACKER_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string);
    expect(stored).toHaveLength(1);
    expect(stored[0].schemeId).toBe('test-scheme');
    expect(stored[0].status).toBe('not_started');
    expect(stored[0].deadline).toBe('2025-06-30');
  });

  it('does not add a duplicate when the tracked button is clicked again', () => {
    renderCard();
    act(() => {
      findButton('Add to tracker').click();
    });
    act(() => {
      findButton('Tracked').click();
    });

    expect(loadTracker()).toHaveLength(1);
  });

  it('removes the entry via removeEntry', () => {
    renderCard();
    act(() => {
      findButton('Add to tracker').click();
    });
    expect(loadTracker()).toHaveLength(1);

    removeEntry('test-scheme');
    expect(loadTracker()).toHaveLength(0);
  });

  it('shows the unavailable notice and no verified-date line when last_verified is not a date', () => {
    const badDate: Scheme = { ...scheme, last_verified: 'not-a-date' };
    act(() => {
      root.render(
        <MemoryRouter>
          <SchemeCard scheme={badDate} result={result} />
        </MemoryRouter>,
      );
    });
    expect(container.textContent).toContain('Verification date unavailable');
    expect(container.textContent).not.toContain('not-a-date');
  });
});
