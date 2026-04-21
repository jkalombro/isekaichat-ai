export type CharacterStatus = 'online' | 'offline' | 'unstable';

export interface StatusRecord {
  status: CharacterStatus;
  lastUpdate: number;
  lastMessageSent?: number;
  messagedWhileOffline?: boolean;
}

export interface LocalStatusMap {
  [characterId: string]: StatusRecord;
}

export interface UnreadMap {
  [characterId: string]: number;
}

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
  createdAt?: any;
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
