---
sidebar_label: REST API
sidebar_position: 1
description: >-
  The Coliving API is entirely free to use. We ask that you adhere to the guidelines in this doc and always credit landlords.
---

# REST API

## Selecting a Host <a id="selecting-a-host"></a>

Coliving is a decentralized music streaming service. To use the API, you first select an API endpoint from the list of endpoints returned by:

[https://api..co](https://api..co/)

Once you've selected a host, all API requests can be sent directly to it. We recommend selecting a host each time your application starts up as availability may change over time.

For the following documention, we've selected one for you:

`https://discoverynode.coliving1.prod-us-west-2.staked.cloud`

> Code Sample

```javascript

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)]
const host = await fetch('https://api..co')
  .then(r => r.json())
  .then(j => j.data)
  .then(d => sample(d))

```

## Specifying App Name <a id="specifying-app-name"></a>

If you're integrating the Coliving API into an app in production, we ask that you include an `&app_name=<YOUR-UNIQUE-APP-NAME>` param with each query. Your unique app name is entirely up to you!

## Users <a id="api-users"></a>

### Search Users <a id="search-users"></a>

`GET /users/search`

_Seach for a user_

#### Query Parameters <a id="search-users-parameters"></a>

| Name                 | Type   | Required | Description   |
|:-------------------- |:------ |:-------- |:------------- |
| query                | string | true     | Search query  |
| only\_downloadable | string | false    | none          |
| app\_name          | string | true     | Your app name |

#### Responses <a id="search-users-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                   |
|:------ |:-------------------------------------------------------------------------- |:------------ |:---------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [user\_search](https://colivingproject.github.io/api-docs/?javascript#schemauser_search) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                     |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                     |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/search?query=Brownies&app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "album_count": 0,
      "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
      "cover_photo": {
        "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
        "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
      },
      "followee_count": 19,
      "follower_count": 11141,
      "handle": "TeamBandL",
      "id": "nlGNe",
      "is_verified": true,
      "location": "Los Angeles, CA",
      "name": "Brownies & Lemonade",
      "content_list_count": 2,
      "profile_picture": {
        "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
      },
      "repost_count": 5,
      "digital_content_count": 4
    }
  ]
}
```

### Get User <a id="get-user"></a>

`GET /users/{user_id}`

_Fetch a single user_

#### Query Parameters <a id="get-user-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| user\_id  | string | true     | A User ID     |
| app\_name | string | true     | Your app name |

#### Responses <a id="get-user-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                       |
|:------ |:-------------------------------------------------------------------------- |:------------ |:-------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [user\_response](https://colivingproject.github.io/api-docs/?javascript#schemauser_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                         |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                         |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/nlGNe?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": {
    "album_count": 0,
    "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
    "cover_photo": {
      "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
      "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
    },
    "followee_count": 19,
    "follower_count": 11141,
    "handle": "TeamBandL",
    "id": "nlGNe",
    "is_verified": true,
    "location": "Los Angeles, CA",
    "name": "Brownies & Lemonade",
    "content_list_count": 2,
    "profile_picture": {
      "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
      "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
      "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
    },
    "repost_count": 5,
    "digital_content_count": 4
  }
}
```

### Get User's Favorite DigitalContents <a id="get-user-39-s-favorite-digital-contents"></a>

`GET /users/{user_id}/favorites`

_Fetch favorited digitalContents for a user_

#### Query Parameters <a id="get-user&apos;s-favorite-digital-contents-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| user\_id  | string | true     | A User ID     |
| app\_name | string | true     | Your app name |

