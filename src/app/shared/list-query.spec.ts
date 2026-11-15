import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { ListQueryState } from './list-query';

describe('ListQueryState', () => {
  it('starts on the first page with the given sort', () => {
    const state = new ListQueryState<string>({ sortBy: 'name' });
    expect(state.page()).toBe(1);
    expect(state.sortBy()).toBe('name');
    expect(state.sortDirection()).toBe('asc');
  });

  it('restarts at page 1 when the page size changes', () => {
    const state = new ListQueryState<string>({ sortBy: 'name', pageSize: 10 });
    state.setPage(3);
    state.setPageSize(50);
    expect(state.pageSize()).toBe(50);
    expect(state.page()).toBe(1);
  });

  it('toggles direction only when the same column is sorted twice', () => {
    const state = new ListQueryState<string>({ sortBy: 'name' });
    state.sortByColumn('email');
    expect([state.sortBy(), state.sortDirection()]).toEqual(['email', 'asc']);
    state.sortByColumn('email');
    expect([state.sortBy(), state.sortDirection()]).toEqual(['email', 'desc']);
    state.sortByColumn('name');
    expect([state.sortBy(), state.sortDirection()]).toEqual(['name', 'asc']);
  });

  it('returns to page 1 when sorting changes', () => {
    const state = new ListQueryState<string>({ sortBy: 'name' });
    state.setPage(4);
    state.sortByColumn('status');
    expect(state.page()).toBe(1);
  });

  it('clamps a page to the server total when one is supplied', () => {
    const total = signal(25);
    const state = new ListQueryState<string>({ sortBy: 'name', pageSize: 10, total });
    state.setPage(99);
    expect(state.page()).toBe(3);
    state.setPage(0);
    expect(state.page()).toBe(1);
  });

  it('does not clamp a page when no total is known', () => {
    const state = new ListQueryState<string>({ sortBy: 'name', pageSize: 10 });
    state.setPage(7);
    expect(state.page()).toBe(7);
  });
});
