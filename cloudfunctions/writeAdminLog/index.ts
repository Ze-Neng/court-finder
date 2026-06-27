/**
 * writeAdminLog — 管理员操作审计日志
 * 内部云函数，由其他管理员云函数通过 cloud.callFunction 调用
 * 不对外暴露 HTTP 触发器
 */
import { cloud } from 'wx-server-sdk'
import type { CFResponse } from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ====== 类型 ======

interface EventData {
  adminOpenid: string
  actionType: string
  targetCollection: string
  targetId: string
  courtId?: string
  submissionId?: string
  beforeData: Record<string, unknown>
  afterData: Record<string, unknown>
  reason: string
}

interface WriteResult {
  logId: string
}

// ====== 主函数 ======

export async function main(
  event: { data: EventData },
): Promise<CFResponse<WriteResult>> {
  const {
    adminOpenid,
    actionType,
    targetCollection,
    targetId,
    courtId,
    submissionId,
    beforeData,
    afterData,
    reason,
  } = event.data || {}

  // ---- 参数校验 ----
  if (!adminOpenid || !actionType || !targetCollection || !targetId) {
    return {
      code: 1,
      message: '缺少必填参数：adminOpenid, actionType, targetCollection, targetId',
    }
  }

  try {
    const res = await db.collection('admin_logs').add({
      data: {
        admin_openid: adminOpenid,
        action_type: actionType,
        target_collection: targetCollection,
        target_id: targetId,
        court_id: courtId || null,
        submission_id: submissionId || null,
        before_data: beforeData || {},
        after_data: afterData || {},
        reason: reason || '',
        created_at: new Date(),
      },
    })

    return {
      code: 0,
      message: 'ok',
      data: { logId: res._id },
    }
  } catch (error) {
    console.error('[writeAdminLog] 写入异常:', error)
    // 审计日志写入失败不应阻塞主流程，但仍返回错误
    return { code: 99, message: '审计日志写入失败' }
  }
}
