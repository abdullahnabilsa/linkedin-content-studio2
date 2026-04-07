export type PersonaCategory = {
  id: string;
  name: string;
};

export type CreateCategoryInput = Omit<PersonaCategory, 'id'>;