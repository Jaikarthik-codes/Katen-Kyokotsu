import { describe, expect, it } from 'vitest';

describe('test runner', () => {
  it('runs in a DOM environment', () => {
    document.body.innerHTML = '<p id="x">hi</p>';
    expect(document.getElementById('x')?.textContent).toBe('hi');
  });
});
