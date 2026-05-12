export type Category = {
  id: string;
  name: string;
  icon: string | null;
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
