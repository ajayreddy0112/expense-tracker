export type Category = {
  id: string;
  name: string;
  icon: string | null;
};

export type Gender = "male" | "female";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseLite = {
  id: string;
  amount: number;
  spent_on: string;
  note: string | null;
  category_id: string;
  category_name: string;
  category_icon: string | null;
};
