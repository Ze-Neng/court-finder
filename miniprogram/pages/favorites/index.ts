import { callFunction } from '../../services/api'
import type { GetCourtsResult } from '../../typings/cloud-function'

Page({
  data: {
    loading: true,
    error: '',
    list: [] as Array<{
      id: string
      name: string
      sportType: string
      status: string
      statusReason: string
    }>,
  },

  onLoad() {
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadFavorites() {
    this.setData({ loading: true, error: '' })

    try {
      const res = await callFunction<GetCourtsResult>('getFavorites', {
        page: 1,
        pageSize: 50,
      })

      if (res.code === 0 && res.data) {
        this.setData({ list: res.data.list as any[], loading: false })
      } else {
        this.setData({ loading: false, error: res.message || '加载失败' })
      }
    } catch {
      this.setData({ loading: false, error: '网络连接失败' })
    }
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/court-detail/index?id=${id}` })
    }
  },

  onGoFind() {
    wx.navigateTo({ url: '/pages/index/index' })
  },

  onRetry() {
    this.loadFavorites()
  },
})
