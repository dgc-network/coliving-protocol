import React from 'react'
import { getRankSuffix } from '../../formatNotificationMetadata'

import NotificationBody from './notificationBody'
import {
  WhiteHeavyCheckMarkIcon,
  IncomingEnvelopeIcon,
  HeadphoneIcon,
  MobilePhoneWithArrowIcon,
  MultipleMusicalNotesIcon,
} from './Icons'

import { notificationTypes as NotificationType } from '../../constants'
import { capitalize } from '../../processNotifications/utils'

const challengeRewardsConfig = {
  referred: {
    title: 'Invite your Friends',
    icon: <IncomingEnvelopeIcon />
  },
  referrals: {
    title: 'Invite your Friends',
    icon: <IncomingEnvelopeIcon />
  },
  'ref-v': {
    title: 'Invite your Residents',
    icon: <IncomingEnvelopeIcon />
  },
  'connect-verified': {
    title: 'Link Verified Accounts',
    icon: <WhiteHeavyCheckMarkIcon />
  },
  'listen-streak': {
    title: 'Listening Streak: 7 Days',
    icon: <HeadphoneIcon />
  },
  'mobile-install': {
    title: 'Get the Coliving Mobile App',
    icon: <MobilePhoneWithArrowIcon />
  },
  'profile-completion': {
    title: 'Complete Your Profile',
    icon: <WhiteHeavyCheckMarkIcon />
  },
  'digital-content-upload': {
    title: 'Upload 3 DigitalContents',
    icon: <MultipleMusicalNotesIcon />
  }
}

const EntityType = Object.freeze({
  DigitalContent: 'DigitalContent',
  Album: 'Album',
  ContentList: 'ContentList'
})

const HighlightText = ({ text }) => (
  <span
    className={'avenir'}
    style={{
      color: '#7E1BCC',
      fontSize: '14px',
      fontWeight: '500'
    }}
  >
    {text}
  </span>
)

const BodyText = ({ text, className }) => (
  <span
    className={`avenir ${className}`}
    style={{
      color: '#858199',
      fontSize: '14px',
      fontWeight: '500'
    }}
  >
    {text}
  </span>
)

export const getUsers = (users) => {
  const [firstUser] = users
  if (users.length > 1) {
    const userCount = users.length - 1
    return (
      <>
        <HighlightText text={firstUser.name} />
        <BodyText text={` and ${userCount.toLocaleString()} other${users.length > 2 ? 's' : ''}`} />
      </>
    )
  }
  return <HighlightText text={firstUser.name} />
}

export const getEntity = (entity) => {
  if (entity.type === EntityType.DigitalContent) {
    return (
      <> <BodyText text={'digital_content '} /><HighlightText text={entity.name} /> </>
    )
  } else if (entity.type === EntityType.Album) {
    return (
      <> <BodyText text={'album '} /><HighlightText text={entity.name} /> </>
    )
  } else if (entity.type === EntityType.ContentList) {
    return (
      <> <BodyText text={'contentList '} /><HighlightText text={entity.name} /> </>
    )
  }
}

