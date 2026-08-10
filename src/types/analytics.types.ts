export interface KpiData {
 value: number;
 previousValue: number;
 changePercent: number;
 isPositive: boolean;
}

export interface ChartDataPoint {
 label: string;
 value: number;
 [key: string]: string | number;
}

export interface PipelineDealPreview {
 id: string;
 title: string;
 value: number;
 stageEnteredAt: string;
 ownerId: string | null;
 contact: { firstName: string; lastName: string } | null;
 owner: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
}

export interface PipelineFunnelStage {
 id: string;
 label: string;
 value: number;
 totalValue: number;
 pipelineId: string | null;
 pipelineName: string | null;
 deals: PipelineDealPreview[];
}

export interface DashboardMetrics {
 totalContacts: KpiData;
 revenueThisPeriod: KpiData;
 openPipelineValue: KpiData;
 courseEnrollments: KpiData;
 contactsOverTime: ChartDataPoint[];
 revenueByWeek: ChartDataPoint[];
 contactsBySource: ChartDataPoint[];
 pipelineFunnel: PipelineFunnelStage[];
 topActiveContacts: {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  last_activity_at: string;
 }[];
 recentInvoices: {
  id: string;
  contact_name: string;
  amount: number;
  status: string;
  created_at: string;
 }[];
}

export type DateRange = '7d' | '30d' | '90d';