#### Responses <a id="get-user&apos;s-favorite-digital-contents-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                                 |
|:------ |:-------------------------------------------------------------------------- |:------------ |:------------------------------------------------------------------------------------------------------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [favorites\_response](https://colivingproject.github.io/api-docs/?javascript#schemafavorites_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                                   |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                                   |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/nlGNe/favorites?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "favorite_item_id": "n3yVD",
      "favorite_type": "SaveType.digital_content",
      "user_id": "nlGNe"
    },
    {
      "favorite_item_id": "nlv5l",
      "favorite_type": "SaveType.digital_content",
      "user_id": "nlGNe"
    },
    {
      "favorite_item_id": "ezYKz",
      "favorite_type": "SaveType.digital_content",
      "user_id": "nlGNe"
    }
  ]
}
```

### Get User's Reposts <a id="get-user-39-s-reposts"></a>

`GET /users/{user_id}/reposts`

#### Query Parameters <a id="get-user&apos;s-reposts-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| user\_id  | string | true     | A User ID     |
| limit       | string | false    | Limit         |
| offset      | string | false    | Offset        |
| app\_name | string | true     | Your app name |

#### Responses <a id="get-user&apos;s-reposts-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                        |
|:------ |:-------------------------------------------------------------------------- |:------------ |:----------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [reposts](https://colivingproject.github.io/api-docs/?javascript#schemareposts) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                          |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                          |


> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/string/reposts?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response
> 
> 200 Response

```json
{
  "data": [
    {
      "timestamp": "string",
      "item_type": {},
      "item": {}
    }
  ]
}
```

### Get User's Most Used DigitalContent Tags <a id="get-user-39-s-most-used-digital-content-tags"></a>

`GET /users/{user_id}/tags`

_Fetch most used tags in a user's digitalContents_

#### Query Parameters <a id="get-user&apos;s-most-used-digital-content-tags-parameters"></a>

| Name        | Type    | Required | Description                 |
|:----------- |:------- |:-------- |:--------------------------- |
| user\_id  | string  | true     | A User ID                   |
| limit       | integer | false    | Limit on the number of tags |
| app\_name | string  | true     | Your app name               |
| user\_id  | string  | true     | none                        |

#### Responses <a id="get-user&apos;s-most-used-digital-content-tags-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                       |
|:------ |:-------------------------------------------------------------------------- |:------------ |:-------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [tags\_response](https://colivingproject.github.io/api-docs/?javascript#schematags_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                         |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                         |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/string/tags?user_id=string&app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response
> 
> 200 Response

```json
{
  "data": [
    "string"
  ]
}
```

### Get User's DigitalContents <a id="get-user-39-s-digital-contents"></a>

`GET /users/{user_id}/digitalContents`

_Fetch a list of digitalContents for a user_

#### Query Parameters <a id="get-user&apos;s-digital-contents-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| user\_id  | string | true     | A User ID     |
| limit       | string | false    | Limit         |
| offset      | string | false    | Offset        |
| sort        | string | false    | Sort mode     |
| app\_name | string | true     | Your app name |

#### Responses <a id="get-user&apos;s-digital-contents-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                           |
|:------ |:-------------------------------------------------------------------------- |:------------ |:------------------------------------------------------------------------------------------------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digitalContents\_response](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                             |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                             |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/users/nlGNe/digitalContents?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/1000x1000.jpg"
      },
      "description": "@baauer b2b @partyfavormusic digitalcoin set at Brownies & Lemonade Block Party LA at The Shrine on 7.3.19.",
      "genre": "Electronic",
      "id": "D7KyD",
      "mood": "Fiery",
      "release_date": "Mon Sep 23 2019 12:35:10 GMT-0700",
      "repost_count": 47,
      "favorite_count": 143,
      "tags": "baauer,partyfavor,browniesandlemonade,digitalcoin",
      "title": "Paauer | Baauer B2B Party Favor | B&L Block Party LA (Digitalcoin Set)",
      "duration": 5265,
      "user": {
        "album_count": 0,
        "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
        "cover_photo": {
          "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
          "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
        },
        "followee_count": 19,
        "follower_count": 11141,
        "handle": "TeamBandL",
        "id": "nlGNe",
        "is_verified": true,
        "location": "Los Angeles, CA",
        "name": "Brownies & Lemonade",
        "content_list_count": 2,
        "profile_picture": {
          "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
          "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
          "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
        },
        "repost_count": 5,
        "digital_content_count": 4
      }
    }
  ]
}
```

## ContentLists <a id="api-content-lists"></a>

### Search ContentLists <a id="search-content-lists"></a>

`GET /contentLists/search`

_Search for a content_list_

#### Query Parameters <a id="search-content-lists-parameters"></a>

| Name                 | Type   | Required | Description   |
|:-------------------- |:------ |:-------- |:------------- |
| query                | string | true     | Search Query  |
| only\_downloadable | string | false    | none          |
| app\_name          | string | true     | Your app name |

#### Responses <a id="search-content-lists-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                                            |
|:------ |:-------------------------------------------------------------------------- |:------------ |:----------------------------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [contentList\_search\_result](https://colivingproject.github.io/api-docs/?javascript#schemacontent_list_search_result) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                                              |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                                              |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/contentLists/search?query=Hot & New&app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/150x150.jpg",
        "480x480": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/480x480.jpg",
        "1000x1000": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/1000x1000.jpg"
      },
      "description": "All the latest hot new digitalContents on Coliving! Enjoy the eclectic sounds that are created during the peak of this 2020 Summer.",
      "id": "DOPRl",
      "is_album": true,
      "content_list_name": "Hot & New on Coliving ????",
      "repost_count": 46,
      "favorite_count": 88,
      "user": {
        "album_count": 0,
        "bio": "The official Coliving account! Creating a decentralized and open-source streaming music platform controlled by landlords, residents, & developers.",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 69,
        "follower_count": 6763,
        "handle": "Coliving",
        "id": "eJ57D",
        "is_verified": true,
        "location": "SF & LA",
        "name": "Coliving",
        "content_list_count": 9,
        "profile_picture": {
          "150x150": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f",
          "480x480": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f",
          "1000x1000": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f"
        },
        "repost_count": 200,
        "digital_content_count": 0
      }
    }
  ]
}
```

### Get ContentList <a id="get-content-list"></a>

`GET /contentLists/{content_list_id}`

_Fetch a content_list_

#### Query Parameters <a id="get-content-list-parameters"></a>

| Name           | Type   | Required | Description   |
|:-------------- |:------ |:-------- |:------------- |
| contentList\_id | string | true     | A ContentList ID |
| app\_name    | string | true     | Your app name |

#### Responses <a id="get-content-list-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                               |
|:------ |:-------------------------------------------------------------------------- |:------------ |:---------------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [contentList\_response](https://colivingproject.github.io/api-docs/?javascript#schemacontent_list_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                                 |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                                 |


> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/contentLists/DOPRl?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": {
    "artwork": {
      "150x150": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/150x150.jpg",
      "480x480": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/480x480.jpg",
      "1000x1000": "https://usermetadata..co/ipfs/Qmc7RFzLGgW3DUTgKK49LzxEwe3Lmb47q85ZwJJRVYTXPr/1000x1000.jpg"
    },
    "description": "All the latest hot new digitalContents on Coliving! Enjoy the eclectic sounds that are created during the peak of this 2020 Summer.",
    "id": "DOPRl",
    "is_album": true,
    "content_list_name": "Hot & New on Coliving ????",
    "repost_count": 46,
    "favorite_count": 88,
    "user": {
      "album_count": 0,
      "bio": "The official Coliving account! Creating a decentralized and open-source streaming music platform controlled by landlords, residents, & developers.",
      "cover_photo": {
        "640x": "string",
        "2000x": "string"
      },
      "followee_count": 69,
      "follower_count": 6763,
      "handle": "Coliving",
      "id": "eJ57D",
      "is_verified": true,
      "location": "SF & LA",
      "name": "Coliving",
      "content_list_count": 9,
      "profile_picture": {
        "150x150": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f",
        "480x480": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f",
        "1000x1000": "https://usermetadata..co/ipfs/QmNjJv1wQf2DJq3GNXjXzSL8UXFUGXfchg4NhL7UpbnF1f"
      },
      "repost_count": 200,
      "digital_content_count": 0
    }
  }
}
```

