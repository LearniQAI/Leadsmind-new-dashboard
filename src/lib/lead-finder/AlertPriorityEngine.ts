import { ChangeEvent } from './LeadChangeDetector';

export class AlertPriorityEngine {
  /**
   * Evaluates the priority of an alert based on severity and business context.
   */
  public static evaluatePriority(event: ChangeEvent, leadScore: number): 'High' | 'Medium' | 'Low' {
    let score = 0;

    if (event.severity === 'High') score += 50;
    if (event.severity === 'Medium') score += 20;

    if (leadScore >= 70) score += 30; // High value lead amplifies priority
    else if (leadScore >= 40) score += 10;

    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }
}
