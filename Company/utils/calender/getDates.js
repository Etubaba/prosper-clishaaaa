function getDates(startDate, daysCount) {
  const dateArray = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < daysCount; i++) {
    // Format the current date as a string
    const dateString = currentDate.toISOString()
    dateArray.push(dateString)

    // Increment the current date by one day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateArray
}

module.exports = {
  getDates,
}
