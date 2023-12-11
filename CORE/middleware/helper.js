const multer = require('multer')
const fs = require('fs-extra')
const AWS = require('aws-sdk')
const multerS3 = require('multer-s3')
var path = require('path')

// AWS Configuration key
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
})

// Clisha Chrome extension short code
const extentionCode = [
  '7e6dtw78egubdihisudjxhbijskhduhjnfc',
  'rtyfghvd6tygsdyghbdghdcghjbhjdbcjhnd',
  'ws6d7tygvwsf7yduhsudghjbduhcbjwsde',
  'w76tegfdeysbhd7ysgedbygwuysdgbduhyhd',
  'wshiudjmhygbhnjukvctyvhbjnihuvgfbj',
]

const pagination = (page = 1, sortBy = 'createdAt') => {
  const limit = 10
  const offset = (page - 1) * limit
  const order = [[sortBy, 'DESC']]
  return { limit, offset, order }
}

const getPagination = (page, size) => {
  const limit = size ? +size : 10
  const offset = page ? (page - 1) * limit : limit

  return { limit, offset }
}

const getPagingData = (data, page, limit, modelName) => {
  const { count: totalItems, rows } = data
  const currentPage = page ? +page : 0
  const totalPages = Math.ceil(totalItems / limit)

  return { totalItems, [modelName]: rows, totalPages, currentPage }
}

const relativeDifference = function (a, b) {
  return 100 * Math.abs((a - b) / ((a + b) / 2))
}

const percentageDifference = function (a, b) {
  return (b / a) * 100 - 100
}

const findOcc = (arr, key) => {
  let arr2 = []

  arr.forEach((x) => {
    // Checking if there is any object in arr2
    // which contains the key value
    if (
      arr2.some((val) => {
        return val[key] === x[key]
      })
    ) {
      // If yes! then increase the occurrence by 1
      arr2.forEach((k) => {
        if (k[key] === x[key]) {
          k['occurrence']++
        }
      })
    } else {
      // If not! Then create a new object initialize
      // it with the present iteration key's value and
      // set the occurrence to 1
      let a = {}
      a[key] = x[key]
      a.data = x
      a['occurrence'] = 1
      arr2.push(a)
    }
  })

  return arr2
}

const setRankName = (point) => {
  let rank = 'Adstar Bronze'
  if (point <= 1000) {
    rank = 'Adstar Bronze'
  } else if (point >= 1001 || point >= 2000) {
    rank = 'Adstar Silver'
  } else if (point >= 2001 || point >= 3000) {
    rank = 'Adstar Gold'
  } else if (point >= 3001 || point >= 4000) {
    rank = 'Adstar Platinum'
  } else if (point >= 4001 || point >= 5000) {
    rank = 'Adstar Diamond'
  } else if (point >= 5001 || point >= 6000) {
    rank = 'Adstar Master'
  } else if (point >= 6001) {
    rank = 'Adstar GrandMaster'
  }
  return rank
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path = './assets/profile'
    fs.mkdirsSync(path)
    cb(null, path)
  },
  filename: function (req, file, cb) {
    cb(
      null,
      (Math.random() + 1).toString(36).substring(4) + '-' + Date.now() + '.jpg'
    )
  },
})

const companyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // console.log(req)
    let path = './assets/company'
    fs.mkdirsSync(path)
    cb(null, path)
  },
  filename: function (req, file, cb) {
    cb(
      null,
      (Math.random() + 1).toString(36).substring(4) + '-' + Date.now() + '.jpg'
    )
  },
})


//S3 bucket setup
const s3BucketStorage = multerS3({
  s3: s3,
  bucket: 'clisha-assets',
  acl: 'public-read',
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname })
  },
  key: function (req, file, cb) {
    cb(
      null,
      (Math.random() + 1).toString(36).substring(4) +
        '-' +
        Date.now() +
        path.extname(file.originalname)
    )
  },
})

const isEmail = function (emailAdress) {
  let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  if (emailAdress.match(regex)) return true
  else return false
}

module.exports = {
  extentionCode,
  pagination,
  getPagination,
  getPagingData,
  setRankName,
  isEmail,
  findOcc,
  relativeDifference,
  percentageDifference,

  // Storage Strategy
  storage,
  companyStorage,
  s3BucketStorage,
}