### Get ContentList DigitalContents <a id="get-content-list-digital-contents"></a>

`GET /contentLists/{content_list_id}/digitalContents`

_Fetch digitalContents within a content_list_

#### Query Parameters <a id="get-content-list-digital-contents-parameters"></a>

| Name           | Type   | Required | Description   |
|:-------------- |:------ |:-------- |:------------- |
| contentList\_id | string | true     | A ContentList ID |
| app\_name    | string | true     | Your app name |

#### Responses <a id="get-content-list-digital-contents-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                                                |
|:------ |:-------------------------------------------------------------------------- |:------------ |:--------------------------------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [contentList\_digital_contents\_response](https://colivingproject.github.io/api-docs/?javascript#schemacontent_list_digital_contents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                                                  |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                                                  |


> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/contentLists/DOPRl/digitalContents?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/1000x1000.jpg"
      },
      "description": "@baauer b2b @partyfavormusic digitalcoin set at Brownies & Lemonade Block Party LA at The Shrine on 7.3.19.",
      "genre": "Electronic",
      "id": "D7KyD",
      "mood": "Fiery",
      "release_date": "Mon Sep 23 2019 12:35:10 GMT-0700",
      "repost_count": 47,
      "favorite_count": 143,
      "tags": "baauer,partyfavor,browniesandlemonade,digitalcoin",
      "title": "Paauer | Baauer B2B Party Favor | B&L Block Party LA (Digitalcoin Set)",
      "duration": 5265,
      "user": {
        "album_count": 0,
        "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
        "cover_photo": {
          "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
          "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
        },
        "followee_count": 19,
        "follower_count": 11141,
        "handle": "TeamBandL",
        "id": "nlGNe",
        "is_verified": true,
        "location": "Los Angeles, CA",
        "name": "Brownies & Lemonade",
        "content_list_count": 2,
        "profile_picture": {
          "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
          "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
          "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
        },
        "repost_count": 5,
        "digital_content_count": 4
      }
    }
  ]
}
```

## DigitalContents <a id="api-digital-contents"></a>

### Search DigitalContents <a id="search-digital-contents"></a>

`GET /digital_contents/search`

_Search for a digital_content_

#### Query Parameters <a id="search-digital-contents-parameters"></a>

| Name                 | Type   | Required | Description                     |
|:-------------------- |:------ |:-------- |:------------------------------- |
| query                | string | true     | Search Query                    |
| only\_downloadable | string | false    | Return only downloadable digitalContents |
| app\_name          | string | true     | Your app name                   |

#### Responses <a id="search-digital-contents-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                     |
|:------ |:-------------------------------------------------------------------------- |:------------ |:------------------------------------------------------------------------------------------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digital_content\_search](https://colivingproject.github.io/api-docs/?javascript#schemadigital_content_search) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                       |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                       |



> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/digital_contents/search?query=baauer b2b&app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/1000x1000.jpg"
      },
      "description": "@baauer b2b @partyfavormusic digitalcoin set at Brownies & Lemonade Block Party LA at The Shrine on 7.3.19.",
      "genre": "Electronic",
      "id": "D7KyD",
      "mood": "Fiery",
      "release_date": "Mon Sep 23 2019 12:35:10 GMT-0700",
      "repost_count": 47,
      "favorite_count": 143,
      "tags": "baauer,partyfavor,browniesandlemonade,digitalcoin",
      "title": "Paauer | Baauer B2B Party Favor | B&L Block Party LA (Digitalcoin Set)",
      "duration": 5265,
      "user": {
        "album_count": 0,
        "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
        "cover_photo": {
          "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
          "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
        },
        "followee_count": 19,
        "follower_count": 11141,
        "handle": "TeamBandL",
        "id": "nlGNe",
        "is_verified": true,
        "location": "Los Angeles, CA",
        "name": "Brownies & Lemonade",
        "content_list_count": 2,
        "profile_picture": {
          "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
          "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
          "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
        },
        "repost_count": 5,
        "digital_content_count": 4
      }
    }
  ]
}
```

### Trending DigitalContents <a id="trending-digital-contents"></a>

`GET /digital_contents/trending`

_Gets the top 100 trending \(most popular\) digitalContents on Coliving_

#### Query Parameters <a id="trending-digital-contents-parameters"></a>

