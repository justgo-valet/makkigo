interface CompletedHistoryItem {
  id: number;
  plateNumber: string;
  merchant: { id: number; name: string } | null;
  parkedAt: string | null;
  completedAt: string;
  fee: number | null;
}

interface CompletedHistory {
  date: string;
  today: string;
  merchants: { id: number; name: string }[];
  items: CompletedHistoryItem[];
}

export type { CompletedHistory, CompletedHistoryItem };
