export type TradeSide = "buy" | "sell";
export type TradeResult = "win" | "lose";

export type Trade = {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  pair: string;
  side: TradeSide;
  lot_size: number;
  entry_price: number;
  exit_price: number | null;
  pnl_pips: number | null;
  pnl_amount: number | null;
  fee: number | null;
  swap: number | null;
  lc_target: number | null;
  tp_target: number | null;
  risk_reward: number | null;
  mae_pips: number | null;
  mfe_pips: number | null;
  result: TradeResult | null;
  memo: string | null;
  screenshot_url: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  created_at: string;
};

export type TradeTag = {
  trade_id: string;
  tag_id: string;
};

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: Trade;
        Insert: Omit<Trade, "id" | "user_id" | "created_at"> & {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Trade, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, "id" | "user_id" | "created_at"> & {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Tag, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      trade_tags: {
        Row: TradeTag;
        Insert: TradeTag;
        Update: Partial<TradeTag>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
