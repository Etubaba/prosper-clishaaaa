// Enviromenal Variables
const password = 'Y5ackiU3IfJpcaAS'
const username = 'kaywize'
const cluster = 'cluster0.wwyaz'
const dbname = 'Node'
// MongoDB Connection
// const mongodb = `mongodb+srv://kaywize:${password}@cluster0.wwyaz.mongodb.net/myFirstDatabase`; //--username kaywize"
const mongodb = `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${dbname}`
mongoose
  .connect(mongodb, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    console.log('Connected to DB')
  })
  .catch((err) => {
    console.log(err)
  })
