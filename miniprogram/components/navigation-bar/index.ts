Component({
  properties: {
    title: {
      type: String,
      value: '寻觅球场',
    },
    showBack: {
      type: Boolean,
      value: true,
    },
    backgroundColor: {
      type: String,
      value: '#ffffff',
    },
  },

  methods: {
    onBackTap() {
      wx.navigateBack({ delta: 1 })
    },
  },
})
