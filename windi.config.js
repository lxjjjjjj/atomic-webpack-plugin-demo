const { defineConfig } = require('windicss/helpers')
module.exports = defineConfig({
  // attributify: {
  //   prefix: 'didi'
  // },
  extract: {
    include: ['src/subpackage/home/**/*.mpx', 'src/subpackage/sidebar/**/*.mpx', 'src/subpackage/home/app.mpx', 'src/subpackage/sidebar/app.mpx'], // dist/wx-mini/sidebar/**/**/*.mpx.wxml
    exclude: ['node_modules', '.git']
  },
  theme: {
    extend: {
      padding: {
        105: '105px',
        15: '15px',
        5: '5px',
        4: '4px',
        10: '10px'
      },
      fontFamily: {
        pingfangsc: {
          semi: 'PingFangSC-Semibold',
          regular: 'PingFangSC-Regular'
        }
      },
      textColor: {
        gray: '#999',
        primary: {
          sidebar: '#757575'
        }
      },
      fontSize: {
        '105rpx': '105rpx',
        '14px': '14px',
        '9px': '9px',
        '24rpx': '24rpx',
        '20rpx': '20rpx'
      },
      lineHeight: {
        32: '32px',
        14: '14px',
        1: '1px'
      },
      height: {
        101: '101px',
        80: '80px',
        90: '90px',
        5: '5px',
        14: '14px'
      },
      width: {
        101: '101px',
        5: '5px'
      },
      inset: {
        2: '2px',
        '-6px': '-6px',
        '-15px': '-15px'
      },
      borderWidth: {
        1: '1px'
      },
      borderColor: {
        slate: '#f0f0f0'
      },
      borderRadius: {
        50: '50%',
        7: '7px'
      },
      backgroundColor: {
        primary: {
          light: '#FF5C1B',
          red: '#ff0000'
        }
      },
      maxWidth: {
        4: '4em',
        6: '6em'
      },
      backgroundImage: {
        basegrid: 'linear-gradient(179deg, #FF8635 0%, #FF5C1B 100%)'
      }
    }
  },
  shortcuts: {
    'flex-space-between': 'flex justify-between'
  },
  plugins: []
})
