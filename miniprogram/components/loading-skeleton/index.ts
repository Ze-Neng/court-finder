Component({
  properties: {
    type: {
      type: String,
      value: 'list' as 'card' | 'list' | 'detail',
    },
    count: {
      type: Number,
      value: 3,
    },
  },

  computed: {},

  observers: {
    count(val: number) {
      this.setData({ rows: Array.from({ length: val }, (_, i) => i) })
    },
  },

  data: {
    rows: [0, 1, 2],
  },

  lifetimes: {
    attached() {
      this.setData({ rows: Array.from({ length: this.data.count }, (_, i) => i) })
    },
  },
})
