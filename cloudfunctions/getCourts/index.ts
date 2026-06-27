/**
 * getCourts — 球场列表查询（最核心云函数）
 * 支持：地理空间查询 + 运动类型筛选 + 状态筛选 + 多字段排序 + 分页
 * 始终按 pilot_area_id 过滤，防止跨区域数据泄露
 */
import { cloud } from 'wx-server-sdk'
import type {
  CFResponse,
  SportType,
  CourtStatus,
} from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ====== 类型 ======

interface EventData {
  location?: [number, number] // [lng, lat]
  radius?: number
  sportType?: SportType
  statuses?: CourtStatus[]
  sortBy?: 'distance' | 'status' | 'updated_at'
  page?: number
  pageSize?: number
  pilotAreaId: string
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

interface GetCourtsResult {
  list: CourtCardData[]
  total: number
  page: number
  pageSize: number
  fallbackLocation?: { lng: number; lat: number }
}

// ====== 状态排序优先级 ======

const STATUS_ORDER: Record<CourtStatus, number> = {
  under_construction: 0,
  temporarily_closed: 1,
  verified: 2,
  user_confirmed_available: 3,
  recent_user_feedback: 4,
  pending_confirmation: 5,
}

// ====== 运动类型中文映射 ======

const SPORT_LABELS: Record<string, string> = {
  basketball: '篮球',
  table_tennis: '乒乓球',
}

// ====== 主函数 ======

export async function main(
  event: { data: EventData },
): Promise<CFResponse<GetCourtsResult>> {
  const {
    location,
    radius = 5000,
    sportType,
    statuses,
    sortBy = 'status',
    page = 1,
    pageSize = 20,
    pilotAreaId,
  } = event.data || {}

  if (!pilotAreaId) {
    return { code: 1, message: '缺少 pilotAreaId' }
  }

  try {
    // ---- 构建基础查询条件 ----
    const baseWhere: Record<string, unknown> = {
      pilot_area_id: pilotAreaId,
      is_deleted: false,
    }

    if (sportType) {
      baseWhere.sport_types = sportType
    }

    if (statuses && statuses.length > 0) {
      baseWhere.current_status = _.in(statuses)
    }

    let courtDocs: any[] = []
    let total = 0

    // ---- 查询策略 ----
    if (location && location.length === 2) {
      // 有定位 → 地理空间查询
      const [lng, lat] = location

      try {
        // 使用 geoNear 聚合管线
        const { list } = await db
          .collection('courts')
          .where({
            ...baseWhere,
            location: _.geoNear({
              geometry: new db.Geo.Point(lng, lat),
              maxDistance: radius,
              minDistance: 0,
            }),
          })
          .get()

        // 计算距离并为每条记录附加 distance 字段
        courtDocs = list.map((doc: any) => ({
          ...doc,
          _distance: calcDistance(
            lat, lng,
            doc.location?.coordinates?.[1] || 0,
            doc.location?.coordinates?.[0] || 0,
          ),
        }))

        // 总数
        const { total: countRes } = await db
          .collection('courts')
          .where(baseWhere)
          .count()
        total = countRes

        // 按距离排序
        if (sortBy === 'distance') {
          courtDocs.sort((a: any, b: any) => a._distance - b._distance)
        }
      } catch {
        // geoNear 可能因索引未创建而失败 → 降级为全量查询
        const { list } = await db
          .collection('courts')
          .where(baseWhere)
          .get()
        courtDocs = list
        const { total: countRes } = await db
          .collection('courts')
          .where(baseWhere)
          .count()
        total = countRes
      }
    } else {
      // 无定位 → 普通查询
      const { list } = await db
        .collection('courts')
        .where(baseWhere)
        .get()
      courtDocs = list

      const { total: countRes } = await db
        .collection('courts')
        .where(baseWhere)
        .count()
      total = countRes
    }

    // ---- 排序 ----
    if (sortBy === 'status') {
      courtDocs.sort(
        (a: any, b: any) =>
          (STATUS_ORDER[a.current_status as CourtStatus] ?? 99) -
          (STATUS_ORDER[b.current_status as CourtStatus] ?? 99),
      )
    } else if (sortBy === 'updated_at' || (!location && sortBy !== 'distance')) {
      courtDocs.sort(
        (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    }

    // ---- 分页 ----
    const skip = (page - 1) * pageSize
    const pagedDocs = courtDocs.slice(skip, skip + pageSize)

    // ---- 映射为 CourtCardData ----
    const list: CourtCardData[] = pagedDocs.map((doc: any) => ({
      id: doc._id,
      name: doc.name,
      sportType: SPORT_LABELS[doc.sport_types?.[0]] || doc.sport_types?.[0] || '',
      status: doc.current_status,
      statusReason: doc.status_reason || '',
      distance: location ? doc._distance ?? null : null,
      dataSource: doc.data_source,
      latitude: doc.location?.coordinates?.[1] ?? 0,
      longitude: doc.location?.coordinates?.[0] ?? 0,
      isFavorited: false, // 收藏状态需单独查询
    }))

    return {
      code: 0,
      message: 'ok',
      data: {
        list,
        total,
        page,
        pageSize,
        fallbackLocation: location
          ? undefined
          : { lng: 113.82, lat: 36.08 }, // 林州市中心
      },
    }
  } catch (error) {
    console.error('[getCourts] 异常:', error)
    return { code: 99, message: '服务异常，请稍后重试' }
  }
}

// ====== 工具 ======

/** Haversine 公式计算两点距离（米） */
function calcDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}
