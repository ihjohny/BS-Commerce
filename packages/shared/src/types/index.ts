export type UserRole = 'admin' | 'vendor' | 'customer'
export type UserStatus = 'active' | 'suspended' | 'banned'
export type Locale = 'en' | 'bn'
export type Currency = 'USD' | 'BDT'

export interface PaginatedResponse<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

export interface ApiError {
  message: string
  errors?: Record<string, string>
}
