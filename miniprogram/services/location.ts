/**
 * 定位服务
 * — wx.getLocation 获取用户位置
 * — 用户拒绝时静默返回 null（不弹错误、不循环请求）
 * — 同意后缓存到 app.globalData
 * — 提供试点区域中心兜底坐标
 */

import { PILOT_AREA } from '../utils/constants'

/**
 * 获取用户位置
 * — 首次调用触发微信定位授权弹窗
 * — 用户已拒绝时静默返回 null
 *
 * @returns 用户位置 { lng, lat }，拒绝/失败时返回 null
 */
export function getLocation(): Promise<{ lng: number; lat: number } | null> {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02', // 国测局坐标系，与腾讯地图一致
      success: (res) => {
        const location = { lng: res.longitude, lat: res.latitude }
        // 缓存到全局
        const app = getApp<IAppOption>()
        app.globalData.userLocation = location
        app.globalData.isLocationFallback = false
        resolve(location)
      },
      fail: (err) => {
        console.warn('[location] 获取位置失败:', err.errMsg)

        // 用户拒绝授权 → 静默返回 null，使用兜底坐标
        if (
          err.errMsg?.includes('auth deny') ||
          err.errMsg?.includes('authorize')
        ) {
          const app = getApp<IAppOption>()
          app.globalData.userLocation = null
          app.globalData.isLocationFallback = true
          resolve(null)
          return
        }

        // 其他异常（如 GPS 信号弱）→ 也返回 null
        resolve(null)
      },
    })
  })
}

/**
 * 获取兜底坐标
 * — 试点区域：林州市中心
 * — 用于未定位时展示默认地图视图
 */
export function getFallbackCenter(): { lng: number; lat: number } {
  return { ...PILOT_AREA.center }
}

/**
 * 打开微信系统设置页，引导用户手动开启定位权限
 * — 仅在用户已拒绝定位时调用
 * — 不可直接再次调用 wx.getLocation()
 */
export function openLocationSetting(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.openSetting({
      success: (res) => {
        // 检查用户是否开启了定位权限
        const locationGranted = !!res.authSetting['scope.userLocation']
        if (locationGranted) {
          // 权限已开启，重新获取位置
          const app = getApp<IAppOption>()
          app.globalData.isLocationFallback = false
        }
        resolve(locationGranted)
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

// ====== 全局类型声明 ======

interface IAppOption {
  globalData: {
    openidHash: string
    userLocation: { lng: number; lat: number } | null
    isLocationFallback: boolean
  }
}
