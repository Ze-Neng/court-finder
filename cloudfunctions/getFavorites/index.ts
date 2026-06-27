/**
 * getFavorites — 用户收藏列表查询
 * 批量查询法院，自动清理已删除球场的无效收藏
 */
import { cloud } from 'wx-server-sdk'
import { generateOpenidHash } from '../common/utils'
import type { CFResponse } from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

interface EventData {
  page?: number
  pageSize?: number
}

interface CourtCardData {
  id: string
  name: string
  sportType: string
  status: string
  statusReason: string
  distance: number | null
  dataSource: string
  isFavorited: boolean
  latitude: number
  longitude: number
}

interface GetFavoritesResult {
  list: CourtCardData[]
  total: number
  page: number
  pageSize: number
}

const SPORT_LABELS: Record<string, string> = {
  basketball: '篮球',
  table_tennis: '乒乓球',
}

export async function main(
  event: { data: EventData },
): Promise<CFResponse<GetFavoritesResult>> {
  const { page = 1, pageSize = 50 } = event.data || {}

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { code: 2, message: '获取用户身份失败' }
    }

    const openidHash = generateOpenidHash(openid)

    // 1. 查询收藏记录（按时间降序）
    const { data: favList } = await db
      .collection('favorites')
      .where({ openid_hash: openidHash })
      .orderBy('created_at', 'desc')
      .get()

    if (!favList || favList.length === 0) {
      return {
        code: 0, message: 'ok',
        data: { list: [], total: 0, page, pageSize },
      }
    }

    // 2. 收集 court_id 列表，批量查询法院（非逐个 doc().get()）
    const courtIds = favList.map((f: any) => f.court_id).filter(Boolean)
    const { data: courts } = await db
      .collection('courts')
      .where({ _id: _.in(courtIds) })
      .get()

    const courtMap = new Map<string, any>()
    const deletedIds = new Set<string>()
    if (courts) {
      for (const c of courts) {
        if (c.is_deleted) {
          deletedIds.add(c._id)
        } else {
          courtMap.set(c._id, c)
        }
      }
    }

    // 3. 清理已删除球场的无效收藏
    const invalidFavs = favList.filter((f: any) => {
      const cid = f.court_id
      return !courtMap.has(cid)  // 球场不存在或已删除
    })
    if (invalidFavs.length > 0) {
      await Promise.all(
        invalidFavs.map((f: any) =>
          db.collection('favorites').doc(f._id).remove().catch(() => {}),
        ),
      )
    }

    // 4. 按收藏顺序映射为 CourtCardData
    const allList: CourtCardData[] = []
    for (const fav of favList) {
      const court = courtMap.get(fav.court_id)
      if (!court) continue
      allList.push({
        id: court._id,
        name: court.name,
        sportType: SPORT_LABELS[court.sport_types?.[0]] || court.sport_types?.[0] || '',
        status: court.current_status,
        statusReason: court.status_reason || '',
        distance: null,
        dataSource: court.data_source,
        isFavorited: true,
        latitude: court.location?.coordinates?.[1] ?? 0,
        longitude: court.location?.coordinates?.[0] ?? 0,
      })
    }

    // 5. 分页
    const total = allList.length
    const skip = (page - 1) * pageSize
    const list = allList.slice(skip, skip + pageSize)

    return {
      code: 0, message: 'ok',
      data: { list, total, page, pageSize },
    }
  } catch (error) {
    console.error('[getFavorites] 异常:', error)
    return { code: 99, message: '服务异常，请稍后重试' }
  }
}
