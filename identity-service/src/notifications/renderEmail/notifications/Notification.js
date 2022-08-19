"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.getAgreementLink = exports.getEntity = exports.getUsers = void 0;

var _react = _interopRequireDefault(require("react"));

var _formatNotificationMetadata = require("../../formatNotificationMetadata");

var _NotificationBody = _interopRequireDefault(require("./NotificationBody"));

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
    title: 'Invite your Fans',
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
  'agreement-upload': {
    title: 'Upload 3 Agreements',
    icon: /*#__PURE__*/_react["default"].createElement(_Icons.MultipleMusicalNotesIcon, null)
  }
};
var EntityType = Object.freeze({
  Agreement: 'Agreement',
  Album: 'Album',
  Playlist: 'Playlist'
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
  if (entity.type === EntityType.Agreement) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'agreement '
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: entity.name
    }), " ");
  } else if (entity.type === EntityType.Album) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'album '
    }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
      text: entity.name
    }), " ");
  } else if (entity.type === EntityType.Playlist) {
    return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, " ", /*#__PURE__*/_react["default"].createElement(BodyText, {
      text: 'playlist '
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
}), _defineProperty(_notificationMap, _constants.notificationTypes.TrendingAgreement, function (notification) {
  var highlight = notification.entity.title;
  var rank = notification.rank;
  var rankSuffix = (0, _formatNotificationMetadata.getRankSuffix)(rank);
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: "Your Agreement "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: highlight
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " is ".concat(rank).concat(rankSuffix, " on Trending Right Now! \uD83C\uDF7E")
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.UserSubscription, function (notification) {
  var _notification$users = _slicedToArray(notification.users, 1),
      user = _notification$users[0];

  if (notification.entity.type === _constants.notificationTypes.Agreement && !isNaN(notification.entity.count) && notification.entity.count > 1) {
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
      remixAgreement = notification.remixAgreement,
      parentAgreementUser = notification.parentAgreementUser,
      parentAgreement = notification.parentAgreement;
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: remixAgreement.title
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " by "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: remixUser.name
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.RemixCosign, function (notification) {
  var parentAgreementUser = notification.parentAgreementUser,
      parentAgreements = notification.parentAgreements;
  var parentAgreement = parentAgreements.find(function (t) {
    return t.owner_id === parentAgreementUser.user_id;
  });
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: parentAgreementUser.name
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " Co-signed your Remix of "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: parentAgreement.title
  }));
}), _defineProperty(_notificationMap, _constants.notificationTypes.ChallengeReward, function (notification) {
  var rewardAmount = notification.rewardAmount;
  var _challengeRewardsConf = challengeRewardsConfig[notification.challengeId],
      title = _challengeRewardsConf.title,
      icon = _challengeRewardsConf.icon;
  var bodyText;

  if (notification.challengeId === 'referred') {
    bodyText = "You\u2019ve received ".concat(rewardAmount, " $LIVE for being referred! Invite your friends to join to earn more!");
  } else {
    bodyText = "You\u2019ve earned ".concat(rewardAmount, " $LIVE for completing this challenge!");
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
}), _defineProperty(_notificationMap, _constants.notificationTypes.AddAgreementToPlaylist, function (notification) {
  return /*#__PURE__*/_react["default"].createElement("span", {
    className: 'notificationText'
  }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.playlistOwner.name
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " added your agreement "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.agreement.title
  }), /*#__PURE__*/_react["default"].createElement(BodyText, {
    text: " to their playlist "
  }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
    text: notification.playlist.playlist_name
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
    text: " $LIVE"
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
    text: " $LIVE"
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
        var parentAgreement = notification.parentAgreement;
        return /*#__PURE__*/_react["default"].createElement("span", {
          className: 'notificationText'
        }, /*#__PURE__*/_react["default"].createElement(BodyText, {
          text: "New remix of your agreement "
        }), /*#__PURE__*/_react["default"].createElement(HighlightText, {
          text: parentAgreement.title
        }));
      }

    default:
      return null;
  }
};

var getAgreementMessage = function getAgreementMessage(notification) {
  switch (notification.type) {
    case _constants.notificationTypes.RemixCosign:
      {
        var remixAgreement = notification.remixAgreement;
        return /*#__PURE__*/_react["default"].createElement("span", {
          className: 'notificationText'
        }, /*#__PURE__*/_react["default"].createElement(HighlightText, {
          text: remixAgreement.title
        }));
      }

    default:
      return null;
  }
};

var getAgreementLink = function getAgreementLink(agreement) {
  return "https://coliving.lol/".concat(agreement.route_id, "-").concat(agreement.agreement_id);
};

exports.getAgreementLink = getAgreementLink;

var getTwitter = function getTwitter(notification) {
  switch (notification.type) {
    case _constants.notificationTypes.RemixCreate:
      {
        var parentAgreement = notification.parentAgreement,
            parentAgreementUser = notification.parentAgreementUser,
            remixUser = notification.remixUser,
            remixAgreement = notification.remixAgreement;
        var twitterHandle = parentAgreementUser.twitterHandle ? "@".concat(parentAgreementUser.twitterHandle) : parentAgreementUser.name;
        var text = "New remix of ".concat(parentAgreement.title, " by ").concat(twitterHandle, " on @dgc.network #Coliving");
        var url = getAgreementLink(remixAgreement);
        return {
          message: 'Share With Your Friends',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(url), "&text=").concat(encodeURIComponent(text))
        };
      }

    case _constants.notificationTypes.RemixCosign:
      {
        var parentAgreements = notification.parentAgreements,
            _parentAgreementUser = notification.parentAgreementUser,
            _remixAgreement = notification.remixAgreement;

        var _parentAgreement = parentAgreements.find(function (t) {
          return t.owner_id === _parentAgreementUser.user_id;
        });

        var _url = getAgreementLink(_remixAgreement);

        var _twitterHandle = _parentAgreementUser.twitterHandle ? "@".concat(_parentAgreementUser.twitterHandle) : _parentAgreementUser.name;

        var _text = "My remix of ".concat(_parentAgreement.title, " was Co-Signed by ").concat(_twitterHandle, " on @dgc.network #Coliving");

        return {
          message: 'Share With Your Friends',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(_url), "&text=").concat(encodeURIComponent(_text))
        };
      }

    case _constants.notificationTypes.TrendingAgreement:
      {
        var rank = notification.rank,
            entity = notification.entity;

        var _url2 = getAgreementLink(entity);

        var rankSuffix = (0, _formatNotificationMetadata.getRankSuffix)(rank);

        var _text2 = "My agreement ".concat(entity.title, " is trending ").concat(rank).concat(rankSuffix, " on @dgc.network! #ColivingTrending #Coliving");

        return {
          message: 'Share this Milestone',
          href: "http://twitter.com/share?url=".concat(encodeURIComponent(_url2), "&text=").concat(encodeURIComponent(_text2))
        };
      }

    case _constants.notificationTypes.ChallengeReward:
      {
        var _text3 = "I earned $LIVE for completing challenges on @dgc.network #AudioRewards";
        return {
          message: 'Share this with your fans',
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
  var agreementMessage = getAgreementMessage(props);
  var twitter = getTwitter(props);
  return /*#__PURE__*/_react["default"].createElement(_NotificationBody["default"], _extends({}, props, {
    title: title,
    message: message,
    agreementMessage: agreementMessage,
    twitter: twitter
  }));
};

var _default = Notification;
exports["default"] = _default;