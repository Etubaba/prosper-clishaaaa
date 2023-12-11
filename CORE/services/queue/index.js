const Queue = require('bull')
const redisUrl = process.env.REDIS_URL
const redisPass = process.env.REDIS_PASSWORD
const { setCache } = require('../redis')
const Notification = require('../../middleware/notification')

const queueOpts = {
  // rate limiter options to avoid overloading the queue
  limiter: {
    // maximum number of tasks queue can take
    max: 100, // time to wait in milliseconds before accepting new jobs after // reaching limit
    duration: 10000,
  },
  prefix: 'MAILS', // a prefix to be added to all queue keys
  defaultJobOptions: {
    // default options for tasks in the queue
    attempts: 10, // default number of times to retry a task // to remove a task from the queue after completion
    removeOnComplete: true,
  },
}

const redisConn =
  process.env.NODE_ENV === 'development'
    ? `redis://${redisUrl}`
    : `rediss://:${redisUrl}`

class SendMailQueue {
  constructor(batch) {
    this.batch = batch

    this.queue = new Queue('Email Queue', redisConn, queueOpts)

    this.queue.on('progress', (job, progress) => {
      console.log(`${jod.id} is in progress`)
    })

    process.env.NODE_ENV === 'development' &&
      this.queue.on('error', (error) => {
        console.log('Bull error here', error)
      })

    if (batch == 'verification_email') this.startVerificationProcess()
    if (batch == 'password_reset_email') this.startPasswordResetProcess()
    if (batch == 'vendo_verification_email')
      this.startVendoVerificationProcess()

    this.queue.on('completed', (job, result) => {
      console.log('done processing job', result?.id)
    })
  }

  async addToQueue(queueName, data) {
    // add task with name 'queueName' to queue
    await this.queue.add(queueName, data)
    console.log(`the ${queueName} has been added to the queue...`)
  }

  // Process verification email queue
  startVerificationProcess() {
    this.queue.process('send_verification_email', async (emailJob, done) => {
      console.log('processing verification email task')
      setCache('sending-verification-email', 'ON')
      // calling send verification service here
      await Notification.sendEmailVerification(emailJob.data)
      return done(null, {
        id: emailJob.id,
      }) // complete the task
    })
  }

  // Process verification email queue
  startPasswordResetProcess() {
    this.queue.process('send_password_reset_email', async (emailJob, done) => {
      console.log('processing password_reset email task')
      setCache('sending-password-reset-email', 'ON')
      // calling send password reset service here
      await Notification.sendPasswordResetMail(emailJob.data)
      return done(null, {
        id: emailJob.id,
      }) // complete the task
    })
  }

  // Process vendo verification email queue
  startVendoVerificationProcess() {
    this.queue.process(
      'send_vendo_verification_email',
      async (vendoJob, done) => {
        console.log('processing vendo verification email task')
        setCache('sending-vendo-verification-email', 'ON')
        // calling send vendo verification service here
        await Notification.sendVendorVerification(vendoJob.data)
        return done(null, {
          id: vendoJob.id,
        }) // complete the task
      }
    )
  }

  isConnected() {
    return this.queue.client.status
  }
}

module.exports = {
  SendEmailQueue: SendMailQueue,
}

// // Process verification email queue
// this.queue.process("send_verification_email", async (emailJob, done) => {
//   console.log("processing verification email task");
//   setCache("sending-verification-email", "ON");
//   // calling send verification service here
//   await Notification.sendEmailVerification(emailJob.data);
//   return done(null, {
//     id: emailJob.id,
//   }); // complete the task
// });
