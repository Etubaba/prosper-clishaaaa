const Queue = require('bull')
const axios = require('axios')
const { setCache } = require('../redis')
const { getUserCalendar } = require('../util/calendar')

const VENDO_SERVER = process.env.VENDO_SERVER
const db = require('../../models')
const Wallet = db.models.Wallet

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
const redisPass = process.env.REDIS_PASSWORD
//

const redisConn =
  process.env.NODE_ENV === 'development'
    ? `redis://${redisUrl}`
    : `rediss://:${redisUrl}`

class TaskQueue {
  constructor(task) {
    this.task = task

    this.queue = new Queue('Task Queue', redisConn, queueOpts)

    this.queue.on('progress', (job, progress) => {
      console.log(`${jod.id} is in progress`)
    })

    process.env.NODE_ENV === 'development' &&
      this.queue.on('error', (error) => {
        console.log('Bull error here', error)
      })

    if (task == 'refresh_user_calendar') this.refreshUserCalendar()
    if (task == 'add_vqbonus_to_vendo') this.addVQBonusToVendo()

    this.queue.on('completed', (job, result) => {
      console.log('done processing job', result?.id)
    })
  }

  async addToQueue(queueName, data) {
    // add task with name 'queueName' to queue
    await this.queue.add(queueName, data)
    console.log(`the ${queueName} has been added to the queue...`)
  }

  refreshUserCalendar() {
    this.queue.process('start_calendar_refresh', async (task, done) => {
      const user = task.data
      await getUserCalendar(user)

      return done(null, {
        id: task.id,
      }) // complete the task
    })
  }

  addVQBonusToVendo() {
    this.queue.process(
      'process_vqbonus_from_vendo_package',
      async (task, done) => {
        const user = task.data.user
        const points = task.data.points
        const ratio = [1.1, 1.2, 1.5, 2]

        const vendo_package = await axios.get(
          `${VENDO_SERVER}/user-vqs-package-for-clisha/${user.clishaId}`
        )

        if (vendo_package?.data.status) {
          const packages = vendo_package.data.packages
          const package_level = vendo_package.data.package_level
          const vq_ratio = ratio[packages.indexOf(package_level)]
          let wallet = await Wallet.findOne({ where: { UserId: user.id } })
          wallet.bonus_points += points //Number(points) * Number(vq_ratio);
          await wallet.save()
        }

        return done(null, {
          id: task.id,
        }) // complete the task
      }
    )
  }
}

module.exports = {
  TaskQueue: TaskQueue,
}
