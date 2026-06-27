/**
 * getCourtDetail — 单球场详情
 * 校验软删除、计算距离、返回完整 CourtDetailData
 */
import { cloud } from 'wx-server-sdk'
import type { CFResponse } from '../common/types'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ====== 类型 ======

interface EventData {
  courtId: string
  userLocation?: [number, number] // [lng, lat]
}

interface CourtDetailData {
  id: string
  name: string
  sportType: string
  status: string
  statusReason: string
  distance: number | null
  dataSource: string
  isFavorited: boolean
  address: string
  location: { type: string; coordinates: [number, number] }
  openingHours?: string
  feeType: string
  facilities?: Record<string, unknown>
  lastVerifiedAt?: string
  lastUserReportAt?: string
}

const SPORT_LABELS: Record<string, string> = {
  basketball: '篮球',
  table_tennis: '乒乓球',
}

// ====== 主函数 ======

export async function main(
  event: { data: EventData },
): Promise<CFResponse<{ court: CourtDetailData }>> {
  const { courtId, userLocation } = event.data || {}

  if (!courtId) {
    return { code: 1, message: '缺少 courtId' }
  }

  try {
    const { data: doc } = await db
      .collection('courts')
      .doc(courtId)
      .get()

    // 球场不存在
    if (!doc) {
      return { code: 404, message: '球场不存在' }
    }

    // 已删除
    if (doc.is_deleted) {
      return { code: 404, message: '该球场暂不可查看' }
    }

    // 计算距离
    let distance: number | null = null
    if (
      userLocation &&
      userLocation.length === 2 &&
      doc.location?.coordinates
    ) {
      const [userLng, userLat] = userLocation
      const [courtLng, courtLat] = doc.location.coordinates
      distance = haversineDistance(userLat, userLng, courtLat, courtLng)
    }

    const court: CourtDetailData = {
      id: doc._id,
      name: doc.name,
      sportType:
        SPORT_LABELS[doc.sport_types?.[0]] || doc.sport_types?.[0] || '',
      status: doc.current_status,
      statusReason: doc.status_reason || '',
      distance,
      dataSource: doc.data_source,
      isFavorited: false, // 收藏状态需单独查询
      address: doc.address,
      location: doc.location,
      openingHours: doc.opening_hours,
      feeType: doc.fee_type,
      facilities: doc.facilities,
      lastVerifiedAt: doc.last_verified_at,
      lastUserReportAt: doc.last_user_report_at,
    }

    return {
      code: 0,
      message: 'ok',
      data: { court },
    }
  } catch (error) {
    console.error('[getCourtDetail] 异常:', error)
    return { code: 99, message: '服务异常，请稍后重试' }
  }
}

// ====== 工具 ======

function haversineDistance(
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
