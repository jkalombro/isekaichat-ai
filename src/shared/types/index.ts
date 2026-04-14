export interface Character {
  id: string;
  name: string;
  source: string;
  profile: string;
  ownerId: string;
  avatarUrl?: string;
  totalTokensConsumed?: number;
  lastCalculationDatetime?: any;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: any;
  tokensConsumed?: number;
}
