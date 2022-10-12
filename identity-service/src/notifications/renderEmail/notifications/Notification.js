"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.getDigitalContentLink = exports.getEntity = exports.getUsers = void 0;

var _react = _interopRequireDefault(require("react"));

var _formatNotificationMetadata = require("../../formatNotificationMetadata");

var _NotificationBody = _interopRequireDefault(require("./notificationBody"));

var _Icons = require("./Icons");

var _constants = require("../../constants");

var _utils = require("../../processNotifications/utils");

var _notificationMap;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var challengeRewardsConfig = {
  referred: {
    title: 'Invite your Friends',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.IncomingEnvelopeIcon, null)
  },
  referrals: {
    title: 'Invite your Friends',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.IncomingEnvelopeIcon, null)
  },
  'ref-v': {
    title: 'Invite your Residents',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.IncomingEnvelopeIcon, null)
  },
  'connect-verified': {
    title: 'Link Verified Accounts',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.WhiteHeavyCheckMarkIcon, null)
  },
  'listen-streak': {
    title: 'Listening Streak: 7 Days',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.HeadphoneIcon, null)
  },
  'mobile-install': {
    title: 'Get the Coliving Mobile App',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.MobilePhoneWithArrowIcon, null)
  },
  'profile-completion': {
    title: 'Complete Your Profile',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.WhiteHeavyCheckMarkIcon, null)
  },
  'digital-content-upload': {
    title: 'Upload 3 DigitalContents',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.MultipleMusicalNotesIcon, null)
  }
};
var EntityType = Object.freeze({
  DigitalContent: 'DigitalContent',
  Album: 'Album',
  ContentList: 'ContentList'
});

var HighlightText = function HighlightText(_ref) {
  var text = _ref.text;
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'avenir',
    style: {
      color: '#7E1BCC',
      fontSize: '14px',
      fontWeight: '500'
    }
  }, text);
};

var BodyText = function BodyText(_ref2) {
  var text = _ref2.text,
      className = _ref2.className;
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: "avenir ".concat(className),
    style: {
      color: '#858199',
      fontSize: '14px',
      fontWeight: '500'
    }
  }, text);
};

var getUsers = function getUsers(users) {
  var _users = _slicedToArray(users, 1),
      firstUser = _users[0];

  if (users.length > 1) {
    var userCount = users.length - 1;
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: firstUser.name
    }), /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: " and ".concat(userCount.toLocaleString(), " other").concat(users.length > 2 ? 's' : '')
    }));
  }

  return /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: firstUser.name
  });
};

exports.getUsers = getUsers;

var getEntity = function getEntity(entity) {
  if (entity.type === EntityType.DigitalContent) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'digital_content '
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: entity.name
    }), " ");
  } else if (entity.type === EntityType.Album) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'album '
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: entity.name
    }), " ");
  } else if (entity.type === EntityType.ContentList) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'contentList '
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: entity.name
    }), " ");
  }
};

