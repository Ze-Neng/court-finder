/**
 * 状态展示映射
 * — 状态 → 颜色、中文名、行动建议文案
 */

import type { CourtStatus } from '../typings/court'
import { STATUS_COLORS } from '../utils/constants'

/** 状态中文名称 */
const STATUS_LABELS: Record<CourtStatus, string> = {
  verified: '已核验',
  user_confirmed_available: '用户近期确认可用',
  recent_user_feedback: '有用户近期反馈',
  pending_confirmation: '信息待确认',
  under_construction: '施工中',
  temporarily_closed: '暂时关闭',
}

/** 行动建议文案 */
const STATUS_ACTIONS: Record<CourtStatus, string> = {
  verified: '可优先前往',
  user_confirmed_available: '可考虑前往',
  recent_user_feedback: '建议到场前留意',
  pending_confirmation: '谨慎前往',
  under_construction: '不建议前往',
  temporarily_closed: '不建议前往',
}

/**
 * 获取状态对应的地图 Marker / 标签颜色
 * @returns 'green' | 'orange' | 'red'
 */
export function getStatusColor(status: CourtStatus): 'green' | 'orange' | 'red' {
  return STATUS_COLORS[status] || 'orange'
}

/**
 * 获取状态中文名称
 */
export function getStatusLabel(status: CourtStatus): string {
  return STATUS_LABELS[status] || '未知'
}

/**
 * 获取状态行动建议文案
 */
export function getStatusActionSuggestion(status: CourtStatus): string {
  return STATUS_ACTIONS[status] || ''
}