| Name        | Type   | Required | Description                                                            |
|:----------- |:------ |:-------- |:---------------------------------------------------------------------- |
| genre       | string | false    | Trending digitalContents for a specified genre                                  |
| time        | string | false    | Trending digitalContents over a specified time range \(week, month, allTime\) |
| app\_name | string | true     | Your app name                                                          |

#### Responses <a id="trending-digital-contents-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                           |
|:------ |:-------------------------------------------------------------------------- |:------------ |:------------------------------------------------------------------------------------------------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digitalContents\_response](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                             |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                             |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/digital_contents/trending?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/1000x1000.jpg"
      },
      "description": "@baauer b2b @partyfavormusic digitalcoin set at Brownies & Lemonade Block Party LA at The Shrine on 7.3.19.",
      "genre": "Electronic",
      "id": "D7KyD",
      "mood": "Fiery",
      "release_date": "Mon Sep 23 2019 12:35:10 GMT-0700",
      "repost_count": 47,
      "favorite_count": 143,
      "tags": "baauer,partyfavor,browniesandlemonade,digitalcoin",
      "title": "Paauer | Baauer B2B Party Favor | B&L Block Party LA (Digitalcoin Set)",
      "duration": 5265,
      "user": {
        "album_count": 0,
        "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
        "cover_photo": {
          "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
          "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
        },
        "followee_count": 19,
        "follower_count": 11141,
        "handle": "TeamBandL",
        "id": "nlGNe",
        "is_verified": true,
        "location": "Los Angeles, CA",
        "name": "Brownies & Lemonade",
        "content_list_count": 2,
        "profile_picture": {
          "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
          "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
          "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
        },
        "repost_count": 5,
        "digital_content_count": 4
      }
    }
  ]
}
```

### Get DigitalContent <a id="get-digital-content"></a>

`GET /digital_contents/{digital_content_id}`

_Fetch a digital_content_

#### Query Parameters <a id="get-digital-content-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| digital_content\_id | string | true     | A DigitalContent ID    |
| app\_name | string | true     | Your app name |

#### Responses <a id="get-digital-content-responses"></a>

| Status | Meaning                                                                    | Description  | Schema                                                                                         |
|:------ |:-------------------------------------------------------------------------- |:------------ |:---------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digital_content\_response](https://colivingproject.github.io/api-docs/?javascript#schemadigital_content_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                                           |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                                           |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/digital_contents/D7KyD?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response

```json
{
  "data": {
    "artwork": {
      "150x150": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/150x150.jpg",
      "480x480": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/480x480.jpg",
      "1000x1000": "https://creatornode..co/ipfs/QmVJjA6zXhDZn3BjcjYa33P9NDiPZj7Vyq9TCx1bHjvHmG/1000x1000.jpg"
    },
    "description": "@baauer b2b @partyfavormusic digitalcoin set at Brownies & Lemonade Block Party LA at The Shrine on 7.3.19.",
    "genre": "Electronic",
    "id": "D7KyD",
    "mood": "Fiery",
    "release_date": "Mon Sep 23 2019 12:35:10 GMT-0700",
    "repost_count": 47,
    "favorite_count": 143,
    "tags": "baauer,partyfavor,browniesandlemonade,digitalcoin",
    "title": "Paauer | Baauer B2B Party Favor | B&L Block Party LA (Digitalcoin Set)",
    "duration": 5265,
    "user": {
      "album_count": 0,
      "bio": "Makin' moves & keeping you on your toes. linktr.ee/browniesandlemonade",
      "cover_photo": {
        "640x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/640x.jpg",
        "2000x": "https://creatornode..co/ipfs/QmXVMM1RVqP6EFKuDq49HYq5aNSKXd24S7vcxR7qcPom6e/2000x.jpg"
      },
      "followee_count": 19,
      "follower_count": 11141,
      "handle": "TeamBandL",
      "id": "nlGNe",
      "is_verified": true,
      "location": "Los Angeles, CA",
      "name": "Brownies & Lemonade",
      "content_list_count": 2,
      "profile_picture": {
        "150x150": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/150x150.jpg",
        "480x480": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/480x480.jpg",
        "1000x1000": "https://creatornode..co/ipfs/QmU9L4beAM96MpiNqqVTZdiDiCRTeBku1AJCh3NXrE5PxV/1000x1000.jpg"
      },
      "repost_count": 5,
      "digital_content_count": 4
    }
  }
}
```

### Stream DigitalContent <a id="stream-digital-content"></a>

`GET /digital_contents/{digital_content_id}/stream`

_Get the digital_content's streamable mp3 file_

This endpoint accepts the Range header for streaming. https://developer.mozilla.org/en-US/docs/Web/HTTP/Range\_requests

#### Query Parameters <a id="stream-digital-content-parameters"></a>

| Name        | Type   | Required | Description   |
|:----------- |:------ |:-------- |:------------- |
| digital_content\_id | string | true     | A DigitalContent ID    |
| app\_name | string | true     | Your app name |

#### Responses <a id="stream-digital-content-responses"></a>

| Status | Meaning                                                                    | Description           | Schema |
|:------ |:-------------------------------------------------------------------------- |:--------------------- |:------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success               | None   |
| 216    | Unknown                                                                    | Partial content       | None   |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request           | None   |
| 416    | [Range Not Satisfiable](https://tools.ietf.org/html/rfc7233#section-4.4)   | Content range invalid | None   |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error          | None   |

> Code Sample

```javascript

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/digital_contents/D7KyD/stream?app_name=EXAMPLEAPP',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

