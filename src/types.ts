export type Role = 'user' | 'abigail'

export type ChatMessage = {
  id: string
  role: Role
  text: string
  createdAt: number
}
