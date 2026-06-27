const ERROR_CONFIG: Record<string, { icon: string; defaultMessage: string }> = {
  network: { icon: '📡', defaultMessage: '网络连接失败' },
  server: { icon: '🔧', defaultMessage: '服务暂不可用' },
  permission: { icon: '🔒', defaultMessage: '需要授权才能使用' },
  empty: { icon: '📋', defaultMessage: '暂无相关内容' },
}

Component({
  properties: {
    type: {
      type: String,
      value: 'network' as 'network' | 'server' | 'permission' | 'empty',
    },
    message: {
      type: String,
      value: '',
    },
    retryText: {
      type: String,
      value: '重新加载',
    },
  },

  data: {
    displayIcon: '📡',
    displayMessage: '网络连接失败',
  },

  observers: {
    'type, message'(type: keyof typeof ERROR_CONFIG, msg: string) {
      const config = ERROR_CONFIG[type] || ERROR_CONFIG.network
      this.setData({
        displayIcon: config.icon,
        displayMessage: msg || config.defaultMessage,
      })
    },
  },

  methods: {
    onRetryTap() {
      this.triggerEvent('retry')
    },
  },
})
