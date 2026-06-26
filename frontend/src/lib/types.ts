export type User = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
};

export type Asana = {
  id: number;
  english_name: string;
  sanskrit_name: string;
  alt_name_1?: string | null;
  alt_name_2?: string | null;
  difficulty_level: number;
  benefits: string;
  is_classic: boolean;
  type: string;
  category: string;
  rank: number;
};

export type Transition = {
  id: number;
  name: string;
  start_asana_id: number;
  end_asana_id: number;
  difficulty_level: number;
  rank: number;
};

export type Flow = {
  id: number;
  name: string;
  transition_1_id: number;
  transition_2_id: number;
  transition_3_id: number;
  transition_4_id: number;
  difficulty_level: number;
  rank: number;
};

export type Photo = {
  id: number;
  type: string;
  asana_id: number;
  user_id?: number | null;
  local_path: string;
  original_url?: string | null;
  rank: number;
};
