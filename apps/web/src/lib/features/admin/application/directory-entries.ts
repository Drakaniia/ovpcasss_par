import type { Department, DepartmentInput, Office, OfficeInput } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';

/**
 * Department and Office are flat, name-only lists, so they are the two the PAR
 * form may extend in place (UI phase 06 §3). Camps, units, programs, and terms
 * need codes and relations and stay in the admin page.
 *
 * Removal is always the soft delete the API owns: the entry stays resolvable in
 * reports that already name it, and it can be restored from the toast.
 */

export type DirectoryEntity = 'departments' | 'offices';
export type DirectoryEntry = Department | Office;

export function sortDirectory<T extends { sortOrder: number; name: string }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** A new entry goes after the last one, so added names do not jump to the top. */
export function nextDirectoryOrder(entries: readonly { sortOrder: number }[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.sortOrder), 0) + 1;
}

export function upsertDirectoryEntry<T extends { id: string }>(
  entries: readonly T[],
  entry: T,
): T[] {
  const rest = entries.filter((item) => item.id !== entry.id);
  return [...rest, entry];
}

export function withoutDirectoryEntry<T extends { id: string }>(
  entries: readonly T[],
  id: string,
): T[] {
  return entries.filter((item) => item.id !== id);
}

function fieldError(error: unknown, fallback: string): Error {
  return new Error(error instanceof ApiError ? error.message : fallback);
}

function input(name: string, sortOrder: number, isActive = true): DepartmentInput & OfficeInput {
  return { name: name.trim(), sortOrder, isActive };
}

function create(
  entity: DirectoryEntity,
  values: DepartmentInput & OfficeInput,
): Promise<DirectoryEntry> {
  return entity === 'departments'
    ? api.admin.referenceData.create('departments', values)
    : api.admin.referenceData.create('offices', values);
}

function update(
  entity: DirectoryEntity,
  id: string,
  values: DepartmentInput & OfficeInput,
): Promise<DirectoryEntry> {
  return entity === 'departments'
    ? api.admin.referenceData.update('departments', id, values)
    : api.admin.referenceData.update('offices', id, values);
}

function deactivate(entity: DirectoryEntity, id: string): Promise<DirectoryEntry> {
  return entity === 'departments'
    ? api.admin.referenceData.deactivate('departments', id)
    : api.admin.referenceData.deactivate('offices', id);
}

function activate(entity: DirectoryEntity, id: string): Promise<DirectoryEntry> {
  return entity === 'departments'
    ? api.admin.referenceData.activate('departments', id)
    : api.admin.referenceData.activate('offices', id);
}

export async function createDirectoryEntry(
  entity: DirectoryEntity,
  name: string,
  entries: readonly DirectoryEntry[],
): Promise<DirectoryEntry> {
  try {
    return await create(entity, input(name, nextDirectoryOrder(entries)));
  } catch (error) {
    throw fieldError(error, `“${name}” was not added. Try again.`);
  }
}

export async function renameDirectoryEntry(
  entity: DirectoryEntity,
  entry: DirectoryEntry,
  name: string,
): Promise<DirectoryEntry> {
  try {
    return await update(entity, entry.id, input(name, entry.sortOrder, entry.isActive));
  } catch (error) {
    throw fieldError(error, 'The entry was not renamed. Try again.');
  }
}

export async function removeDirectoryEntry(
  entity: DirectoryEntity,
  entry: DirectoryEntry,
): Promise<DirectoryEntry> {
  try {
    return await deactivate(entity, entry.id);
  } catch (error) {
    throw fieldError(error, 'The entry was not removed. Try again.');
  }
}

export async function restoreDirectoryEntry(
  entity: DirectoryEntity,
  entry: DirectoryEntry,
): Promise<DirectoryEntry> {
  try {
    return await activate(entity, entry.id);
  } catch (error) {
    throw fieldError(error, 'The entry was not restored. Try again.');
  }
}
