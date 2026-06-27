// ====== 枚举类型（与 database/schema.md 保持一致） ======

/** 运动类型 */
export type SportType = 'basketball' | 'table_tennis'

/**
 * 球场状态（优先级从高到低）
 * under_construction / temporarily_closed → 负面上报
 * verified → 平台30天内核验
 * user_confirmed_available → 近7天 ≥2 用户确认
 * recent_user_feedback → 近7天 1 用户反馈
 * pending_confirmation → 默认
 */
export type CourtStatus =
  | 'under_construction'
  | 'temporarily_closed'
  | 'verified'
  | 'user_confirmed_available'
  | 'recent_user_feedback'
  | 'pending_confirmation'

/** 数据来源 */
export type DataSource = 'platform_verified' | 'user_verified' | 'initial_entry'

/** 收费类型 */
export type FeeType = 'free' | 'paid' | 'unknown'

// ====== 业务实体 ======

/** 球场设施 */
export interface Facilities {
  lighting?: boolean
  surface?: string
  hoops_or_goals?: string
  toilets?: boolean
}

/** GeoJSON 点坐标 [lng, lat] */
export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

/** 正式球场（对应 courts 集合） */
export interface Court {
  _id: string
  name: string
  sport_types: SportType[]
  location: GeoJSONPoint
  address: string
  pilot_area_id: string
  opening_hours?: string
  fee_type: FeeType
  facilities?: Facilities
  current_status: CourtStatus
  status_reason: string
  data_source: DataSource
  created_at: Date
  updated_at: Date
  last_verified_at?: Date
  last_user_report_at?: Date
  last_negative_report_at?: Date
  is_deleted: boolean
}

// ====== 前端展示用类型 ======

/** 地图 Marker 数据 */
export interface CourtMarkerData {
  id: string
  name: string
  latitude: number
  longitude: number
  sportType: SportType
  status: CourtStatus
  /** 状态颜色: 'green' | 'orange' | 'red' */
  statusColor: string
}

/** 卡片展示数据 */
export interface CourtCardData {
  id: string
  /** 纬度（用于地图 Marker） */
  latitude: number
  /** 经度（用于地图 Marker） */
  longitude: number
  name: string
  sportType: SportType
  status: CourtStatus
  statusReason: string
  /** 距用户距离（米），未定位时为 null */
  distance: number | null
  dataSource: DataSource
  isFavorited: boolean
}

/** 球场详情展示数据 */
export interface CourtDetailData extends CourtCardData {
  address: string
  location: GeoJSONPoint
  openingHours?: string
  feeType: FeeType
  facilities?: Facilities
  lastVerifiedAt?: Date
  lastUserReportAt?: Date
}
