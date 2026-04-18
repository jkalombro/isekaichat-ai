export interface Character {
  id: string;
  name: string;
  source: string;
  profile: string;
  ownerId: string;
  avatarUrl?: string;
  totalTokensConsumed?: number;
  lastCalculationDatetime?: any;
  memories?: string;
  lastSummarizedIndex?: number;
}

export interface SummaryTokens {
  id: string;
  tokensConsumed: number;
  dateTimeSummarized: any;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: any;
  tokensConsumed?: number;
}

export interface AppStatus {
  isMaintenanceMode: boolean;
  maintenanceStartDateTime?: any;
  maintenanceEndDateTime?: any;
}
