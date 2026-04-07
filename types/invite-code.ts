export type InviteCode = {
  id: string;
  code: string;
};

export type InviteCodeUse = {
  id: string;
  invite_code_id: string;
  user_id: string;
};

export type DurationType = 'fixed' | 'relative';

export type CreateInviteCodeInput = Omit<InviteCode, 'id'>;