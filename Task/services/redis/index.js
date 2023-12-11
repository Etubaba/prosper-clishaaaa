const Redis = require('ioredis')
let client

const redisUrl = process.env.REDIS_URL
const redisPass = process.env.REDIS_PASSWORD

const redisConn =
  process.env.NODE_ENV === 'development'
    ? `redis://${redisUrl}`
    : `rediss://:${redisUrl}`

exports.initializeRedis = () => {
  try {
    client = new Redis(redisConn, {
      // autoResubscribe: false,
      lazyConnect: true,
      maxRetriesPerRequest: 5,
    })

    client.connect()
    console.log('Connected to redis host')
  } catch (error) {
    console.log(error)
  }
}

exports.setCache = (key, value) => {
  client.set(key, value)
}

exports.setHashCache = (hashKey, key, value) => {
  client.hset(hashKey, key, value)
}
exports.getHashCache = (hashKey, key) => {
  return client.hget(hashKey, key)
}

exports.getCache = (key) => {
  return client.get(key)
}
exports.deleteKey = (key) => {
  return client.del(key)
}

exports.getHashKeys = (hashKey) => {
  return client.hkeys(hashKey)
}

exports.setCacheEx = (key, value, expiry) => {
  client.set(key, value, 'EX', expiry)
}

exports.getKeys = (key) => {
  return client.keys(key)
}
