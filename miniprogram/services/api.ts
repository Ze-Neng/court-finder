/**
 * 云函数调用封装
 * — 统一调用 wx.cloud.callFunction
 * — 统一错误处理（网络失败、超时、云函数异常）
 * — 返回标准化 CFResponse<T>
 */
import type { CFResponse } from '../typings/cloud-function'

/** 调用超时时间（ms） */
const CALL_TIMEOUT = 15000

/**
 * 调用云函数
 * @param name 云函数名称
 * @param data 请求参数
 * @returns CFResponse<T> 标准化响应
 */
export function callFunction<T = undefined>(
  name: string,
  data: Record<string, unknown> = {},
): Promise<CFResponse<T>> {
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res: WechatMiniprogram.Cloud.CallFunctionResult) => {
        const result = res.result as CFResponse<T>
        resolve(result)
      },
      fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
        console.error(`[callFunction] ${name} 调用失败:`, err)

        // 网络异常
        if (err.errMsg?.includes('fail') || err.errMsg?.includes('timeout')) {
          resolve({
            code: -1,
            message: `网络异常，请检查网络后重试`,
          })
          return
        }

        resolve({
          code: -1,
          message: `服务异常，请稍后重试`,
        })
      },
    })

    // 超时保护（wx.cloud.callFunction 无原生 timeout 参数，手动兜底）
    setTimeout(() => {
      resolve({
        code: -2,
        message: `请求超时，请重试`,
      })
    }, CALL_TIMEOUT)
  })
}
