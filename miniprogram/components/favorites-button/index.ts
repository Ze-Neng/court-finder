import { callFunction } from '../../services/api'
import type { ToggleFavoriteResult } from '../../typings/cloud-function'

Component({
  properties: {
    courtId: { type: String, value: '' },
    isFavorited: { type: Boolean, value: false },
  },

  data: {
    loading: false,
  },

  methods: {
    async onToggle() {
      if (this.data.loading || !this.properties.courtId) return
      this.setData({ loading: true })

      const prev = this.properties.isFavorited

      // 乐观更新：立即切换，触发事件通知父组件
      this.triggerEvent('toggle', { favorited: !prev })

      try {
        const res = await callFunction<ToggleFavoriteResult>('toggleFavorite', {
          courtId: this.properties.courtId,
        })
        if (res.code === 0 && res.data) {
          this.triggerEvent('toggle', { favorited: res.data.favorited })
          wx.showToast({
            title: res.data.favorited ? '已收藏' : '已取消收藏',
            icon: 'none',
          })
        } else {
          // 失败回滚
          this.triggerEvent('toggle', { favorited: prev })
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      } catch {
        this.triggerEvent('toggle', { favorited: prev })
        wx.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },
  },
})
