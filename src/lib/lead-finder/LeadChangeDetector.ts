export interface LeadState {
  rating: number;
  review_count: number;
  website?: string;
  lead_score: number;
  qualification_status: string;
}

export interface ChangeEvent {
  event_type: string;
  severity: 'High' | 'Medium' | 'Low';
  previous_value: string;
  new_value: string;
}

export class LeadChangeDetector {
  /**
   * Evaluates differences between a lead's previous state and new state.
   */
  public static detectChanges(oldState: LeadState, newState: LeadState): ChangeEvent[] {
    const changes: ChangeEvent[] = [];

    // Rating changes
    if (oldState.rating !== newState.rating) {
      const drop = newState.rating < oldState.rating;
      changes.push({
        event_type: drop ? 'rating_drop' : 'rating_increase',
        severity: drop && newState.rating < 4.0 ? 'High' : 'Medium',
        previous_value: oldState.rating.toString(),
        new_value: newState.rating.toString()
      });
    }

    // Review velocity
    if (newState.review_count > oldState.review_count) {
      const spike = (newState.review_count - oldState.review_count) > 10;
      if (spike) {
        changes.push({
          event_type: 'review_spike',
          severity: 'Medium',
          previous_value: oldState.review_count.toString(),
          new_value: newState.review_count.toString()
        });
      }
    }

    // Website changes
    if (!oldState.website && newState.website) {
      changes.push({
        event_type: 'website_added',
        severity: 'High',
        previous_value: 'None',
        new_value: newState.website
      });
    }

    // Score improvements
    if (newState.lead_score > oldState.lead_score + 10) {
      changes.push({
        event_type: 'score_improved',
        severity: 'Medium',
        previous_value: oldState.lead_score.toString(),
        new_value: newState.lead_score.toString()
      });
    }

    return changes;
  }
}
