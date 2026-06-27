// ====== 枚举类型（与 database/schema.md 保持一致） ======

/** 用户提交类型 */
export type SubmissionType =
  | 'open_normal'
  | 'under_construction'
  | 'temporarily_closed'
  | 'cannot_enter'
  | 'correction'
  | 'new_court'

/** 内容安全检测状态 */
export type SecurityStatus =
  | 'security_passed'
  | 'security_rejected'
  | 'security_pending_review'

/** 人工审核状态 */
export type ReviewStatus =
  | 'pending_review'
  | 'approved_no_effect'
  | 'approved_effective'
  | 'rejected'

/** 风险等级 */
export type RiskLevel = 'normal' | 'high'

// ====== 业务实体 ======

/** 纠错详情 */
export interface CorrectionDetails {
  /** 纠错字段 */
  field:
    | 'name'
    | 'address'
    | 'opening_hours'
    | 'fee_type'
    | 'facilities'
    | 'location'
    | 'other'
  /** 当前错误值 */
  old_value?: string
  /** 建议正确值 */
  suggested_value: string
}

/** 新增球场详情 */
export interface NewCourtDetails {
  name: string
  address: string
  sport_type: import('./court').SportType
  location: import('./court').GeoJSONPoint
}

/** 用户提交（对应 user_submissions 集合） */
export interface Submission {
  _id: string
  openid_hash: string
  submission_type: SubmissionType
  court_id?: string
  content: string
  correction_details?: CorrectionDetails
  new_court_details?: NewCourtDetails
  security_status: SecurityStatus
  review_status: ReviewStatus
  risk_level: RiskLevel
  is_duplicate_of?: string
  created_at: Date
  reviewed_at?: Date
  reviewer_openid?: string
  review_reason?: string
}

/** 用户提交列表项（"我的提交"页面用） */
export interface SubmissionListItem {
  id: string
  submissionType: SubmissionType
  courtId?: string
  courtName?: string
  content: string
  reviewStatus: ReviewStatus
  reviewReason?: string
  createdAt: Date
}
