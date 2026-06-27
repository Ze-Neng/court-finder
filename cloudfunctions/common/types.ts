// ====== 寻觅球场 — 云函数共享类型 ======
// 枚举定义与 miniprogram/typings/ 保持一致，手动同步

//#region ====== 枚举类型 ======

/** 运动类型 — 与 miniprogram/typings/court.d.ts 保持一致 */
export type SportType = 'basketball' | 'table_tennis'

/**
 * 球场状态（优先级从高到低）
 * — 与 miniprogram/typings/court.d.ts 保持一致
 */
export type CourtStatus =
  | 'under_construction'
  | 'temporarily_closed'
  | 'verified'
  | 'user_confirmed_available'
  | 'recent_user_feedback'
  | 'pending_confirmation'

/** 数据来源 — 与 miniprogram/typings/court.d.ts 保持一致 */
export type DataSource = 'platform_verified' | 'user_verified' | 'initial_entry'

/** 收费类型 — 与 miniprogram/typings/court.d.ts 保持一致 */
export type FeeType = 'free' | 'paid' | 'unknown'

/** 用户提交类型 — 与 miniprogram/typings/submission.d.ts 保持一致 */
export type SubmissionType =
  | 'open_normal'
  | 'under_construction'
  | 'temporarily_closed'
  | 'cannot_enter'
  | 'correction'
  | 'new_court'

/** 内容安全状态 — 与 miniprogram/typings/submission.d.ts 保持一致 */
export type SecurityStatus =
  | 'security_passed'
  | 'security_rejected'
  | 'security_pending_review'

/** 审核状态 — 与 miniprogram/typings/submission.d.ts 保持一致 */
export type ReviewStatus =
  | 'pending_review'
  | 'approved_no_effect'
  | 'approved_effective'
  | 'rejected'

/** 风险等级 — 与 miniprogram/typings/submission.d.ts 保持一致 */
export type RiskLevel = 'normal' | 'high'

/** 操作类型 — 与 database/schema.md 保持一致 */
export type ActionType =
  | 'update_court_status'
  | 'update_court_field'
  | 'approve_submission'
  | 'reject_submission'
  | 'refresh_status'
  | 'admin_verify'

//#endregion

//#region ====== 实体类型 ======

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface Facilities {
  lighting?: boolean
  surface?: string
  hoops_or_goals?: string
  toilets?: boolean
}

//#endregion

//#region ====== 云函数响应 & 上下文 ======

/** 云函数标准响应包装 — 与 miniprogram/typings/cloud-function.d.ts 保持一致 */
export interface CFResponse<T = undefined> {
  /** 0 = 成功，>0 = 错误 */
  code: number
  message: string
  data?: T
}

/** 云函数上下文 — 由 wx-server-sdk 注入 */
export interface AuthContext {
  openid: string
  openid_hash: string
  is_admin: boolean
}

/** 云函数事件入参泛型 */
export interface CloudFunctionEvent<T = Record<string, unknown>> {
  userInfo: {
    appId: string
    openId: string
  }
  data: T
}

//#endregion
