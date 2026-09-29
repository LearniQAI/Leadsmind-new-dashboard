// @vitest-environment jsdom
// AT-02: the "You Are Creating a New Course" acknowledgement — user can cancel or explicitly confirm.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NewCourseAcknowledgement from './NewCourseAcknowledgement';

afterEach(cleanup);

describe('NewCourseAcknowledgement (AT-02)', () => {
  it('shows the required title, body, hierarchy and both buttons', () => {
    render(<NewCourseAcknowledgement open onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText('You Are Creating a New Course')).toBeTruthy();
    expect(screen.getByText(/not a Module or Lesson/)).toBeTruthy();
    expect(screen.getByText(/select .Add Module./)).toBeTruthy();
    for (const level of ['Learning Site / Domain', 'Course', 'Module', 'Lesson']) expect(screen.getByText(level)).toBeTruthy();
    expect(screen.getByText('you are creating this')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No, Go Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yes, Create New Course' })).toBeTruthy();
  });

  it('cancel calls onCancel and never onConfirm', () => {
    const onCancel = vi.fn(), onConfirm = vi.fn();
    render(<NewCourseAcknowledgement open onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'No, Go Back' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirm is explicit, and does not snooze unless the box was ticked', () => {
    const onConfirm = vi.fn();
    const { unmount } = render(<NewCourseAcknowledgement open onCancel={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Create New Course' }));
    expect(onConfirm).toHaveBeenLastCalledWith(false);
    unmount();

    const again = vi.fn();
    render(<NewCourseAcknowledgement open onCancel={() => {}} onConfirm={again} />);
    fireEvent.click(screen.getByLabelText(/remind me for 30 days/));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Create New Course' }));
    expect(again).toHaveBeenLastCalledWith(true);
  });

  it('renders nothing when closed', () => {
    render(<NewCourseAcknowledgement open={false} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByText('You Are Creating a New Course')).toBeNull();
  });
});