exports.getEntity = getEntity;
var notificationMap = (_notificationMap = {}, _defineProperty(_notificationMap, _constants.notificationTypes.Favorite.base, function (notification) {
  var user = getUsers(notification.users);
  var entity = getEntity(notification.entity);
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, user, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " favorited your "
  }), entity);
}), _defineProperty(_notificationMap, _constants.notificationTypes.Repost.base, function (notification) {
  var user = getUsers(notification.users);
  var entity = getEntity(notification.entity);
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, user, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " reposted your "
  }), entity);
}), _defineProperty(_notificationMap, _constants.notificationTypes.Follow, function (notification) {
  var user = getUsers(notification.users);
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, user, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " followed you"
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.Announcement, function (notification) {
  return /*#__PURE__*/_react["default"].createElement(BodyText, {
    className: 'notificationText',
    text: notification.text
  });
}), _defineProperty(_notificationMap, _constants.notificationTypes.Milestone, function (notification) {
  if (notification.entity) {
    var entity = notification.entity.type.toLowerCase();
    var highlight = notification.entity.name;
    var count = notification.value;
    return /*#__PURE__*/_react["default"].createElement("span", {
      className: 'notificationText'
    }, /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: "Your ".concat(entity, " ")
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: highlight
    }), /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: " has reached over ".concat(count.toLocaleString(), " ").concat(notification.achievement, "s")
    }));
  } else {
    return /*#__PURE__*/_react["default"].createElement(BodyText, {
      className: 'notificationText',
      text: "You have reached over ".concat(notification.value, " Followers ")
    });
  }
}), _defineProperty(_notificationMap, _constants.notificationTypes.TrendingDigitalContent, function (notification) {
  var highlight = notification.entity.title;
  var rank = notification.rank;
  var rankSuffix = (0, _formatNotificationMetadata.getRankSuffix)(rank);
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: "Your DigitalContent "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: highlight
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " is ".concat(rank).concat(rankSuffix, " on Trending Right Now! \uD83C\uDF7E")
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.UserSubscription, function (notification) {
  var _notification$users = _slicedToArray(notification.users, 1),
      user = _notification$users[0];

  if (notification.entity.type === _constants.notificationTypes.DigitalContent && !isNaN(notification.entity.count) && notification.entity.count > 1) {
    return /*#__PURE__*/_react["default"].createElement("span", {
      className: 'notificationText'
    }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: user.name
    }), /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: " released ".concat(notification.entity.count, " new ").concat(notification.entity.type)
    }));
  }

  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: user.name
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " released a new ".concat(notification.entity.type, " ").concat(notification.entity.name)
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.RemixCreate, function (notification) {
  var remixUser = notification.remixUser,
      remixDigitalContent = notification.remixDigitalContent,
      parentDigitalContentUser = notification.parentDigitalContentUser,
      parentDigitalContent = notification.parentDigitalContent;
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: remixDigitalContent.title
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " by "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: remixUser.name
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.RemixCosign, function (notification) {
  var parentDigitalContentUser = notification.parentDigitalContentUser,
      parentDigitalContents = notification.parentDigitalContents;
  var parentDigitalContent = parentDigitalContents.find(function (t) {
    return t.owner_id === parentDigitalContentUser.user_id;
  });
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: parentDigitalContentUser.name
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " Co-signed your Remix of "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: parentDigitalContent.title
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.ChallengeReward, function (notification) {
  var rewardAmount = notification.rewardAmount;
  var _challengeRewardsConf = challengeRewardsConfig[notification.challengeId],
      title = _challengeRewardsConf.title,
      icon = _challengeRewardsConf.icon;
  var bodyText;

  if (notification.challengeId === 'referred') {
    bodyText = "You\u2019ve received ".concat(rewardAmount, " $DGCO for being referred! Invite your friends to join to earn more!");
  } else {
    bodyText = "You\u2019ve earned ".concat(rewardAmount, " $DGCO for completing this challenge!");
  }

  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement("table", {
    cellspacing: "0",
    cellpadding: "0",
    style: {
      marginBottom: '4px'
    }
  }, /*#__PURE__*/_react["default"].createElement("tr", null, /*#__PURE__*/_react["default"].createElement("td", null, icon), /*#__PURE__*/_react["default"].createElement("td", null, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: title
  })))), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: bodyText
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.AddDigitalContentToContentList, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.contentListOwner.name
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " added your digital_content "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.digital_content.title
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " to their contentList "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.contentList.content_list_name
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.Reaction, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: (0, _utils.capitalize)(notification.reactingUser.name)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " reacted to your tip of "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.amount
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " $DGCO"
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.SupporterRankUp, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: (0, _utils.capitalize)(notification.sendingUser.name)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " became your "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: "#".concat(notification.rank)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " Top Supporter!"
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.SupportingRankUp, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: "You're now "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: (0, _utils.capitalize)(notification.receivingUser.name)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: "'s "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: "#".concat(notification.rank)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " Top Supporter!"
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.TipReceive, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: (0, _utils.capitalize)(notification.sendingUser.name)
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " sent you a tip of "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.amount
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " $DGCO"
  }));
}), _notificationMap);

var getMessage = function getMessage(notification) {
  var getNotificationMessage = notificationMap[notification.type];
  if (!getNotificationMessage) return null;
  return getNotificationMessage(notification);
};

