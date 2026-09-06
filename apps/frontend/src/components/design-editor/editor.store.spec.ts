import { useEditorStore } from './editor.store';

/**
 * Undo is the safety net behind every destructive action in Studio — applying a
 * template, generating over a canvas, deleting a layer. The cap is what makes
 * it finite; the reset is what stops one editing session reaching into the one
 * before it, which could belong to a different organisation.
 */

const state = () => useEditorStore.getState();

beforeEach(() => state().resetHistory());

describe('history', () => {
  it('starts empty, with nothing to undo', () => {
    expect(state().history).toEqual([]);
    expect(state().historyIndex).toBe(-1);
    expect(state().undo()).toBeNull();
    expect(state().redo()).toBeNull();
  });

  it('walks back and forward through recorded states', () => {
    ['a', 'b', 'c'].forEach(state().pushHistory);
    expect(state().undo()).toBe('b');
    expect(state().undo()).toBe('a');
    expect(state().undo()).toBeNull(); // the first entry is the floor
    expect(state().redo()).toBe('b');
    expect(state().redo()).toBe('c');
    expect(state().redo()).toBeNull();
  });

  it('drops the redo tail once you edit after undoing', () => {
    ['a', 'b', 'c'].forEach(state().pushHistory);
    state().undo();
    state().pushHistory('d');
    expect(state().history).toEqual(['a', 'b', 'd']);
    expect(state().redo()).toBeNull();
  });

  it('keeps the newest 30 states and forgets the oldest', () => {
    for (let i = 0; i < 35; i += 1) state().pushHistory(`s${i}`);
    expect(state().history).toHaveLength(30);
    expect(state().history[0]).toBe('s5');
    expect(state().historyIndex).toBe(29);
  });

  it('is cleared by resetHistory, so a new editor cannot undo into the last one', () => {
    ['a', 'b'].forEach(state().pushHistory);
    state().resetHistory();
    expect(state().history).toEqual([]);
    expect(state().historyIndex).toBe(-1);
    expect(state().undo()).toBeNull();
  });
});
