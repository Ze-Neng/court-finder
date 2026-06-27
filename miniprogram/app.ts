import { login } from './services/auth'

App({
  globalData: {
    openidHash: '',
    userLocation: null as { lng: number; lat: number } | null,
    isLocationFallback: false,
    pilotAreaId: 'linzhou',
  },

  onLaunch() {
    wx.cloud.init({
      env: '{{CLOUDBASE_ENV_ID}}',
    })
    this.initAuth()
  },

  async initAuth() {
    try {
      await login()
      console.log('[app] auth ok')
    } catch (err) {
      console.warn('[app] auth failed:', err)
    }
  },
})