var getTitle = function getTitle(notification) {
  switch (notification.type) {
    case _constants.notificationTypes.RemixCreate:
      {
        var parentDigitalContent = notification.parentDigitalContent;
        return /*#__PURE__*/_react["default"].createElement("span", {
          className: 'notificationText'
        }, /*#__PURE__*/_react["default"].createElement(BodyText, {
          text: "New remix of your digital_content "
        }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
          text: parentDigitalContent.title
        }));
      }

    default:
      return null;
  }
};

var getDigitalContentMessage = function getDigitalContentMessage(notification) {
  switch (notification.type) {
    case _constants.notificationTypes.RemixCosign:
      {
        var remixDigitalContent = notification.remixDigitalContent;
        return /*#__PURE__*/_react["default"].createElement("span", {
          className: 'notificationText'
        }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
          text: remixDigitalContent.title
        }));
      }

    default:
      return null;
  }
};

var getDigitalContentLink = function getDigitalContentLink(digital_content) {
  return "https://coliving.lol/".concat(digital_content.route_id, "-").concat(digital_content.digital_content_id);
};

exports.getDigitalContentLink = getDigitalContentLink;

var getTwitter = function getTwitter(notification) {
  switch (notification.type) {
    case _constants.notificationTypes.RemixCreate:
      {
        var parentDigitalContent = notification.parentDigitalContent,
            parentDigitalContentUser = notification.parentDigitalContentUser,
            remixUser = notification.remixUser,
            remixDigitalContent = notification.remixDigitalContent;
        var twitterHandle = parentDigitalContentUser.twitterHandle ? "@".concat(parentDigitalContentUser.twitterHandle) : parentDigitalContentUser.name;
        var text = "New remix of ".concat(parentDigitalContent.title, " by ").concat(twitterHandle, " on @dgc-network #Coliving");
        var url = getDigitalContentLink(remixDigitalContent);
        return {
          message: 'Share With Your Friends',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(url), "&text=").concat(encodeURIComponent(text))
        };
      }

    case _constants.notificationTypes.RemixCosign:
      {
        var parentDigitalContents = notification.parentDigitalContents,
            _parentDigitalContentUser = notification.parentDigitalContentUser,
            _remixDigitalContent = notification.remixDigitalContent;

        var _parentDigitalContent = parentDigitalContents.find(function (t) {
          return t.owner_id === _parentDigitalContentUser.user_id;
        });

        var _url = getDigitalContentLink(_remixDigitalContent);

        var _twitterHandle = _parentDigitalContentUser.twitterHandle ? "@".concat(_parentDigitalContentUser.twitterHandle) : _parentDigitalContentUser.name;

        var _text = "My remix of ".concat(_parentDigitalContent.title, " was Co-Signed by ").concat(_twitterHandle, " on @dgc-network #Coliving");

        return {
          message: 'Share With Your Friends',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(_url), "&text=").concat(encodeURIComponent(_text))
        };
      }

    case _constants.notificationTypes.TrendingDigitalContent:
      {
        var rank = notification.rank,
            entity = notification.entity;

        var _url2 = getDigitalContentLink(entity);

        var rankSuffix = (0, _formatNotificationMetadata.getRankSuffix)(rank);

        var _text2 = "My digital_content ".concat(entity.title, " is trending ").concat(rank).concat(rankSuffix, " on @dgc-network! #ColivingTrending #Coliving");

        return {
          message: 'Share this Milestone',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(_url2), "&text=").concat(encodeURIComponent(_text2))
        };
      }

    case _constants.notificationTypes.ChallengeReward:
      {
        var _text3 = "I earned $DGCO for completing challenges on @dgc-network #DigitalcoinRewards";
        return {
          message: 'Share this with your residents',
          href: "http://twitter.com/share?text=".concat(encodeURIComponent(_text3))
        };
      }

    default:
      return null;
  }
};

var Notification = function Notification(props) {
  var message = getMessage(props);
  var title = getTitle(props);
  var digitalContentMessage = getDigitalContentMessage(props);
  var twitter = getTwitter(props);
  return /*#__PURE__*/_react["default"].createElement(_NotificationBody["default"], _extends({}, props, {
    title: title,
    message: message,
    digitalContentMessage: digitalContentMessage,
    twitter: twitter
  }));
};

var _default = Notification;
exports["default"] = _default;