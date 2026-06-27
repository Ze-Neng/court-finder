/**
 * 云函数共享工具
 * — openid_hash 生成、球场状态计算引擎、频率限制校验
 */
import * as crypto from 'crypto'
import { cloud } from 'wx-server-sdk'
import type {
  CourtStatus,
  SubmissionType,
  SecurityStatus,
} from './types'

// ====== 身份标识 ======

/**
 * 生成匿名用户标识 — SHA256(openid + salt)
 * 原始 openid 不存储、不传输，salt 从环境变量 OPENID_SALT 读取
 */
export function generateOpenidHash(openid: string): string {
  const salt = process.env.OPENID_SALT
  if (!salt) {
    throw new Error('环境变量 OPENID_SALT 未配置')
  }
  return crypto
    .createHash('sha256')
    .update(openid + salt, 'utf8')
    .digest('hex')
}

// ====== 球场状态引擎 ======

/**
 * 计算球场状态（6 种状态，优先级从高到低）
 *
 * 优先级：
 * 1. 负面状态（审核采纳，14天内有效）
 * 2. 平台核验（30天内有效）→ verified
 * 3. ≥2名不同用户确认正常开放（7天内）→ user_confirmed_available
 * 4. 1名用户反馈正常开放（7天内）→ recent_user_feedback
 * 5. 默认 → pending_confirmation
 *
 * @param lastVerifiedAt    最近平台核验时间
 * @param positiveUserCount 近7天不同用户确认正常开放数（security_passed + approved_effective）
 * @param hasRecentFeedback 近7天有1名用户反馈正常开放
 * @param negativeStatus    审核采纳的负面状态类型（非布尔值，区分施工中/暂时关闭）
 * @param negativeCreatedAt 负面状态生效时间
 */
export function calculateCourtStatus(
  lastVerifiedAt: Date | null,
  positiveUserCount: number,
  hasRecentFeedback: boolean,
  negativeStatus?: 'under_construction' | 'temporarily_closed',
  negativeCreatedAt?: Date | null,
): CourtStatus {
  const now = new Date()

  // 优先级1: 负面状态 — 审核采纳的施工/关闭，14天内有效
  if (negativeStatus && negativeCreatedAt) {
    const negativeAgeMs = now.getTime() - new Date(negativeCreatedAt).getTime()
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    if (negativeAgeMs <= fourteenDaysMs) {
      return negativeStatus // 精确传递 under_construction 或 temporarily_closed
    }
  }

  // 优先级2: 平台核验 — 30天内有效
  if (lastVerifiedAt) {
    const verifiedAgeMs = now.getTime() - new Date(lastVerifiedAt).getTime()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    if (verifiedAgeMs <= thirtyDaysMs) {
      return 'verified'
    }
  }

  // 优先级3: 用户近期确认可用 — ≥2名不同用户确认
  if (positiveUserCount >= 2) {
    return 'user_confirmed_available'
  }

  // 优先级4: 有用户近期反馈 — 1名用户确认
  if (hasRecentFeedback) {
    return 'recent_user_feedback'
  }

  // 优先级5: 默认
  return 'pending_confirmation'
}

// ====== 频率限制 ======

const DAILY_LIMITS: Record<string, number> = {
  status: 5,    // 状态反馈：单日最多5次
  new_court: 2, // 新增球场：单日最多2次
}

const COOLDOWN_MINUTES: Record<string, number> = {
  status: 10,    // 状态反馈：10分钟冷却
  correction: 5, // 纠错：5分钟冷却
  new_court: 5,  // 新增球场：5分钟冷却
  default: 10,
}

export interface FrequencyCheckResult {
  allowed: boolean
  cooldownSeconds?: number
  message?: string
}

/**
 * 校验用户提交频率限制
 * — 云函数侧强制校验，前端仅展示提示
 * — 冷却判断以 openid_hash + court_id + submission_type + created_at 为依据
 *
 * @param openidHash     用户匿名标识
 * @param courtId        关联球场 ID（新增球场时为空串）
 * @param submissionType 提交类型
 * @param category       限制大类: 'status' | 'correction' | 'new_court'
 */
export async function checkFrequencyLimit(
  openidHash: string,
  courtId: string,
  submissionType: SubmissionType,
  category: 'status' | 'correction' | 'new_court' = 'status',
): Promise<FrequencyCheckResult> {
  const db = cloud.database()
  const now = new Date()

  // ---- 1. 冷却时间检查 ----
  const cooldownMin = COOLDOWN_MINUTES[category] ?? COOLDOWN_MINUTES.default
  const cooldownAgo = new Date(now.getTime() - cooldownMin * 60 * 1000)

  const recentQuery: Record<string, unknown> = {
    openid_hash: openidHash,
    submission_type: submissionType,
    created_at: db.command.gte(cooldownAgo),
  }
  if (courtId) {
    recentQuery.court_id = courtId
  }

  const { total: recentCount } = await db
    .collection('user_submissions')
    .where(recentQuery)
    .count()

  if (recentCount > 0) {
    return {
      allowed: false,
      cooldownSeconds: cooldownMin * 60,
      message: `请${cooldownMin}分钟后再提交同类反馈`,
    }
  }

  // ---- 2. 日限检查 ----
  const dailyLimit = DAILY_LIMITS[category]
  if (dailyLimit) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayQuery: Record<string, unknown> = {
      openid_hash: openidHash,
      created_at: db.command.gte(todayStart),
    }
    // 日限按大类统计（status 大类包含 open_normal / under_construction / temporarily_closed / cannot_enter）
    if (category === 'status') {
      todayQuery.submission_type = db.command.in([
        'open_normal',
        'under_construction',
        'temporarily_closed',
        'cannot_enter',
      ])
    } else {
      todayQuery.submission_type = submissionType
    }

    const { total: todayCount } = await db
      .collection('user_submissions')
      .where(todayQuery)
      .count()

    if (todayCount >= dailyLimit) {
      return {
        allowed: false,
        message: `今日反馈次数已达上限（${dailyLimit}次）`,
      }
    }
  }

  return { allowed: true }
}
