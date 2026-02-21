export type RagStatus = 'Green' | 'Orange' | 'Red';
export type ProjectType = 'FixedPrice' | 'TM' | 'SLA' | 'RIInternal';
export type ProjectStatus = 'Pipeline' | 'Active' | 'OnHold' | 'Completed' | 'Lost';
export type DealStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Disqualified';
export type DealLikelihood = 'Low' | 'Medium' | 'High';
export type MemberRole = 'Principal' | 'Lead' | 'Designer' | 'Developer' | 'BA' | 'Production';
export type EmploymentType = 'FullTime' | 'PartTime' | 'Contractor';

export interface Client {
  id: string;
  name: string;
  industry?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  notes?: string;
  _count?: { projects: number };
}

export interface ProjectHealthUpdate {
  id: string;
  projectId: string;
  updateDate: string;
  overallStatus: RagStatus;
  scheduleStatus: RagStatus;
  scopeStatus: RagStatus;
  budgetStatus: RagStatus;
  clientStatus: RagStatus;
  notes?: string;
  updatedBy?: { id: string; name: string };
}

export interface ProjectFinancial {
  id: string;
  projectId: string;
  month: string;
  actualFees: number;
  estimateToComplete: number;
  estimateAtComplete: number;
  variance: number;
  profitMargin: number;
}

export interface Project {
  id: string;
  clientId: string;
  client: { id: string; name: string };
  name: string;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget: number;
  harvestProjectId?: string;
  dealStage?: DealStage;
  dealLikelihood?: DealLikelihood;
  dealAmount?: number;
  expectedCloseDate?: string;
  healthUpdates: ProjectHealthUpdate[];
  financials?: ProjectFinancial[];
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  employmentType: EmploymentType;
  weeklyHours: number;
  hourlyRateInternal: number;
  hourlyRateBillable: number;
  manager?: { id: string; name: string };
  managerId?: string;
  harvestUserId?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export interface MonthlyFinancial {
  id: string;
  month: string;
  invoiced: number;
  prepayments: number;
  internalRevenue: number;
  totalRevenue: number;
  wagesCost: number;
  contractorsCost: number;
  travelCost: number;
  otherDirectCost: number;
  directCosts: number;
  grossProfit: number;
  grossMargin: number;
  indirectCosts: number;
  netProfit: number;
  netMargin: number;
  rAndIHours: number;
  notes?: string;
}

export interface DashboardData {
  activeProjectsCount: number;
  alertProjectsCount: number;
  activeProjects: {
    id: string;
    name: string;
    client: string;
    projectType: ProjectType;
    status: ProjectStatus;
    healthStatus?: RagStatus;
    budget: number;
  }[];
  pipeline: {
    total: number;
    weighted: number;
    count: number;
  };
  financials?: {
    revenue: number;
    costs: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
  };
  team: {
    activeCount: number;
    memberUtilization: number;
  };
  lastHarvestSync?: string;
}