const notificationMap = {
  [NotificationType.Favorite.base] (notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}<BodyText text={` favorited your `} />{entity}
      </span>
    )
  },
  [NotificationType.Repost.base] (notification) {
    const user = getUsers(notification.users)
    const entity = getEntity(notification.entity)
    return (
      <span className={'notificationText'}>
        {user}<BodyText text={` reposted your `} />{entity}
      </span>
    )
  },
  [NotificationType.Follow] (notification) {
    const user = getUsers(notification.users)
    return (
      <span className={'notificationText'}>
        {user}<BodyText text={` followed you`} />
      </span>
    )
  },
  [NotificationType.Announcement] (notification) {
    return <BodyText className={'notificationText'} text={notification.text} />
  },
  [NotificationType.Milestone] (notification) {
    if (notification.entity) {
      const entity = notification.entity.type.toLowerCase()
      const highlight = notification.entity.name
      const count = notification.value
      return (
        <span className={'notificationText'}>
          <BodyText text={`Your ${entity} `} />
          <HighlightText text={highlight} />
          <BodyText text={` has reached over ${count.toLocaleString()} ${notification.achievement}s`} />
        </span>
      )
    } else {
      return (
        <BodyText className={'notificationText'} text={`You have reached over ${notification.value} Followers `} />
      )
    }
  },
  [NotificationType.TrendingDigitalContent] (notification) {
    const highlight = notification.entity.title
    const rank = notification.rank
    const rankSuffix = getRankSuffix(rank)
    return (
      <span className={'notificationText'}>
        <BodyText text={`Your DigitalContent `} />
        <HighlightText text={highlight} />
        <BodyText text={` is ${rank}${rankSuffix} on Trending Right Now! 🍾`} />
      </span>
    )
  },
  [NotificationType.UserSubscription] (notification) {
    const [user] = notification.users
    if (notification.entity.type === NotificationType.DigitalContent && !isNaN(notification.entity.count) && notification.entity.count > 1) {
      return (
        <span className={'notificationText'}>
          <HighlightText text={user.name} />
          <BodyText text={` released ${notification.entity.count} new ${notification.entity.type}`} />
        </span>
      )
    }
    return (
      <span className={'notificationText'}>
        <HighlightText text={user.name} />
        <BodyText text={` released a new ${notification.entity.type} ${notification.entity.name}`} />
      </span>
    )
  },
  [NotificationType.RemixCreate] (notification) {
    const { remixUser, remixDigitalContent, parentDigitalContentUser, parentDigitalContent } = notification
    return (
      <span className={'notificationText'}>
        <HighlightText text={remixDigitalContent.title} />
        <BodyText text={` by `} />
        <HighlightText text={remixUser.name} />
      </span>
    )
  },
  [NotificationType.RemixCosign] (notification) {
    const { parentDigitalContentUser, parentDigitalContents } = notification
    const parentDigitalContent = parentDigitalContents.find(t => t.owner_id === parentDigitalContentUser.user_id)
    return (
      <span className={'notificationText'}>
        <HighlightText text={parentDigitalContentUser.name} />
        <BodyText text={` Co-signed your Remix of `} />
        <HighlightText text={parentDigitalContent.title} />
      </span>
    )
  },
  [NotificationType.ChallengeReward] (notification) {
    const { rewardAmount } = notification
    const { title, icon } = challengeRewardsConfig[notification.challengeId]
    let bodyText
    if (notification.challengeId === 'referred') {
      bodyText = `You’ve received ${rewardAmount} $DGC for being referred! Invite your friends to join to earn more!`
    } else {
      bodyText = `You’ve earned ${rewardAmount} $DGC for completing this challenge!`
    }
    return (
          <span className={'notificationText'}>
            <table
              cellspacing='0'
              cellpadding='0'
              style={{ marginBottom: '4px' }}
            >
              <tr>
                  <td>{icon}</td>
                  <td><HighlightText text={title} /></td>
            </tr>
          </table>
        <BodyText text={bodyText} />
      </span>
    )
  },
  [NotificationType.AddDigitalContentToContentList] (notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={notification.contentListOwner.name} />
        <BodyText text={` added your digital_content `} />
        <HighlightText text={notification.digital_content.title} />
        <BodyText text={` to their contentList `} />
        <HighlightText text={notification.contentList.content_list_name} />
      </span>
    )
  },
  [NotificationType.Reaction] (notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={capitalize(notification.reactingUser.name)} />
        <BodyText text={` reacted to your tip of `} />
        <HighlightText text={notification.amount} />
        <BodyText text={` $DGC`} />
      </span>
    )
  },
  [NotificationType.SupporterRankUp] (notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={capitalize(notification.sendingUser.name)} />
        <BodyText text={` became your `} />
        <HighlightText text={`#${notification.rank}`} />
        <BodyText text={` Top Supporter!`} />
      </span>
    )
  },
  [NotificationType.SupportingRankUp] (notification) {
    return (
      <span className={'notificationText'}>
        <BodyText text={`You're now `} />
        <HighlightText text={capitalize(notification.receivingUser.name)} />
        <BodyText text={`'s `} />
        <HighlightText text={`#${notification.rank}`} />
        <BodyText text={` Top Supporter!`} />
      </span>
    )
  },
  [NotificationType.TipReceive] (notification) {
    return (
      <span className={'notificationText'}>
        <HighlightText text={capitalize(notification.sendingUser.name)} />
        <BodyText text={` sent you a tip of `} />
        <HighlightText text={notification.amount} />
        <BodyText text={` $DGC`} />
      </span>
    )
  }
}

