/**
 * 匿名身份服务
 * — wx.login → callFunction('getUserIdentity') → 获取 openid_hash
 * — 结果缓存到 app.globalData
 */

import { callFunction } from './api'
import type { GetUserIdentityResult } from '../typings/cloud-function'

/** 重试次数 */
const MAX_RETRIES = 1

/**
 * 微信静默登录，获取匿名标识 openid_hash
 * — 无需用户点击、无需授权手机号/昵称/头像
 * — 登录失败时重试一次
 *
 * @returns openid_hash
 * @throws 重试后仍失败则抛出异常
 */
export async function login(): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. 调用微信登录接口获取 code
      const loginRes = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>(
        (resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject,
          })
        },
      )

      // 2. 将 code 传给云函数，云函数内部调用 cloud.getWXContext() 获取 openid
      const res = await callFunction<GetUserIdentityResult>('getUserIdentity', {
        code: loginRes.code,
      })

      if (res.code === 0 && res.data?.openidHash) {
        const { openidHash } = res.data
        // 缓存到全局
        const app = getApp<IAppOption>()
        app.globalData.openidHash = openidHash
        return openidHash
      }

      // 云函数返回异常
      lastError = new Error(res.message || '获取身份失败')
    } catch (err) {
      lastError = err
    }

    // 重试前短暂等待
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  throw lastError || new Error('登录失败，请稍后重试')
}

// ====== 全局类型声明 ======

interface IAppOption {
  globalData: {
    openidHash: string
    userLocation: { lng: number; lat: number } | null
    isLocationFallback: boolean
  }
}
