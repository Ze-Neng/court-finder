/**
 * 全局常量
 * — 试点区域: 林州
 * — 状态颜色、频率限制、缓存 TTL、地图默认值
 */

import type { CourtStatus } from '../typings/court'

// ====== 试点区域 ======

export const PILOT_AREA = {
  /** 林州试点区域 ID */
  id: 'linzhou',
  /** 林州市中心坐标 [lng, lat] */
  center: { lng: 113.82, lat: 36.08 },
  /** 试点区域名称 */
  name: '林州市',
} as const

// ====== 状态颜色映射 ======

/** 状态 → 地图 Marker / 状态标签颜色 */
export const STATUS_COLORS: Record<CourtStatus, 'green' | 'orange' | 'red'> = {
  verified: 'green',
  user_confirmed_available: 'green',
  recent_user_feedback: 'green',
  pending_confirmation: 'orange',
  under_construction: 'red',
  temporarily_closed: 'red',
}

// ====== 频率限制常量 ======

export const FREQUENCY_LIMITS = {
  /** 同一球场、同一反馈类型，冷却时间 10 分钟 */
  STATUS_COOLDOWN_MS: 10 * 60 * 1000,
  /** 纠错/新增球场，冷却时间 5 分钟 */
  CORRECTION_COOLDOWN_MS: 5 * 60 * 1000,
  /** 每日最大状态反馈次数 */
  MAX_STATUS_PER_DAY: 5,
  /** 每日最大新增球场次数 */
  MAX_NEW_COURT_PER_DAY: 2,
} as const

// ====== 缓存 ======

/** 球场列表本地缓存 TTL：5 分钟 */
export const CACHE_TTL = 5 * 60 * 1000 // 300000ms

// ====== 地图默认值 ======

export const MAP = {
  /** 默认缩放级别 */
  DEFAULT_ZOOM: 14,
  /** 最小缩放 */
  MIN_ZOOM: 10,
  /** 最大缩放 */
  MAX_ZOOM: 18,
  /** 默认搜索半径（米） */
  DEFAULT_RADIUS: 5000,
} as const

// ====== 运动类型中文映射 ======

/** SportType → 展示文案 */
export const SPORT_LABELS: Record<string, string> = {
  basketball: '篮球',
  table_tennis: '乒乓球',
} as const
