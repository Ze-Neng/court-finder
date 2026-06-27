import { getStatusColor, getStatusLabel } from '../../services/status'
import type { CourtStatus } from '../../typings/court'

Component({
  properties: {
    status: {
      type: String,
      value: 'pending_confirmation' as CourtStatus,
    },
    size: {
      type: String,
      value: 'default' as 'small' | 'default',
    },
  },

  computed: {},

  observers: {
    'status, size'(status: CourtStatus) {
      this.setData({
        statusColor: getStatusColor(status),
        statusLabel: getStatusLabel(status),
        isSmall: this.data.size === 'small',
      })
    },
  },

  data: {
    statusColor: 'orange',
    statusLabel: '加载中',
    isSmall: false,
  },
})
