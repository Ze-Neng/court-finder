/**
 * 微信内容安全检测
 * — 云函数侧调用 cloud.openapi.security.msgSecCheck
 * — 接口异常时返回 security_pending_review，不默认放行
 */
import { cloud } from 'wx-server-sdk'
import type { SecurityStatus } from './types'

export interface ContentCheckResult {
  status: SecurityStatus
  /** 微信检测 traceId，security_passed/security_rejected 时有值 */
  traceId?: string
  /** 检测失败原因（security_rejected 时）或异常信息（security_pending_review 时） */
  detail?: string
}

/**
 * 对用户提交文本进行内容安全检测
 *
 * @param content 用户提交的文本内容
 * @param openid  用户 openid（微信内容安全接口要求）
 * @returns 检测结果：passed / rejected / pending_review
 */
export async function checkContentSecurity(
  content: string,
  openid: string,
): Promise<ContentCheckResult> {
  // 空内容直接放行（选填字段）
  if (!content || !content.trim()) {
    return { status: 'security_passed' }
  }

  try {
    const result = await cloud.openapi.security.msgSecCheck({
      openid,
      scene: 2, // 用户评论/反馈场景
      version: 2,
      content,
    })

    if (result.errCode === 0) {
      return {
        status: 'security_passed',
        traceId: (result as { checkId?: string }).checkId,
      }
    }

    // 内容违规
    return {
      status: 'security_rejected',
      detail: result.errMsg || '内容包含违规信息',
    }
  } catch (error) {
    // 安全接口超时、网络异常或官方服务异常
    // 不得默认放行 → 进入 security_pending_review
    console.error('内容安全检测异常:', error)
    const errMsg = error instanceof Error ? error.message : String(error)

    return {
      status: 'security_pending_review',
      detail: `内容安全接口异常: ${errMsg}`,
    }
  }
}