## Metrics <a id="api-metrics"></a>

### get\_trailing\_app\_name\_metrics <a id="get_trailing_app_name_metrics"></a>

`GET /metrics/app_name/trailing/{time_range}`

_Gets trailing app name metrics from matview_

#### Query Parameters <a id="get_trailing_app_name_metrics-parameters"></a>

| Name          | Type   | Required | Description   |
|:------------- |:------ |:-------- |:------------- |
| app\_name   | string | true     | Your app name |
| time\_range | string | true     | none          |

#### Responses <a id="get_trailing_app_name_metrics-responses"></a>

| Status | Meaning                                                 | Description | Schema                                                                                                                       |
|:------ |:------------------------------------------------------- |:----------- |:---------------------------------------------------------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1) | Success     | [app\_name\_trailing\_response](https://colivingproject.github.io/api-docs/?javascript#schemaapp_name_trailing_response) |

> Code Sample

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/metrics/app_name/trailing/string?app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

> Example Response
> 
> 200 Response

```json
{
  "data": [
    {
      "count": 0,
      "name": "string"
    }
  ]
}
```

## Resolve <a id="api-resolve"></a>

### Resolve <a id="resolve"></a>

> Code Sample

`GET /resolve`

_Resolves and redirects a provided Coliving app URL to the API resource URL it represents_

This endpoint allows you to lookup and access API resources when you only know the .co URL. DigitalContents, ContentLists, and Users are supported.

#### Query Parameters <a id="resolve-parameters"></a>

| Name        | Type   | Required | Description                                                                               |
|:----------- |:------ |:-------- |:----------------------------------------------------------------------------------------- |
| url         | string | true     | URL to resolve. Either fully formed URL \(https://.co\) or just the absolute path |
| app\_name | string | true     | Your app name                                                                             |

> Example Response
> 
> Internal redirect

```text
{"HTTP/1.1 302 Found Location":"/v1/digital_contents/V4W8r"}
```

#### Responses <a id="resolve-responses"></a>

| Status | Meaning                                                    | Description       | Schema |
|:------ |:---------------------------------------------------------- |:----------------- |:------ |
| 302    | [Found](https://tools.ietf.org/html/rfc7231#section-6.4.3) | Internal redirect | None   |

#### Response Schema <a id="resolve-responseschema"></a>

```javascript

const headers = {
  'Accept':'text/plain'
};

fetch('https://discoverynode.coliving1.prod-us-west-2.staked.cloud/v1/resolve?url=https://.co/camouflybeats/hypermantra-86216&app_name=EXAMPLEAPP',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```


## Schemas <a id="schemas"></a>

The following are examples of response formats you can expect to receive from the API.

### user\_response <a id="tocS_user_response"></a>

```json
{
  "data": {
    "album_count": 0,
    "bio": "string",
    "cover_photo": {
      "640x": "string",
      "2000x": "string"
    },
    "followee_count": 0,
    "follower_count": 0,
    "handle": "string",
    "id": "string",
    "is_verified": true,
    "location": "string",
    "name": "string",
    "content_list_count": 0,
    "profile_picture": {
      "150x150": "string",
      "480x480": "string",
      "1000x1000": "string"
    },
    "repost_count": 0,
    "digital_content_count": 0
  }
}

```

#### Properties <a id="properties"></a>

| Name | Type                                                                    | Required | Restrictions | Description |
|:---- |:----------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | [user](https://colivingproject.github.io/api-docs/?javascript#schemauser) | false    | none         | none        |

### user <a id="tocS_user"></a>

```json
{
  "album_count": 0,
  "bio": "string",
  "cover_photo": {
    "640x": "string",
    "2000x": "string"
  },
  "followee_count": 0,
  "follower_count": 0,
  "handle": "string",
  "id": "string",
  "is_verified": true,
  "location": "string",
  "name": "string",
  "content_list_count": 0,
  "profile_picture": {
    "150x150": "string",
    "480x480": "string",
    "1000x1000": "string"
  },
  "repost_count": 0,
  "digital_content_count": 0
}

```

#### Properties <a id="properties-2"></a>

| Name               | Type                                                                                             | Required | Restrictions | Description |
|:------------------ |:------------------------------------------------------------------------------------------------ |:-------- |:------------ |:----------- |
| album\_count     | integer                                                                                          | true     | none         | none        |
| bio                | string                                                                                           | false    | none         | none        |
| cover\_photo     | [cover\_photo](https://colivingproject.github.io/api-docs/?javascript#schemacover_photo)         | false    | none         | none        |
| followee\_count  | integer                                                                                          | true     | none         | none        |
| follower\_count  | integer                                                                                          | true     | none         | none        |
| handle             | string                                                                                           | true     | none         | none        |
| id                 | string                                                                                           | true     | none         | none        |
| is\_verified     | boolean                                                                                          | true     | none         | none        |
| location           | string                                                                                           | false    | none         | none        |
| name               | string                                                                                           | true     | none         | none        |
| contentList\_count  | integer                                                                                          | true     | none         | none        |
| profile\_picture | [profile\_picture](https://colivingproject.github.io/api-docs/?javascript#schemaprofile_picture) | false    | none         | none        |
| repost\_count    | integer                                                                                          | true     | none         | none        |
| digital_content\_count     | integer                                                                                          | true     | none         | none        |

### cover\_photo <a id="tocS_cover_photo"></a>

```json
{
  "640x": "string",
  "2000x": "string"
}

```

#### Properties <a id="properties-3"></a>

| Name  | Type   | Required | Restrictions | Description |
|:----- |:------ |:-------- |:------------ |:----------- |
| 640x  | string | false    | none         | none        |
| 2000x | string | false    | none         | none        |

### profile\_picture <a id="tocS_profile_picture"></a>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

#### Properties <a id="properties-4"></a>

| Name      | Type   | Required | Restrictions | Description |
|:--------- |:------ |:-------- |:------------ |:----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

### digitalContents\_response <a id="tocS_digital_contents_response"></a>

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "description": "string",
      "genre": "string",
      "id": "string",
      "mood": "string",
      "release_date": "string",
      "remix_of": {
        "digitalContents": [
          {
            "parent_digital_content_id": "string"
          }
        ]
      },
      "repost_count": 0,
      "favorite_count": 0,
      "tags": "string",
      "title": "string",
      "user": {
        "album_count": 0,
        "bio": "string",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 0,
        "follower_count": 0,
        "handle": "string",
        "id": "string",
        "is_verified": true,
        "location": "string",
        "name": "string",
        "content_list_count": 0,
        "profile_picture": {
          "150x150": "string",
          "480x480": "string",
          "1000x1000": "string"
        },
        "repost_count": 0,
        "digital_content_count": 0
      },
      "duration": 0,
      "downloadable": true,
      "play_count": 0
    }
  ]
}

```

#### Properties <a id="properties-5"></a>

| Name | Type                                                                            | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[DigitalContent](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContent)\] | false    | none         | none        |

### DigitalContent <a id="tocS_DigitalContent"></a>

```json
{
  "artwork": {
    "150x150": "string",
    "480x480": "string",
    "1000x1000": "string"
  },
  "description": "string",
  "genre": "string",
  "id": "string",
  "mood": "string",
  "release_date": "string",
  "remix_of": {
    "digitalContents": [
      {
        "parent_digital_content_id": "string"
      }
    ]
  },
  "repost_count": 0,
  "favorite_count": 0,
  "tags": "string",
  "title": "string",
  "user": {
    "album_count": 0,
    "bio": "string",
    "cover_photo": {
      "640x": "string",
      "2000x": "string"
    },
    "followee_count": 0,
    "follower_count": 0,
    "handle": "string",
    "id": "string",
    "is_verified": true,
    "location": "string",
    "name": "string",
    "content_list_count": 0,
    "profile_picture": {
      "150x150": "string",
      "480x480": "string",
      "1000x1000": "string"
    },
    "repost_count": 0,
    "digital_content_count": 0
  },
  "duration": 0,
  "downloadable": true,
  "play_count": 0
}

```

#### Properties <a id="properties-6"></a>

| Name              | Type                                                                                         | Required | Restrictions | Description |
|:----------------- |:-------------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| artwork           | [digital_content\_artwork](https://colivingproject.github.io/api-docs/?javascript#schemadigital_content_artwork) | false    | none         | none        |
| description       | string                                                                                       | false    | none         | none        |
| genre             | string                                                                                       | false    | none         | none        |
| id                | string                                                                                       | true     | none         | none        |
| mood              | string                                                                                       | false    | none         | none        |
| release\_date   | string                                                                                       | false    | none         | none        |
| remix\_of       | [remix\_parent](https://colivingproject.github.io/api-docs/?javascript#schemaremix_parent)   | false    | none         | none        |
| repost\_count   | integer                                                                                      | true     | none         | none        |
| favorite\_count | integer                                                                                      | true     | none         | none        |
| tags              | string                                                                                       | false    | none         | none        |
| title             | string                                                                                       | true     | none         | none        |
| user              | [user](https://colivingproject.github.io/api-docs/?javascript#schemauser)                      | true     | none         | none        |
| duration          | integer                                                                                      | true     | none         | none        |
| downloadable      | boolean                                                                                      | false    | none         | none        |
| play\_count     | integer                                                                                      | true     | none         | none        |

### digital_content\_artwork <a id="tocS_digital_content_artwork"></a>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

#### Properties <a id="properties-7"></a>

| Name      | Type   | Required | Restrictions | Description |
|:--------- |:------ |:-------- |:------------ |:----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

### remix\_parent <a id="tocS_remix_parent"></a>

```json
{
  "digitalContents": [
    {
      "parent_digital_content_id": "string"
    }
  ]
}

```

#### Properties <a id="properties-8"></a>

| Name   | Type                                                                                               | Required | Restrictions | Description |
|:------ |:-------------------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| digitalContents | \[[digital_content\_element](https://colivingproject.github.io/api-docs/?javascript#schemadigital_content_element)\] | false    | none         | none        |

### digital_content\_element <a id="tocS_digital_content_element"></a>

```json
{
  "parent_digital_content_id": "string"
}

```

#### Properties <a id="properties-9"></a>

| Name                  | Type   | Required | Restrictions | Description |
|:--------------------- |:------ |:-------- |:------------ |:----------- |
| parent\_digital_content\_id | string | true     | none         | none        |

### reposts <a id="tocS_reposts"></a>

```json
{
  "data": [
    {
      "timestamp": "string",
      "item_type": {},
      "item": {}
    }
  ]
}

```

#### Properties <a id="properties-10"></a>

| Name | Type                                                                                  | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[activity](https://colivingproject.github.io/api-docs/?javascript#schemaactivity)\] | false    | none         | none        |

### activity <a id="tocS_activity"></a>

```json
{
  "timestamp": "string",
  "item_type": {},
  "item": {}
}

```

#### Properties <a id="properties-11"></a>

| Name         | Type   | Required | Restrictions | Description |
|:------------ |:------ |:-------- |:------------ |:----------- |
| timestamp    | string | false    | none         | none        |
| item\_type | object | false    | none         | none        |
| item         | object | false    | none         | none        |

### favorites\_response <a id="tocS_favorites_response"></a>

```json
{
  "data": [
    {
      "favorite_item_id": "string",
      "favorite_type": "string",
      "user_id": "string"
    }
  ]
}

```

#### Properties <a id="properties-12"></a>

| Name | Type                                                                                  | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[favorite](https://colivingproject.github.io/api-docs/?javascript#schemafavorite)\] | false    | none         | none        |

### favorite <a id="tocS_favorite"></a>

```json
{
  "favorite_item_id": "string",
  "favorite_type": "string",
  "user_id": "string"
}

```

#### Properties <a id="properties-13"></a>

| Name                   | Type   | Required | Restrictions | Description |
|:---------------------- |:------ |:-------- |:------------ |:----------- |
| favorite\_item\_id | string | true     | none         | none        |
| favorite\_type       | string | true     | none         | none        |
| user\_id             | string | true     | none         | none        |

### tags\_response <a id="tocS_tags_response"></a>

```json
{
  "data": [
    "string"
  ]
}

```

#### Properties <a id="properties-14"></a>

| Name | Type         | Required | Restrictions | Description |
|:---- |:------------ |:-------- |:------------ |:----------- |
| data | \[string\] | false    | none         | none        |

### user\_search <a id="tocS_user_search"></a>

```json
{
  "data": [
    {
      "album_count": 0,
      "bio": "string",
      "cover_photo": {
        "640x": "string",
        "2000x": "string"
      },
      "followee_count": 0,
      "follower_count": 0,
      "handle": "string",
      "id": "string",
      "is_verified": true,
      "location": "string",
      "name": "string",
      "content_list_count": 0,
      "profile_picture": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "repost_count": 0,
      "digital_content_count": 0
    }
  ]
}

```

#### Properties <a id="properties-15"></a>

| Name | Type                                                                          | Required | Restrictions | Description |
|:---- |:----------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[user](https://colivingproject.github.io/api-docs/?javascript#schemauser)\] | false    | none         | none        |

### contentList\_response <a id="tocS_content_list_response"></a>

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "description": "string",
      "id": "string",
      "is_album": true,
      "content_list_name": "string",
      "repost_count": 0,
      "favorite_count": 0,
      "total_play_count": 0,
      "user": {
        "album_count": 0,
        "bio": "string",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 0,
        "follower_count": 0,
        "handle": "string",
        "id": "string",
        "is_verified": true,
        "location": "string",
        "name": "string",
        "content_list_count": 0,
        "profile_picture": {
          "150x150": "string",
          "480x480": "string",
          "1000x1000": "string"
        },
        "repost_count": 0,
        "digital_content_count": 0
      }
    }
  ]
}

```

#### Properties <a id="properties-16"></a>

| Name | Type                                                                                  | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[contentList](https://colivingproject.github.io/api-docs/?javascript#schemacontentList)\] | false    | none         | none        |

### contentList <a id="tocS_content_list"></a>

```json
{
  "artwork": {
    "150x150": "string",
    "480x480": "string",
    "1000x1000": "string"
  },
  "description": "string",
  "id": "string",
  "is_album": true,
  "content_list_name": "string",
  "repost_count": 0,
  "favorite_count": 0,
  "total_play_count": 0,
  "user": {
    "album_count": 0,
    "bio": "string",
    "cover_photo": {
      "640x": "string",
      "2000x": "string"
    },
    "followee_count": 0,
    "follower_count": 0,
    "handle": "string",
    "id": "string",
    "is_verified": true,
    "location": "string",
    "name": "string",
    "content_list_count": 0,
    "profile_picture": {
      "150x150": "string",
      "480x480": "string",
      "1000x1000": "string"
    },
    "repost_count": 0,
    "digital_content_count": 0
  }
}

```

#### Properties <a id="properties-17"></a>

| Name                   | Type                                                                                               | Required | Restrictions | Description |
|:---------------------- |:-------------------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| artwork                | [contentList\_artwork](https://colivingproject.github.io/api-docs/?javascript#schemacontent_list_artwork) | false    | none         | none        |
| description            | string                                                                                             | false    | none         | none        |
| id                     | string                                                                                             | true     | none         | none        |
| is\_album            | boolean                                                                                            | true     | none         | none        |
| contentList\_name       | string                                                                                             | true     | none         | none        |
| repost\_count        | integer                                                                                            | true     | none         | none        |
| favorite\_count      | integer                                                                                            | true     | none         | none        |
| total\_play\_count | integer                                                                                            | true     | none         | none        |
| user                   | [user](https://colivingproject.github.io/api-docs/?javascript#schemauser)                            | true     | none         | none        |

### contentList\_artwork <a id="tocS_content_list_artwork"></a>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

#### Properties <a id="properties-18"></a>

| Name      | Type   | Required | Restrictions | Description |
|:--------- |:------ |:-------- |:------------ |:----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

### contentList\_digital_contents\_response <a id="tocS_content_list_digital_contents_response"></a>

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "description": "string",
      "genre": "string",
      "id": "string",
      "mood": "string",
      "release_date": "string",
      "remix_of": {
        "digitalContents": [
          {
            "parent_digital_content_id": "string"
          }
        ]
      },
      "repost_count": 0,
      "favorite_count": 0,
      "tags": "string",
      "title": "string",
      "user": {
        "album_count": 0,
        "bio": "string",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 0,
        "follower_count": 0,
        "handle": "string",
        "id": "string",
        "is_verified": true,
        "location": "string",
        "name": "string",
        "content_list_count": 0,
        "profile_picture": {
          "150x150": "string",
          "480x480": "string",
          "1000x1000": "string"
        },
        "repost_count": 0,
        "digital_content_count": 0
      },
      "duration": 0,
      "downloadable": true,
      "play_count": 0
    }
  ]
}

```

#### Properties <a id="properties-19"></a>

| Name | Type                                                                            | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[DigitalContent](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContent)\] | false    | none         | none        |

### contentList\_search\_result <a id="tocS_content_list_search_result"></a>

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "description": "string",
      "id": "string",
      "is_album": true,
      "content_list_name": "string",
      "repost_count": 0,
      "favorite_count": 0,
      "total_play_count": 0,
      "user": {
        "album_count": 0,
        "bio": "string",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 0,
        "follower_count": 0,
        "handle": "string",
        "id": "string",
        "is_verified": true,
        "location": "string",
        "name": "string",
        "content_list_count": 0,
        "profile_picture": {
          "150x150": "string",
          "480x480": "string",
          "1000x1000": "string"
        },
        "repost_count": 0,
        "digital_content_count": 0
      }
    }
  ]
}

```

#### Properties <a id="properties-20"></a>

| Name | Type                                                                                  | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[contentList](https://colivingproject.github.io/api-docs/?javascript#schemacontentList)\] | false    | none         | none        |

### digital_content\_response <a id="tocS_digital_content_response"></a>

```json
{
  "data": {
    "artwork": {
      "150x150": "string",
      "480x480": "string",
      "1000x1000": "string"
    },
    "description": "string",
    "genre": "string",
    "id": "string",
    "mood": "string",
    "release_date": "string",
    "remix_of": {
      "digitalContents": [
        {
          "parent_digital_content_id": "string"
        }
      ]
    },
    "repost_count": 0,
    "favorite_count": 0,
    "tags": "string",
    "title": "string",
    "user": {
      "album_count": 0,
      "bio": "string",
      "cover_photo": {
        "640x": "string",
        "2000x": "string"
      },
      "followee_count": 0,
      "follower_count": 0,
      "handle": "string",
      "id": "string",
      "is_verified": true,
      "location": "string",
      "name": "string",
      "content_list_count": 0,
      "profile_picture": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "repost_count": 0,
      "digital_content_count": 0
    },
    "duration": 0,
    "downloadable": true,
    "play_count": 0
  }
}

```

#### Properties <a id="properties-21"></a>

| Name | Type                                                                      | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | [DigitalContent](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContent) | false    | none         | none        |

### digital_content\_search <a id="tocS_digital_content_search"></a>

```json
{
  "data": [
    {
      "artwork": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "description": "string",
      "genre": "string",
      "id": "string",
      "mood": "string",
      "release_date": "string",
      "remix_of": {
        "digitalContents": [
          {
            "parent_digital_content_id": "string"
          }
        ]
      },
      "repost_count": 0,
      "favorite_count": 0,
      "tags": "string",
      "title": "string",
      "user": {
        "album_count": 0,
        "bio": "string",
        "cover_photo": {
          "640x": "string",
          "2000x": "string"
        },
        "followee_count": 0,
        "follower_count": 0,
        "handle": "string",
        "id": "string",
        "is_verified": true,
        "location": "string",
        "name": "string",
        "content_list_count": 0,
        "profile_picture": {
          "150x150": "string",
          "480x480": "string",
          "1000x1000": "string"
        },
        "repost_count": 0,
        "digital_content_count": 0
      },
      "duration": 0,
      "downloadable": true,
      "play_count": 0
    }
  ]
}

```

#### Properties <a id="properties-22"></a>

| Name | Type                                                                            | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------- |:-------- |:------------ |:----------- |
| data | \[[DigitalContent](https://colivingproject.github.io/api-docs/?javascript#schemadigitalContent)\] | false    | none         | none        |

### app\_name\_trailing\_response <a id="tocS_app_name_trailing_response"></a>

```json
{
  "data": [
    {
      "count": 0,
      "name": "string"
    }
  ]
}

```

#### Properties <a id="properties-23"></a>

| Name | Type                                                                                                                           | Required | Restrictions | Description |
|:---- |:------------------------------------------------------------------------------------------------------------------------------ |:-------- |:------------ |:----------- |
| data | \[[app\_name\_trailing\_metric](https://colivingproject.github.io/api-docs/?javascript#schemaapp_name_trailing_metric)\] | false    | none         | none        |

### app\_name\_trailing\_metric <a id="tocS_app_name_trailing_metric"></a>

```json
{
  "count": 0,
  "name": "string"
}

```

#### Properties <a id="properties-24"></a>

| Name  | Type    | Required | Restrictions | Description |
|:----- |:------- |:-------- |:------------ |:----------- |
| count | integer | false    | none         | none        |
| name  | string  | false    | none         | none        |
