import { describe, expect, it } from 'vitest';
import { isSlotConflictError, isResourceConflictError, SLOT_CONFLICT_MESSAGE, RESOURCE_CONFLICT_MESSAGE } from './bookingErrors';

const calendarConflict = { code: '23P01', message: 'conflicting key value violates exclusion constraint "appointments_no_overlap"' };
const resourceConflict = { code: '23P01', message: 'conflicting key value violates exclusion constraint "appointments_resource_no_overlap"' };

describe('isSlotConflictError / isResourceConflictError (Task 71)', () => {
  it('classifies the calendar_id exclusion violation as a slot conflict, not a resource conflict', () => {
    expect(isSlotConflictError(calendarConflict)).toBe(true);
    expect(isResourceConflictError(calendarConflict)).toBe(false);
  });

  it('classifies the resource_id exclusion violation as a resource conflict, not a slot conflict', () => {
    expect(isResourceConflictError(resourceConflict)).toBe(true);
    expect(isSlotConflictError(resourceConflict)).toBe(false);
  });

  it('a non-exclusion error is neither', () => {
    const other = { code: '23505', message: 'duplicate key value violates unique constraint' };
    expect(isSlotConflictError(other)).toBe(false);
    expect(isResourceConflictError(other)).toBe(false);
  });

  it('handles null/non-object input safely', () => {
    expect(isSlotConflictError(null)).toBe(false);
    expect(isResourceConflictError(undefined)).toBe(false);
    expect(isResourceConflictError('a string')).toBe(false);
  });

  it('messages are real, distinct, user-facing strings', () => {
    expect(SLOT_CONFLICT_MESSAGE).toMatch(/slot/i);
    expect(RESOURCE_CONFLICT_MESSAGE).toMatch(/room|resource/i);
    expect(SLOT_CONFLICT_MESSAGE).not.toBe(RESOURCE_CONFLICT_MESSAGE);
  });
});
