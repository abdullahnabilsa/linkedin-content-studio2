export type Persona = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  // other persona fields
};

export type PersonaType = 'basic' | 'premium' | 'custom';

export type CreatePersonaInput = Omit<Persona, 'id'>;

export type UpdatePersonaInput = Partial<Omit<Persona, 'id'>>;