import type { CourtCardData, CourtDetailData, SportType, CourtStatus, GeoJSONPoint } from './court'
import type { SubmissionListItem } from './submission'

// ====== 通用包装 ======

/** 云函数标准响应包装 */
export interface CFResponse<T = undefined> {
  /** 0 = 成功，>0 = 错误 */
  code: number
  message: string
  data?: T
}

/** 分页参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页结果 */
export interface PaginationResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 查询接口通用参数 — 统一继承，防止试点区域漏筛选 */
export interface BaseQueryParams {
  pilotAreaId: string
}

// ====== getCourts ======

export interface GetCourtsParams extends PaginationParams, BaseQueryParams {
  /** 用户当前位置 [lng, lat] */
  location?: [number, number]
  /** 搜索半径（米） */
  radius?: number
  sportType?: SportType
  /** 需要展示的状态列表 */
  statuses?: CourtStatus[]
  /** 排序: distance | status | updated_at */
  sortBy?: 'distance' | 'status' | 'updated_at'
}

export interface GetCourtsResult {
  list: CourtCardData[]
  total: number
  page: number
  pageSize: number
  /** 定位拒绝时为试点区域中心 */
  fallbackLocation?: { lng: number; lat: number }
}

// ====== getCourtDetail ======

export interface GetCourtDetailParams {
  courtId: string
  /** 用户当前位置 [lng, lat]，用于计算距离 */
  userLocation?: [number, number]
}

export interface GetCourtDetailResult {
  court: CourtDetailData
}

// ====== toggleFavorite ======

export interface ToggleFavoriteParams {
  courtId: string
}

export interface ToggleFavoriteResult {
  favorited: boolean
}

// ====== submitReport ======

export interface SubmitReportParams {
  courtId: string
  /** 提交类型: 'status' 或 'correction' */
  reportType: 'status' | 'correction'
  /** 状态反馈: 现场状态 */
  reportStatus?: 'open_normal' | 'under_construction' | 'temporarily_closed' | 'cannot_enter'
  /** 补充说明 */
  comment?: string
  /** 纠错详情 */
  correctionDetails?: import('./submission').CorrectionDetails
}

export interface SubmitReportResult {
  submissionId: string
  status: string
}

// ====== submitNewCourt ======

export interface SubmitNewCourtParams {
  name: string
  sportType: SportType
  location: GeoJSONPoint
  address: string
  openingHours?: string
  feeType?: 'free' | 'paid' | 'unknown'
  facilities?: string
}

export interface SubmitNewCourtResult {
  submissionId: string
  status: string
}

// ====== getUserIdentity ======

export interface GetUserIdentityResult {
  openidHash: string
}

// ====== trackEvent ======

export interface TrackEventParams {
  eventName: string
  courtId?: string
  pilotAreaId: string
  scene?: number
  eventData?: Record<string, unknown>
}

// ====== adminReviewSubmission ======

export interface AdminReviewSubmissionParams {
  submissionId: string
  action: 'approve' | 'reject'
  reviewComment?: string
}

// ====== getMySubmissions ======

export interface GetMySubmissionsParams {
  page: number
  pageSize: number
}

export interface GetMySubmissionsResult {
  list: SubmissionListItem[]
  total: number
}
