/**
 * toggleFavorite — 收藏/取消收藏（幂等 toggle）
 * 存在 → 删除（取消收藏） | 不存在 → 插入（添加收藏）
 */
import { cloud } from 'wx-server-sdk'
import { generateOpenidHash } from '../common/utils'
import type { CFResponse } from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

interface EventData {
  courtId: string
}

interface ResultData {
  favorited: boolean
}

export async function main(
  event: { data: EventData },
): Promise<CFResponse<ResultData>> {
  const { courtId } = event.data || {}

  if (!courtId) {
    return { code: 1, message: '缺少 courtId' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return { code: 2, message: '获取用户身份失败' }
    }

    const openidHash = generateOpenidHash(openid)

    // 查询是否已收藏
    const { data: existing } = await db
      .collection('favorites')
      .where({ openid_hash: openidHash, court_id: courtId })
      .get()

    if (existing && existing.length > 0) {
      // 已收藏 → 取消收藏
      await db.collection('favorites').doc(existing[0]._id).remove()
      return { code: 0, message: 'ok', data: { favorited: false } }
    }

    // 未收藏 → 添加收藏
    await db.collection('favorites').add({
      data: {
        openid_hash: openidHash,
        court_id: courtId,
        created_at: new Date(),
      },
    })

    return { code: 0, message: 'ok', data: { favorited: true } }
  } catch (error) {
    console.error('[toggleFavorite] 异常:', error)
    return { code: 99, message: '服务异常，请稍后重试' }
  }
}
