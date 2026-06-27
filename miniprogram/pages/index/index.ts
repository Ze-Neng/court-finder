import { callFunction } from '../../services/api'
import { getLocation } from '../../services/location'
import { getStatusColor } from '../../services/status'
import { PILOT_AREA, MAP } from '../../utils/constants'
import type { CourtCardData } from '../../typings/court'
import type { GetCourtsResult } from '../../typings/cloud-function'

// ====== 页面实例类型 ======

interface FilterState {
  sportType: string
  statusGroup: string
}

interface PageData {
  mode: 'map' | 'list'
  courts: CourtCardData[]
  currentIndex: number
  loading: boolean
  error: string
  hasLocation: boolean
  mapCenter: { longitude: number; latitude: number }
  mapScale: number
  markers: WechatMiniprogram.MapMarker[]
  filterVisible: boolean
  filters: FilterState
}

// ====== Marker 颜色映射 ======

const MARKER_BG: Record<string, string> = {
  green: '#07c160',
  orange: '#fa9d3b',
  red: '#ee3f3f',
}

// ====== 页面 ======

Page<PageData>({
  _isUserGesture: false,

  data: {
    mode: 'map',
    courts: [],
    currentIndex: 0,
    loading: true,
    error: '',
    hasLocation: false,
    mapCenter: { longitude: PILOT_AREA.center.lng, latitude: PILOT_AREA.center.lat },
    mapScale: MAP.DEFAULT_ZOOM,
    markers: [],
    filterVisible: false,
    filters: { sportType: '', statusGroup: '' },
  },

  // ====== 生命周期 ======

  onLoad() {
    this.initPage()
  },

  async initPage() {
    this.setData({ loading: true, error: '' })
    try {
      const loc = await getLocation()
      this.setData({
        hasLocation: !!loc,
        mapCenter: loc
          ? { longitude: loc.lng, latitude: loc.lat }
          : this.data.mapCenter,
      })
      await this.loadCourts()
    } catch {
      this.setData({ error: '网络连接失败', loading: false })
    }
  },

  // ====== 数据加载 ======

  async loadCourts() {
    this.setData({ loading: true })
    const { hasLocation } = this.data

    try {
      const res = await callFunction<GetCourtsResult>('getCourts', {
        pilotAreaId: PILOT_AREA.id,
        page: 1,
        pageSize: 50,
        radius: MAP.DEFAULT_RADIUS,
        sortBy: hasLocation ? 'distance' : 'status',
        sportType: this.data.filters.sportType || undefined,
        statuses: this.getStatusFilter(),
      })

      if (res.code === 0 && res.data) {
        this.setData({
          courts: res.data.list,
          currentIndex: 0,
          loading: false,
          markers: this.buildMarkers(res.data.list),
        })
      } else {
        this.setData({ courts: [], markers: [], loading: false, error: res.message || '加载失败' })
      }
    } catch {
      this.setData({ loading: false, error: '网络连接失败' })
    }
  },

  /** 状态分组 → getCourts 的 statuses 参数 */
  getStatusFilter(): string[] | undefined {
    const g = this.data.filters.statusGroup
    if (!g) return undefined
    switch (g) {
      case 'go':
        return ['verified', 'user_confirmed_available', 'recent_user_feedback']
      case 'caution':
        return ['pending_confirmation']
      case 'stop':
        return ['under_construction', 'temporarily_closed']
      default:
        return undefined
    }
  },

  // ====== Marker 构建 ======

  buildMarkers(courts: CourtCardData[]): WechatMiniprogram.MapMarker[] {
    return courts.map((c, i) => {
      const color = getStatusColor(c.status)
      const bg = MARKER_BG[color] || '#999'
      return {
        id: i + 1,
        latitude: c.latitude,
        longitude: c.longitude,
        width: 1,  // 隐藏默认图标
        height: 1,
        // 使用 label 显示圆形彩色标记（无需图片资源）
        label: {
          content: c.sportType === '乒乓球' ? '乒' : '🏀',
          color: '#ffffff',
          fontSize: 14,
          x: 16,
          y: 0,
          bgColor: bg,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: '#ffffff',
          anchorX: 16,
          anchorY: 16,
        } as WechatMiniprogram.MapLabel,
        // callout: 点击时显示球场名
        callout: {
          content: c.name,
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          padding: 8,
          bgColor: '#ffffff',
          display: 'BYCLICK',
        },
      }
    })
  },

  // ====== 地图手势防死循环 ======

  onMapRegionChange(e: WechatMiniprogram.MapRegionChange) {
    if (e.type === 'begin' && e.causedBy === 'gesture') {
      this._isUserGesture = true
      return
    }
    if (e.type === 'end' && this._isUserGesture) {
      this._isUserGesture = false
      this.loadCourts()
    }
  },

  /** 点击 Marker → 底部卡片联动 */
  onMarkerTap(e: WechatMiniprogram.MapMarkerTap) {
    const idx = e.detail.markerId - 1
    if (idx >= 0 && idx < this.data.courts.length) {
      this.setData({ currentIndex: idx })
    }
  },

  // ====== 底部卡片 ======

  onSwiperChange(e: WechatMiniprogram.SwiperChange) {
    this.setData({ currentIndex: e.detail.current })
  },

  onCardTap() {
    const court = this.data.courts[this.data.currentIndex]
    if (court) {
      wx.navigateTo({ url: `/pages/court-detail/index?id=${court.id}` })
    }
  },

  // ====== 模式切换 ======

  onToggleMode() {
    this.setData({ mode: this.data.mode === 'map' ? 'list' : 'map' })
  },

  // ====== 筛选 ======

  onToggleFilter() {
    this.setData({ filterVisible: !this.data.filterVisible })
  },

  onFilterClose() {
    this.setData({ filterVisible: false })
  },

  onSportTypeSelect(e: WechatMiniprogram.TouchEvent) {
    const t = e.currentTarget.dataset.type || ''
    this.setData({ 'filters.sportType': t === this.data.filters.sportType ? '' : t })
  },

  onStatusGroupSelect(e: WechatMiniprogram.TouchEvent) {
    const g = e.currentTarget.dataset.group || ''
    this.setData({ 'filters.statusGroup': g === this.data.filters.statusGroup ? '' : g })
  },

  onFilterApply() {
    this.setData({ filterVisible: false })
    this.loadCourts()
  },

  onFilterReset() {
    this.setData({ filters: { sportType: '', statusGroup: '' }, filterVisible: false })
    this.loadCourts()
  },

  // ====== 定位重试 ======

  async onRequestLocation() {
    const loc = await getLocation()
    if (loc) {
      this.setData({
        hasLocation: true,
        mapCenter: { longitude: loc.lng, latitude: loc.lat },
      })
      this.loadCourts()
    } else {
      wx.openSetting({})
    }
  },

  onRetry() {
    this.initPage()
  },
})
