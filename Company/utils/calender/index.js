function groupByTaskId(arr) {
  const groupedData = {}

  for (const item of arr) {
    const taskId = item.taskId

    if (!groupedData[taskId]) {
      groupedData[taskId] = {
        ...item,
        calenderData: [...item.calenderData],
      }
    } else {
      groupedData[taskId].calenderData = Array.from(
        new Set(groupedData[taskId].calenderData.concat(item.calenderData))
      )
    }
  }

  return Object.values(groupedData)
}

function monthIndexToDateStr(monthIndex, year) {
  const date = new Date(year, monthIndex, 1)
  const dateString = date
  return dateString
}

function getFullDatesInMonth(weekIndexes, targetMonth) {
  const targetDate = new Date(targetMonth)

  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()
  // const day = targetDate.getDay()
  const resultDates = []

  for (const weekIndex of weekIndexes) {
    let currentDate = new Date(year, month, 1)

    while (currentDate.getDay() !== weekIndex) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    while (currentDate.getMonth() === month) {
      resultDates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 7)
    }
  }

  return resultDates
}

function getWeekdayDates(weekdays, targetDateStr) {
  // Convert weekdays to a Set for faster lookup
  const weekdaysSet = new Set(weekdays)

  // Extract the year and month from the target date string
  const [year, month] = targetDateStr.split('-').map(Number)

  // Get the number of days in the target month
  const lastDayOfMonth = new Date(year, month, 0).getDate()

  // Initialize an array to store the dates
  const resultDates = []

  // Iterate through the days of the month
  for (let day = 1; day <= lastDayOfMonth; day++) {
    // Calculate the weekday for the current day (0-6)
    const currentWeekday = new Date(year, month - 1, day).getDay()

    // Check if the current weekday is in the set of desired weekdays
    if (weekdaysSet.has(currentWeekday)) {
      // Create a date string in the format "YYYY-MM-DD"
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`

      resultDates.push(new Date(dateStr))
    }
  }

  return resultDates
}

function getTargetDates(daysOfWeek, targetMonth, startDate) {
  const targetDate = new Date(targetMonth)
  const currentDate = new Date(startDate)

  const resultDates = []
  if (currentDate.getMonth() == targetDate.getMonth()) {
    while (currentDate.getMonth() === targetDate.getMonth()) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        resultDates.push(new Date(currentDate))
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
  } else {
    //where it is not the current month
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1

    const dateStr = `${year}-${month}`

    return getWeekdayDates(daysOfWeek, dateStr)
    // return getFullDatesInMonth(daysOfWeek, targetDate)
  }

  return resultDates
}

function filterTargetMonth(year, month, dateArray) {
  return dateArray.filter((dateStr) => {
    // const date = new Date(dateStr)
    return dateStr.getFullYear() === year && dateStr.getMonth() === month // Month is 0-based
  })
}

module.exports = {
  groupByTaskId,
  monthIndexToDateStr,
  getTargetDates,
  filterTargetMonth,
}
