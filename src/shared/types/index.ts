export interface Character {
  id: string;
  name: string;
  source: string;
  profile: string;
  ownerId: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: any;
}
