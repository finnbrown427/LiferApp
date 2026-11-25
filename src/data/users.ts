// Preset profiles for the app's local profile selector; these are not authenticated accounts.
export const defaultUsers = [
  { id: 'rosa', name: 'Rosa' },
  { id: 'finn', name: 'Finn' },
] as const

export type UserId = (typeof defaultUsers)[number]['id']