const getMessage = (notification) => {
  const getNotificationMessage = notificationMap[notification.type]
  if (!getNotificationMessage) return null
  return getNotificationMessage(notification)
}

const getTitle = (notification) => {
  switch (notification.type) {
    case NotificationType.RemixCreate: {
      const { parentDigitalContent } = notification
      return (
        <span className={'notificationText'}>
          <BodyText text={`New remix of your digital_content `} />
          <HighlightText text={parentDigitalContent.title} />
        </span>
      )
    }
    default: 
      return null
  }
}

const getDigitalContentMessage = (notification) => {
  switch (notification.type) {
    case NotificationType.RemixCosign: {
      const { remixDigitalContent } = notification
      return (
        <span className={'notificationText'}>
          <HighlightText text={remixDigitalContent.title} />
        </span>
      )
    }
    default: 
      return null
  }
}

export const getDigitalContentLink = (digital_content) => {
  return `https://coliving.lol/${digital_content.route_id}-${digital_content.digital_content_id}`
}

const getTwitter = (notification) => {
  switch (notification.type) {
    case NotificationType.RemixCreate: {
      const { parentDigitalContent, parentDigitalContentUser, remixUser, remixDigitalContent } = notification
      const twitterHandle = parentDigitalContentUser.twitterHandle 
        ? `@${parentDigitalContentUser.twitterHandle}`
        : parentDigitalContentUser.name
      const text = `New remix of ${parentDigitalContent.title} by ${twitterHandle} on @dgc-network #Coliving`
      const url = getDigitalContentLink(remixDigitalContent)
      return {
        message: 'Share With Your Friends',
        href: `http://twitter.com/share?url=${encodeURIComponent(url)
          }&text=${encodeURIComponent(text)}`
      }
    }
    case NotificationType.RemixCosign: {
      const { parentDigitalContents, parentDigitalContentUser, remixDigitalContent } = notification
      const parentDigitalContent = parentDigitalContents.find(t => t.owner_id === parentDigitalContentUser.user_id)
      const url = getDigitalContentLink(remixDigitalContent)
      const twitterHandle = parentDigitalContentUser.twitterHandle 
        ? `@${parentDigitalContentUser.twitterHandle}`
        : parentDigitalContentUser.name
      const text = `My remix of ${parentDigitalContent.title} was Co-Signed by ${twitterHandle} on @dgc-network #Coliving`
      return {
        message: 'Share With Your Friends',
        href: `http://twitter.com/share?url=${encodeURIComponent(url)
          }&text=${encodeURIComponent(text)}`
      }
    }
    case NotificationType.TrendingDigitalContent: {
      const { rank, entity } = notification
      const url = getDigitalContentLink(entity)
      const rankSuffix = getRankSuffix(rank)
      const text = `My digital_content ${entity.title} is trending ${rank}${rankSuffix} on @dgc-network! #ColivingTrending #Coliving`
      return {
        message: 'Share this Milestone',
        href: `http://twitter.com/share?url=${encodeURIComponent(url)
          }&text=${encodeURIComponent(text)}`
      }
    }
    case NotificationType.ChallengeReward: {
      const text = `I earned $DGC for completing challenges on @dgc-network #DigitalcoinRewards`
      return {
        message: 'Share this with your residents',
        href: `http://twitter.com/share?text=${encodeURIComponent(text)}`
      }
    }
    default: 
      return null
  }
}

const Notification = (props) => {
  const message = getMessage(props)
  const title = getTitle(props)
  const digitalContentMessage = getDigitalContentMessage(props)
  const twitter = getTwitter(props)
  return (
    <NotificationBody
      {...props}
      title={title}
      message={message}
      digitalContentMessage={digitalContentMessage}
      twitter={twitter}
    />
  )
}

export default Notification
