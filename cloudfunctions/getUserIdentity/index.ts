/**
 * getUserIdentity — 匿名身份标识
 * wx.login code → cloud.getWXContext().OPENID → SHA256 hash
 * 不存储、不传输原始 openid
 */
import { cloud } from 'wx-server-sdk'
import { generateOpenidHash } from '../common/utils'
import type { CFResponse } from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

interface EventData {
  code: string
}

interface ResultData {
  openidHash: string
}

export async function main(
  event: { data: EventData },
): Promise<CFResponse<ResultData>> {
  const { code } = event.data

  if (!code) {
    return { code: 1, message: '缺少登录凭证 code' }
  }

  try {
    // 获取微信用户的 openid
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return { code: 2, message: '获取 OpenID 失败' }
    }

    // 生成匿名 hash（原始 openid 不存储、不传输）
    const openidHash = generateOpenidHash(openid)

    return {
      code: 0,
      message: 'ok',
      data: { openidHash },
    }
  } catch (error) {
    console.error('[getUserIdentity] 异常:', error)
    return { code: 99, message: '服务异常，请稍后重试' }
  }
}
