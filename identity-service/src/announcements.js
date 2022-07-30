const axios = require('axios')
const moment = require('moment')
const config = require('./config.js')

module.exports.fetchAnnouncements = async () => {
  const colivingNotificationUrl = config.get('colivingNotificationUrl')
  const response = await axios.get(`${colivingNotificationUrl}/index.json`)
  if (response.data && Array.isArray(response.data.notifications)) {
    const announcementsResponse = await Promise.all(response.data.notifications.map(async notification => {
      const notificationResponse = await axios.get(`${colivingNotificationUrl}/${notification.id}.json`)
      return notificationResponse.data
    }))
    const announcements = announcementsResponse.filter(a => !!a.entityId).map(a => ({ ...a, type: 'Announcement' }))
    announcements.sort((a, b) => {
      let aDate = moment(a.datePublished)
      let bDate = moment(b.datePublished)
      return bDate - aDate
    })
    const announcementMap = announcements.reduce((acc, a) => {
      acc[a.entityId] = a
      return acc
    }, {})
    return { announcements, announcementMap }
  }
}
