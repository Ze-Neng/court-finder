import { callFunction } from '../../services/api'
import { getStatusLabel, getStatusActionSuggestion } from '../../services/status'
import type { GetCourtDetailResult } from '../../typings/cloud-function'
import type { ToggleFavoriteResult } from '../../typings/cloud-function'

Page({
  data: {
    courtId: '',
    loading: true,
    error: '',
    // 球场数据
    name: '',
    address: '',
    sportType: '',
    status: 'pending_confirmation',
    statusLabel: '',
    actionSuggestion: '',
    statusReason: '',
    dataSource: '',
    openingHours: '',
    feeType: '',
    facilities: null as Record<string, unknown> | null,
    distance: null as number | null,
    latitude: 0,
    longitude: 0,
    lastVerifiedAt: '',
    lastUserReportAt: '',
    // 收藏
    isFavorited: false,
    favoriteLoading: false,
  },

  onLoad(options: Record<string, string>) {
    const courtId = options.id || ''
    this.setData({ courtId })
    this.loadDetail()
  },

  // ====== 加载详情 ======

  async loadDetail() {
    this.setData({ loading: true, error: '' })

    try {
      const res = await callFunction<GetCourtDetailResult>('getCourtDetail', {
        courtId: this.data.courtId,
      })

      if (res.code === 404) {
        this.setData({ loading: false, error: res.message || '该球场暂不可查看' })
        return
      }

      if (res.code === 0 && res.data?.court) {
        const c = res.data.court
        this.setData({
          loading: false,
          name: c.name,
          address: c.address,
          sportType: c.sportType,
          status: c.status,
          statusLabel: getStatusLabel(c.status),
          actionSuggestion: getStatusActionSuggestion(c.status),
          statusReason: c.statusReason,
          dataSource: c.dataSource,
          openingHours: c.openingHours || '',
          feeType: c.feeType,
          facilities: c.facilities || null,
          distance: c.distance,
          latitude: c.location?.coordinates?.[1] || 0,
          longitude: c.location?.coordinates?.[0] || 0,
          lastVerifiedAt: c.lastVerifiedAt || '',
          lastUserReportAt: c.lastUserReportAt || '',
          isFavorited: c.isFavorited,
        })
      } else {
        this.setData({ loading: false, error: res.message || '加载失败' })
      }
    } catch {
      this.setData({ loading: false, error: '网络连接失败' })
    }
  },

  // ====== 收藏 ======

  async onToggleFavorite() {
    if (this.data.favoriteLoading) return
    this.setData({ favoriteLoading: true })

    // 乐观更新
    const prev = this.data.isFavorited
    this.setData({ isFavorited: !prev })

    try {
      const res = await callFunction<ToggleFavoriteResult>('toggleFavorite', {
        courtId: this.data.courtId,
      })
      if (res.code === 0 && res.data) {
        this.setData({ isFavorited: res.data.favorited, favoriteLoading: false })
        wx.showToast({
          title: res.data.favorited ? '已收藏' : '已取消收藏',
          icon: 'none',
        })
      } else {
        // 回滚
        this.setData({ isFavorited: prev, favoriteLoading: false })
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    } catch {
      this.setData({ isFavorited: prev, favoriteLoading: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    }
  },

  // ====== 导航 ======

  onNavigate() {
    const { name, address, latitude, longitude } = this.data
    if (!latitude || !longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' })
      return
    }
    wx.openLocation({ latitude, longitude, name, address, scale: 16 })
  },

  // ====== 反馈 ======

  onReport() {
    wx.navigateTo({ url: `/pages/report-entry/index?courtId=${this.data.courtId}` })
  },

  onRetry() {
    this.loadDetail()
  },
})
