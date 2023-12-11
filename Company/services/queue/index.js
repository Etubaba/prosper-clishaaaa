const Queue = require('bull')
const { setCache } = require('../redis')
const { openingDailyClishaRecord } = require('../cron')
const Notification = require('../../middleware/notification')

const queueOpts = {
  // rate limiter options to avoid overloading the queue
  limiter: {
    // maximum number of tasks queue can take
    max: 100, // time to wait in milliseconds before accepting new jobs after // reaching limit
    duration: 10000,
  },
  prefix: 'TASKS', // a prefix to be added to all queue keys
  defaultJobOptions: {
    // default options for tasks in the queue
    attempts: 10, // default number of times to retry a task // to remove a task from the queue after completion
    removeOnComplete: true,
  },
}

const redisUrl = process.env.REDIS_URL
const redisHost = process.env.REDIS_HOST
const redisPass = process.env.REDIS_PASSWORD
const redisConn =
  process.env.NODE_ENV === 'development'
    ? `redis://${redisUrl}`
    : `rediss://:${redisUrl}`

class ClishaRecordQueue {
  constructor(task) {
    this.task = task

    this.queue = new Queue('Clisha Record Queue', redisConn, queueOpts)

    this.queue.on('progress', (job, progress) => {
      console.log(`${jod.id} is in progress`)
    })

    process.env.NODE_ENV === 'development' &&
      this.queue.on('error', (error) => {
        console.log('Bull error here', error)
      })

    if (task == 'update_clisha_record') this.startClishaRecordUpdate()

    this.queue.on('completed', (job, result) => {
      console.log('done processing job', result?.id)
    })
  }

  async addToQueue(queueName, data) {
    // add task with name 'queueName' to queue
    await this.queue.add(queueName, data)
    console.log(`the ${queueName} has been added to the queue...`)
  }

  startClishaRecordUpdate() {
    this.queue.process('start_clisha_record_update', async (task, done) => {
      console.log('starting clisha record update')

      await openingDailyClishaRecord()
      return done(null, {
        id: task.id,
      }) // complete the task
    })
  }
}

module.exports = {
  ClishaRecordQueue: ClishaRecordQueue,
}
