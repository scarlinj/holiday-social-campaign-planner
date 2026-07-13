export interface PostDraft {
  platform: 'Instagram' | 'LinkedIn' | 'X (Twitter)';
  content: string;
  visualPrompt: string;
  visualDescription: string;
  imageUrl?: string;
  generatingImage?: boolean;
  imageWarning?: string;
}

export interface TimelineCheckpoint {
  timeframe: string;
  title: string;
  task: string;
  objective: string;
  date?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  phase: string;
  completed: boolean;
}

export interface Campaign {
  theme: string;
  posts: PostDraft[];
  timeline: TimelineCheckpoint[];
  checklist: ChecklistItem[];
}

export interface PresetHoliday {
  name: string;
  date: string;
  emoji: string;
  category: 'Major' | 'Fun' | 'Seasonal' | 'Global';
  description: string;
}
