

<h1 id="api-users">users</h1>

## Get the User's id by associated wallet

<a id="opIdGet the User's id by associated wallet"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/associated_wallets?id=string 


```

```http
GET COLIVING_API_HOST/v1/users/associated_wallets?id=string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/associated_wallets?id=string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/associated_wallets',
  params: {
  'id' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/associated_wallets', params={
  'id': 'string'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/associated_wallets', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/associated_wallets?id=string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/associated_wallets", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/associated_wallets`

<h3 id="get-the-user's-id-by-associated-wallet-parameters">Query Parameters</h3>

| Name | Type   | Required | Description     |
| ---- | ------ | -------- | --------------- |
| id   | string | true     | Encoded User ID |

> Example Response

> 200 Response

```json
{
  "data": {
    "wallets": [
      "string"
    ],
    "sol_wallets": [
      "string"
    ]
  }
}
```

<h3 id="get-the-user's-id-by-associated-wallet-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                              |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [associated_wallets_response](#schemaassociated_wallets_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                |

## Get the User's associated wallets

<a id="opIdGet the User's associated wallets"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/id?associated_wallet=string 


```

```http
GET COLIVING_API_HOST/v1/users/id?associated_wallet=string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/id?associated_wallet=string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/id',
  params: {
  'associated_wallet' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/id', params={
  'associated_wallet': 'string'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/id', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/id?associated_wallet=string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/id", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/id`

<h3 id="get-the-user's-associated-wallets-parameters">Query Parameters</h3>

| Name              | Type   | Required | Description    |
| ----------------- | ------ | -------- | -------------- |
| associated_wallet | string | true     | Wallet address |

> Example Response

> 200 Response

```json
{
  "data": {
    "user_id": "string"
  }
}
```

<h3 id="get-the-user's-associated-wallets-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                                      |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [user_associated_wallet_response](#schemauser_associated_wallet_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                        |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                        |

## Search Users

<a id="opIdSearch Users"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/search?query=Brownies 


```

```http
GET COLIVING_API_HOST/v1/users/search?query=Brownies HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/search?query=Brownies',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/search',
  params: {
  'query' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/search', params={
  'query': 'Brownies'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/search', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/search?query=Brownies");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/search", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/search`

*Seach for a user*

<h3 id="search-users-parameters">Query Parameters</h3>

| Name              | Type   | Required | Description  |
| ----------------- | ------ | -------- | ------------ |
| query             | string | true     | Search query |
| only_downloadable | string | false    | none         |

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

<h3 id="search-users-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                            |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [user_search](#schemauser_search) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                              |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                              |

## Get User

<a id="opIdGet User"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/nlGNe 


```

```http
GET COLIVING_API_HOST/v1/users/nlGNe HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/nlGNe',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/nlGNe',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/nlGNe', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/nlGNe', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/nlGNe");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/nlGNe", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}`

*Fetch a single user*

<h3 id="get-user-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| user_id | string | true     | A User ID   |

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

<h3 id="get-user-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [user_response](#schemauser_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                  |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                  |

## The users's ID

<a id="opIdThe users's ID"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/string/challenges 


```

```http
GET COLIVING_API_HOST/v1/users/string/challenges HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/string/challenges',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/string/challenges',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/string/challenges', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/string/challenges', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/string/challenges");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/string/challenges", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}/challenges`

<h3 id="the-users's-id-parameters">Query Parameters</h3>

| Name            | Type   | Required | Description                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------- |
| show_historical | string | false    | Whether to show challenges that are inactive but completed |
| user_id         | string | true     | none                                                       |

> Example Response

> 200 Response

```json
{
  "data": [
    {
      "challenge_id": "string",
      "user_id": "string",
      "specifier": "string",
      "is_complete": true,
      "is_active": true,
      "is_disbursed": true,
      "current_step_count": 0,
      "max_steps": 0,
      "challenge_type": "string",
      "metadata": {}
    }
  ]
}
```

<h3 id="the-users's-id-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                  |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [get_challenges](#schemaget_challenges) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                    |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                    |

## Get User's Favorite DigitalContents

<a id="opIdGet User's Favorite DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/nlGNe/favorites 


```

```http
GET COLIVING_API_HOST/v1/users/nlGNe/favorites HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/nlGNe/favorites',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/nlGNe/favorites',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/nlGNe/favorites', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/nlGNe/favorites', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/nlGNe/favorites");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/nlGNe/favorites", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}/favorites`

*Fetch favorited digitalContents for a user*

<h3 id="get-user's-favorite-digital-contents-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| user_id | string | true     | A User ID   |

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

<h3 id="get-user's-favorite-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                          |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [favorites_response](#schemafavorites_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                            |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                            |

## Get User's Reposts

<a id="opIdGet User's Reposts"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/string/reposts 


```

```http
GET COLIVING_API_HOST/v1/users/string/reposts HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/string/reposts',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/string/reposts',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/string/reposts', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/string/reposts', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/string/reposts");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/string/reposts", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}/reposts`

<h3 id="get-user's-reposts-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| user_id | string | true     | A User ID   |
| limit   | string | false    | Limit       |
| offset  | string | false    | Offset      |

> Example Response

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

<h3 id="get-user's-reposts-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                    |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [reposts](#schemareposts) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                      |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                      |

## Get User's Most Used DigitalContent Tags

<a id="opIdGet User's Most Used DigitalContent Tags"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/string/tags?user_id=string 


```

```http
GET COLIVING_API_HOST/v1/users/string/tags?user_id=string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/string/tags?user_id=string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/string/tags',
  params: {
  'user_id' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/string/tags', params={
  'user_id': 'string'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/string/tags', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/string/tags?user_id=string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/string/tags", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}/tags`

*Fetch most used tags in a user's digitalContents*

<h3 id="get-user's-most-used-digital-content-tags-parameters">Query Parameters</h3>

| Name    | Type    | Required | Description                 |
| ------- | ------- | -------- | --------------------------- |
| user_id | string  | true     | A User ID                   |
| limit   | integer | false    | Limit on the number of tags |
| user_id | string  | true     | none                        |

> Example Response

> 200 Response

```json
{
  "data": [
    "string"
  ]
}
```

<h3 id="get-user's-most-used-digital-content-tags-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [tags_response](#schematags_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                  |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                  |

## Get User's DigitalContents

<a id="opIdGet User's DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/users/nlGNe/digitalContents 


```

```http
GET COLIVING_API_HOST/v1/users/nlGNe/digitalContents HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/users/nlGNe/digitalContents',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/users/nlGNe/digitalContents',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/users/nlGNe/digitalContents', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/users/nlGNe/digitalContents', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/users/nlGNe/digitalContents");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/users/nlGNe/digitalContents", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /users/{user_id}/digitalContents`

*Fetch a list of digitalContents for a user*

<h3 id="get-user's-digital-contents-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| user_id | string | true     | A User ID   |
| limit   | string | false    | Limit       |
| offset  | string | false    | Offset      |
| sort    | string | false    | Sort mode   |

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

<h3 id="get-user's-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                    |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digitalContents_response](#schemadigitalContents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                      |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                      |

<h1 id="api-content-lists">contentLists</h1>

## Search ContentLists

<a id="opIdSearch ContentLists"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/contentLists/search?query=Hot & New 


```

```http
GET COLIVING_API_HOST/v1/contentLists/search?query=Hot & New HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/contentLists/search?query=Hot & New',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/contentLists/search',
  params: {
  'query' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/contentLists/search', params={
  'query': 'Hot & New'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/contentLists/search', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/contentLists/search?query=Hot & New");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/contentLists/search", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /contentLists/search`

*Search for a contentList*

<h3 id="search-content-lists-parameters">Query Parameters</h3>

| Name              | Type   | Required | Description  |
| ----------------- | ------ | -------- | ------------ |
| query             | string | true     | Search Query |
| only_downloadable | string | false    | none         |

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

<h3 id="search-content-lists-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                    |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [content_list_search_result](#schemacontent_list_search_result) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                      |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                      |

## Trending ContentLists

<a id="opIdTrending ContentLists"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/contentLists/trending/string 


```

```http
GET COLIVING_API_HOST/v1/contentLists/trending/string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/contentLists/trending/string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/contentLists/trending/string',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/contentLists/trending/string', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/contentLists/trending/string', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/contentLists/trending/string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/contentLists/trending/string", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /contentLists/trending/{version}`

*Gets top trending contentLists for time period on Coliving*

<h3 id="trending-content-lists-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description         |
| ------- | ------ | -------- | ------------------- |
| time    | string | false    | time range to query |
| version | string | true     | none                |

> Example Response

> 200 Response

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

<h3 id="trending-content-lists-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                              |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [trending_content_lists_response](#schematrending_content_lists_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                                |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                                |

## Get ContentList

<a id="opIdGet ContentList"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/contentLists/DOPRl 


```

```http
GET COLIVING_API_HOST/v1/contentLists/DOPRl HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/contentLists/DOPRl',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/contentLists/DOPRl',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/contentLists/DOPRl', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/contentLists/DOPRl', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/contentLists/DOPRl");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/contentLists/DOPRl", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /contentLists/{content_list_id}`

*Fetch a contentList*

<h3 id="get-content-list-parameters">Query Parameters</h3>

| Name        | Type   | Required | Description   |
| ----------- | ------ | -------- | ------------- |
| content_list_id | string | true     | A ContentList ID |

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

<h3 id="get-content-list-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                        |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [content_list_response](#schemacontent_list_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                          |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                          |

## Get ContentList DigitalContents

<a id="opIdGet ContentList DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents 


```

```http
GET COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/contentLists/DOPRl/digitalContents", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /contentLists/{content_list_id}/digitalContents`

*Fetch digitalContents within a contentList*

<h3 id="get-content-list-digital-contents-parameters">Query Parameters</h3>

| Name        | Type   | Required | Description   |
| ----------- | ------ | -------- | ------------- |
| content_list_id | string | true     | A ContentList ID |

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

<h3 id="get-content-list-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                        |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [content_list_digital_contents_response](#schemacontent_list_digital_contents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                          |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                          |

<h1 id="api-digital-contents">digitalContents</h1>

## Get DigitalContent By Handle and Slug

<a id="opIdGet DigitalContent By Handle and Slug"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digitalContents 


```

```http
GET COLIVING_API_HOST/v1/digitalContents HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/digitalContents',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/digitalContents',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/digitalContents', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digitalContents', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digitalContents");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digitalContents", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digitalContents`

<h3 id="get-digital-content-by-handle-and-slug-parameters">Query Parameters</h3>

| Name   | Type   | Required | Description      |
| ------ | ------ | -------- | ---------------- |
| handle | string | false    | A User's handle  |
| slug   | string | false    | The digital_content's slug |

> Example Response

> 200 Response

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
    "play_count": 0,
    "permalink": "string"
  }
}
```

<h3 id="get-digital-content-by-handle-and-slug-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                  |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [digital_content_response](#schemadigital_content_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                    |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                    |

## Recommended DigitalContents

<a id="opIdRecommended DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digital_contents/recommended/string 


```

```http
GET COLIVING_API_HOST/v1/digital_contents/recommended/string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/digital_contents/recommended/string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/digital_contents/recommended/string',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/digital_contents/recommended/string', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digital_contents/recommended/string', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digital_contents/recommended/string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digital_contents/recommended/string", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digital_contents/recommended/{version}`

<h3 id="recommended-digital-contents-parameters">Query Parameters</h3>

| Name           | Type   | Required | Description                                                        |
| -------------- | ------ | -------- | ------------------------------------------------------------------ |
| genre          | string | false    | Recommended trending digitalContents for a specified genre                  |
| limit          | string | false    | Number of recommended digitalContents to fetch                              |
| exclusion_list | string | false    | List of digital_content ids to exclude                                       |
| time           | string | false    | Trending digitalContents over a specified time range (week, month, allTime) |
| version        | string | true     | none                                                               |

> Example Response

> 200 Response

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
      "play_count": 0,
      "permalink": "string"
    }
  ]
}
```

<h3 id="recommended-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                    |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [digitalContents_response](#schemadigitalContents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                      |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                      |

## Search DigitalContents

<a id="opIdSearch DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digital_contents/search?query=baauer b2b 


```

```http
GET COLIVING_API_HOST/v1/digital_contents/search?query=baauer b2b HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/digital_contents/search?query=baauer b2b',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/digital_contents/search',
  params: {
  'query' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/digital_contents/search', params={
  'query': 'baauer b2b'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digital_contents/search', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digital_contents/search?query=baauer b2b");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digital_contents/search", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digital_contents/search`

*Search for a digital_content*

<h3 id="search-digital-contents-parameters">Query Parameters</h3>

| Name              | Type   | Required | Description                     |
| ----------------- | ------ | -------- | ------------------------------- |
| query             | string | true     | Search Query                    |
| only_downloadable | string | false    | Return only downloadable digitalContents |

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

<h3 id="search-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                              |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digital_content_search](#schemadigital_content_search) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                |

## Trending DigitalContents

<a id="opIdTrending DigitalContents"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digital_contents/trending/string 


```

```http
GET COLIVING_API_HOST/v1/digital_contents/trending/string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/digital_contents/trending/string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/digital_contents/trending/string',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/digital_contents/trending/string', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digital_contents/trending/string', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digital_contents/trending/string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digital_contents/trending/string", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digital_contents/trending/{version}`

*Gets the top 100 trending (most popular) digitalContents on Coliving*

<h3 id="trending-digital-contents-parameters">Query Parameters</h3>

| Name    | Type   | Required | Description                                                        |
| ------- | ------ | -------- | ------------------------------------------------------------------ |
| genre   | string | false    | Trending digitalContents for a specified genre                              |
| time    | string | false    | Trending digitalContents over a specified time range (week, month, allTime) |
| version | string | true     | none                                                               |

> Example Response

> 200 Response

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
      "play_count": 0,
      "permalink": "string"
    }
  ]
}
```

<h3 id="trending-digital-contents-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                    |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [digitalContents_response](#schemadigitalContents_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                      |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                      |

## Get DigitalContent

<a id="opIdGet DigitalContent"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digital_contents/D7KyD 


```

```http
GET COLIVING_API_HOST/v1/digital_contents/D7KyD HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/digital_contents/D7KyD',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/digital_contents/D7KyD',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/digital_contents/D7KyD', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digital_contents/D7KyD', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digital_contents/D7KyD");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digital_contents/D7KyD", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digital_contents/{digital_content_id}`

*Fetch a digital_content*

<h3 id="get-digital-content-parameters">Query Parameters</h3>

| Name     | Type   | Required | Description |
| -------- | ------ | -------- | ----------- |
| digital_content_id | string | true     | A DigitalContent ID  |

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

<h3 id="get-digital-content-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                  |
| ------ | -------------------------------------------------------------------------- | ------------ | --------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | none         | [digital_content_response](#schemadigital_content_response) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                    |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                    |

## Stream DigitalContent

<a id="opIdStream DigitalContent"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/digital_contents/D7KyD/stream

```

```http
GET COLIVING_API_HOST/v1/digital_contents/D7KyD/stream HTTP/1.1

```

```javascript

fetch('COLIVING_API_HOST/v1/digital_contents/D7KyD/stream',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```ruby
require 'rest-client'
require 'json'

result = RestClient.get 'COLIVING_API_HOST/v1/digital_contents/D7KyD/stream',
  params: {
  }

p JSON.parse(result)

```

```python
import requests

r = requests.get('COLIVING_API_HOST/v1/digital_contents/D7KyD/stream')

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/digital_contents/D7KyD/stream', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/digital_contents/D7KyD/stream");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/digital_contents/D7KyD/stream", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /digital_contents/{digital_content_id}/stream`

*Get the digital_content's streamable mp3 file*

This endpoint accepts the Range header for streaming. https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests

<h3 id="stream-digital-content-parameters">Query Parameters</h3>

| Name     | Type   | Required | Description |
| -------- | ------ | -------- | ----------- |
| digital_content_id | string | true     | A DigitalContent ID  |

<h3 id="stream-digital-content-responses">Responses</h3>

| Status | Meaning                                                                    | Description           | Schema |
| ------ | -------------------------------------------------------------------------- | --------------------- | ------ |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success               | None   |
| 216    | Unknown                                                                    | Partial content       | None   |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request           | None   |
| 416    | [Range Not Satisfiable](https://tools.ietf.org/html/rfc7233#section-4.4)   | Content range invalid | None   |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error          | None   |

<h1 id="api-challenges">challenges</h1>

## get_get_undisbursed_challenges

<a id="opIdget_get_undisbursed_challenges"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/challenges/undisbursed 


```

```http
GET COLIVING_API_HOST/v1/challenges/undisbursed HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/challenges/undisbursed',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/challenges/undisbursed',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/challenges/undisbursed', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/challenges/undisbursed', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/challenges/undisbursed");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/challenges/undisbursed", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /challenges/undisbursed`

<h3 id="get_get_undisbursed_challenges-parameters">Query Parameters</h3>

| Name                  | Type   | Required | Description                                                       |
| --------------------- | ------ | -------- | ----------------------------------------------------------------- |
| limit                 | string | false    | The maximum number of response challenges                         |
| offset                | string | false    | The number of challenges to intially skip in the query            |
| completed_blocknumber | string | false    | Starting blocknumber to retrieve completed undisbursed challenges |

> Example Response

> 200 Response

```json
{
  "data": [
    {
      "challenge_id": "string",
      "user_id": "string",
      "specifier": "string",
      "amount": "string",
      "completed_blocknumber": 0
    }
  ]
}
```

<h3 id="get_get_undisbursed_challenges-responses">Responses</h3>

| Status | Meaning                                                                    | Description  | Schema                                                  |
| ------ | -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)                    | Success      | [undisbursed_challenges](#schemaundisbursed_challenges) |
| 400    | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)           | Bad request  | None                                                    |
| 500    | [Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1) | Server error | None                                                    |

## get_attest

<a id="opIdget_attest"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/challenges/string/attest?user_id=string&oracle=string&specifier=string 


```

```http
GET COLIVING_API_HOST/v1/challenges/string/attest?user_id=string&oracle=string&specifier=string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/challenges/string/attest?user_id=string&oracle=string&specifier=string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/challenges/string/attest',
  params: {
  'user_id' => 'string',
'oracle' => 'string',
'specifier' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/challenges/string/attest', params={
  'user_id': 'string',  'oracle': 'string',  'specifier': 'string'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/challenges/string/attest', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/challenges/string/attest?user_id=string&oracle=string&specifier=string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/challenges/string/attest", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /challenges/{challenge_id}/attest`

<h3 id="get_attest-parameters">Query Parameters</h3>

| Name         | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| user_id      | string | true     | none        |
| oracle       | string | true     | none        |
| specifier    | string | true     | none        |
| challenge_id | string | true     | none        |

> Example Response

> 200 Response

```json
{
  "data": {
    "owner_wallet": "string",
    "attestation": "string"
  }
}
```

<h3 id="get_attest-responses">Responses</h3>

| Status | Meaning                                                 | Description | Schema                                            |
| ------ | ------------------------------------------------------- | ----------- | ------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1) | Success     | [attestation_reponse](#schemaattestation_reponse) |

<h1 id="api-metrics">metrics</h1>

## get_trailing_app_name_metrics

<a id="opIdget_trailing_app_name_metrics"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/metrics/app_name/trailing/string 


```

```http
GET COLIVING_API_HOST/v1/metrics/app_name/trailing/string HTTP/1.1

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('COLIVING_API_HOST/v1/metrics/app_name/trailing/string',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'application/json'
}

result = RestClient.get 'COLIVING_API_HOST/v1/metrics/app_name/trailing/string',
  params: {
  }, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('COLIVING_API_HOST/v1/metrics/app_name/trailing/string', headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/metrics/app_name/trailing/string', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/metrics/app_name/trailing/string");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/metrics/app_name/trailing/string", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /metrics/app_name/trailing/{time_range}`

*Gets trailing app name metrics from matview*

<h3 id="get_trailing_app_name_metrics-parameters">Query Parameters</h3>

| Name       | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| time_range | string | true     | none        |

> Example Response

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

<h3 id="get_trailing_app_name_metrics-responses">Responses</h3>

| Status | Meaning                                                 | Description | Schema                                                            |
| ------ | ------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| 200    | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1) | Success     | [app_name_trailing_response](#schemaapp_name_trailing_response) |

<h1 id="api-resolve">resolve</h1>

## Resolve

<a id="opIdResolve"></a>

> Code Sample

```shell
curl COLIVING_API_HOST/v1/resolve?url=https://.co/camouflybeats/hypermantra-86216 


```

```http
GET COLIVING_API_HOST/v1/resolve?url=https://.co/camouflybeats/hypermantra-86216 HTTP/1.1

```

```javascript

const headers = {
  'Accept':'text/plain'
};

fetch('COLIVING_API_HOST/v1/resolve?url=https://.co/camouflybeats/hypermantra-86216',
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

```ruby
require 'rest-client'
require 'json'

headers = {
  'Accept' => 'text/plain'
}

result = RestClient.get 'COLIVING_API_HOST/v1/resolve',
  params: {
  'url' => 'string'
}, headers: headers

p JSON.parse(result)

```

```python
import requests
headers = {
  'Accept': 'text/plain'
}

r = requests.get('COLIVING_API_HOST/v1/resolve', params={
  'url': 'https://.co/camouflybeats/hypermantra-86216'
}, headers = headers)

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Accept' => 'text/plain',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','COLIVING_API_HOST/v1/resolve', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("COLIVING_API_HOST/v1/resolve?url=https://.co/camouflybeats/hypermantra-86216");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Accept": []string{"text/plain"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "COLIVING_API_HOST/v1/resolve", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /resolve`

*Resolves and redirects a provided Coliving app URL to the API resource URL it represents*

This endpoint allows you to lookup and access API resources when you only know the .co URL. DigitalContents, ContentLists, and Users are supported.

<h3 id="resolve-parameters">Query Parameters</h3>

| Name | Type   | Required | Description                                                                           |
| ---- | ------ | -------- | ------------------------------------------------------------------------------------- |
| url  | string | true     | URL to resolve. Either fully formed URL (https://.co) or just the absolute path |

> Example Response

> Internal redirect

```
{"HTTP/1.1 302 Found Location":"/v1/digital_contents/V4W8r"}
```

<h3 id="resolve-responses">Responses</h3>

| Status | Meaning                                                    | Description       | Schema |
| ------ | ---------------------------------------------------------- | ----------------- | ------ |
| 302    | [Found](https://tools.ietf.org/html/rfc7231#section-6.4.3) | Internal redirect | None   |

<h3 id="resolve-responseschema">Response Schema</h3>

# Schemas

The following are examples of response formats you can expect to receive from the API.

<a id="schemauser_response"></a>
<a id="schema_user_response"></a>
<a id="tocSuser_response"></a>
<a id="tocsuser_response"></a>
<h2 id="tocS_user_response">user_response</h2>

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

### Properties

| Name | Type                | Required | Restrictions | Description |
| ---- | ------------------- | -------- | ------------ | ----------- |
| data | [user](#schemauser) | false    | none         | none        |

<a id="schemauser"></a>
<a id="schema_user"></a>
<a id="tocSuser"></a>
<a id="tocsuser"></a>
<h2 id="tocS_user">user</h2>

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

### Properties

| Name            | Type                                      | Required | Restrictions | Description |
| --------------- | ----------------------------------------- | -------- | ------------ | ----------- |
| album_count     | integer                                   | true     | none         | none        |
| bio             | string                                    | false    | none         | none        |
| cover_photo     | [cover_photo](#schemacover_photo)         | false    | none         | none        |
| followee_count  | integer                                   | true     | none         | none        |
| follower_count  | integer                                   | true     | none         | none        |
| handle          | string                                    | true     | none         | none        |
| id              | string                                    | true     | none         | none        |
| is_verified     | boolean                                   | true     | none         | none        |
| location        | string                                    | false    | none         | none        |
| name            | string                                    | true     | none         | none        |
| content_list_count  | integer                                   | true     | none         | none        |
| profile_picture | [profile_picture](#schemaprofile_picture) | false    | none         | none        |
| repost_count    | integer                                   | true     | none         | none        |
| digital_content_count     | integer                                   | true     | none         | none        |

<a id="schemacover_photo"></a>
<a id="schema_cover_photo"></a>
<a id="tocScover_photo"></a>
<a id="tocscover_photo"></a>
<h2 id="tocS_cover_photo">cover_photo</h2>

```json
{
  "640x": "string",
  "2000x": "string"
}

```

### Properties

| Name  | Type   | Required | Restrictions | Description |
| ----- | ------ | -------- | ------------ | ----------- |
| 640x  | string | false    | none         | none        |
| 2000x | string | false    | none         | none        |

<a id="schemaprofile_picture"></a>
<a id="schema_profile_picture"></a>
<a id="tocSprofile_picture"></a>
<a id="tocsprofile_picture"></a>
<h2 id="tocS_profile_picture">profile_picture</h2>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

### Properties

| Name      | Type   | Required | Restrictions | Description |
| --------- | ------ | -------- | ------------ | ----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

<a id="schemadigitalContents_response"></a>
<a id="schema_digital_contents_response"></a>
<a id="tocSdigitalContents_response"></a>
<a id="tocsdigitalContents_response"></a>
<h2 id="tocS_digital_contents_response">digitalContents_response</h2>

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
      "play_count": 0,
      "permalink": "string"
    }
  ]
}

```

### Properties

| Name | Type                    | Required | Restrictions | Description |
| ---- | ----------------------- | -------- | ------------ | ----------- |
| data | [[DigitalContent](#schemadigitalContent)] | false    | none         | none        |

<a id="schemadigitalContent"></a>
<a id="schema_DigitalContent"></a>
<a id="tocSdigitalContent"></a>
<a id="tocsdigitalContent"></a>
<h2 id="tocS_DigitalContent">DigitalContent</h2>

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
  "play_count": 0,
  "permalink": "string"
}

```

### Properties

| Name           | Type                                  | Required | Restrictions | Description |
| -------------- | ------------------------------------- | -------- | ------------ | ----------- |
| artwork        | [digital_content_artwork](#schemadigital_content_artwork) | false    | none         | none        |
| description    | string                                | false    | none         | none        |
| genre          | string                                | false    | none         | none        |
| id             | string                                | true     | none         | none        |
| mood           | string                                | false    | none         | none        |
| release_date   | string                                | false    | none         | none        |
| remix_of       | [remix_parent](#schemaremix_parent)   | false    | none         | none        |
| repost_count   | integer                               | true     | none         | none        |
| favorite_count | integer                               | true     | none         | none        |
| tags           | string                                | false    | none         | none        |
| title          | string                                | true     | none         | none        |
| user           | [user](#schemauser)                   | true     | none         | none        |
| duration       | integer                               | true     | none         | none        |
| downloadable   | boolean                               | false    | none         | none        |
| play_count     | integer                               | true     | none         | none        |
| permalink      | string                                | false    | none         | none        |

<a id="schemadigital_content_artwork"></a>
<a id="schema_digital_content_artwork"></a>
<a id="tocSdigital_content_artwork"></a>
<a id="tocsdigital_content_artwork"></a>
<h2 id="tocS_digital_content_artwork">digital_content_artwork</h2>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

### Properties

| Name      | Type   | Required | Restrictions | Description |
| --------- | ------ | -------- | ------------ | ----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

<a id="schemaremix_parent"></a>
<a id="schema_remix_parent"></a>
<a id="tocSremix_parent"></a>
<a id="tocsremix_parent"></a>
<h2 id="tocS_remix_parent">remix_parent</h2>

```json
{
  "digitalContents": [
    {
      "parent_digital_content_id": "string"
    }
  ]
}

```

### Properties

| Name   | Type                                    | Required | Restrictions | Description |
| ------ | --------------------------------------- | -------- | ------------ | ----------- |
| digitalContents | [[digital_content_element](#schemadigital_content_element)] | false    | none         | none        |

<a id="schemadigital_content_element"></a>
<a id="schema_digital_content_element"></a>
<a id="tocSdigital_content_element"></a>
<a id="tocsdigital_content_element"></a>
<h2 id="tocS_digital_content_element">digital_content_element</h2>

```json
{
  "parent_digital_content_id": "string"
}

```

### Properties

| Name              | Type   | Required | Restrictions | Description |
| ----------------- | ------ | -------- | ------------ | ----------- |
| parent_digital_content_id | string | true     | none         | none        |

<a id="schemareposts"></a>
<a id="schema_reposts"></a>
<a id="tocSreposts"></a>
<a id="tocsreposts"></a>
<h2 id="tocS_reposts">reposts</h2>

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

### Properties

| Name | Type                          | Required | Restrictions | Description |
| ---- | ----------------------------- | -------- | ------------ | ----------- |
| data | [[activity](#schemaactivity)] | false    | none         | none        |

<a id="schemaactivity"></a>
<a id="schema_activity"></a>
<a id="tocSactivity"></a>
<a id="tocsactivity"></a>
<h2 id="tocS_activity">activity</h2>

```json
{
  "timestamp": "string",
  "item_type": {},
  "item": {}
}

```

### Properties

| Name      | Type   | Required | Restrictions | Description |
| --------- | ------ | -------- | ------------ | ----------- |
| timestamp | string | false    | none         | none        |
| item_type | object | false    | none         | none        |
| item      | object | false    | none         | none        |

<a id="schemafavorites_response"></a>
<a id="schema_favorites_response"></a>
<a id="tocSfavorites_response"></a>
<a id="tocsfavorites_response"></a>
<h2 id="tocS_favorites_response">favorites_response</h2>

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

### Properties

| Name | Type                          | Required | Restrictions | Description |
| ---- | ----------------------------- | -------- | ------------ | ----------- |
| data | [[favorite](#schemafavorite)] | false    | none         | none        |

<a id="schemafavorite"></a>
<a id="schema_favorite"></a>
<a id="tocSfavorite"></a>
<a id="tocsfavorite"></a>
<h2 id="tocS_favorite">favorite</h2>

```json
{
  "favorite_item_id": "string",
  "favorite_type": "string",
  "user_id": "string"
}

```

### Properties

| Name               | Type   | Required | Restrictions | Description |
| ------------------ | ------ | -------- | ------------ | ----------- |
| favorite_item_id | string | true     | none         | none        |
| favorite_type      | string | true     | none         | none        |
| user_id            | string | true     | none         | none        |

<a id="schematags_response"></a>
<a id="schema_tags_response"></a>
<a id="tocStags_response"></a>
<a id="tocstags_response"></a>
<h2 id="tocS_tags_response">tags_response</h2>

```json
{
  "data": [
    "string"
  ]
}

```

### Properties

| Name | Type     | Required | Restrictions | Description |
| ---- | -------- | -------- | ------------ | ----------- |
| data | [string] | false    | none         | none        |

<a id="schemauser_search"></a>
<a id="schema_user_search"></a>
<a id="tocSuser_search"></a>
<a id="tocsuser_search"></a>
<h2 id="tocS_user_search">user_search</h2>

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

### Properties

| Name | Type                  | Required | Restrictions | Description |
| ---- | --------------------- | -------- | ------------ | ----------- |
| data | [[user](#schemauser)] | false    | none         | none        |

<a id="schemaassociated_wallets_response"></a>
<a id="schema_associated_wallets_response"></a>
<a id="tocSassociated_wallets_response"></a>
<a id="tocsassociated_wallets_response"></a>
<h2 id="tocS_associated_wallets_response">associated_wallets_response</h2>

```json
{
  "data": {
    "wallets": [
      "string"
    ],
    "sol_wallets": [
      "string"
    ]
  }
}

```

### Properties

| Name | Type                                            | Required | Restrictions | Description |
| ---- | ----------------------------------------------- | -------- | ------------ | ----------- |
| data | [associated_wallets](#schemaassociated_wallets) | false    | none         | none        |

<a id="schemaassociated_wallets"></a>
<a id="schema_associated_wallets"></a>
<a id="tocSassociated_wallets"></a>
<a id="tocsassociated_wallets"></a>
<h2 id="tocS_associated_wallets">associated_wallets</h2>

```json
{
  "wallets": [
    "string"
  ],
  "sol_wallets": [
    "string"
  ]
}

```

### Properties

| Name        | Type     | Required | Restrictions | Description |
| ----------- | -------- | -------- | ------------ | ----------- |
| wallets     | [string] | true     | none         | none        |
| sol_wallets | [string] | true     | none         | none        |

<a id="schemauser_associated_wallet_response"></a>
<a id="schema_user_associated_wallet_response"></a>
<a id="tocSuser_associated_wallet_response"></a>
<a id="tocsuser_associated_wallet_response"></a>
<h2 id="tocS_user_associated_wallet_response">user_associated_wallet_response</h2>

```json
{
  "data": {
    "user_id": "string"
  }
}

```

### Properties

| Name | Type                                        | Required | Restrictions | Description |
| ---- | ------------------------------------------- | -------- | ------------ | ----------- |
| data | [encoded_user_id](#schemaencoded_user_id) | false    | none         | none        |

<a id="schemaencoded_user_id"></a>
<a id="schema_encoded_user_id"></a>
<a id="tocSencoded_user_id"></a>
<a id="tocsencoded_user_id"></a>
<h2 id="tocS_encoded_user_id">encoded_user_id</h2>

```json
{
  "user_id": "string"
}

```

### Properties

| Name    | Type   | Required | Restrictions | Description |
| ------- | ------ | -------- | ------------ | ----------- |
| user_id | string | false    | none         | none        |

<a id="schemaget_challenges"></a>
<a id="schema_get_challenges"></a>
<a id="tocSget_challenges"></a>
<a id="tocsget_challenges"></a>
<h2 id="tocS_get_challenges">get_challenges</h2>

```json
{
  "data": [
    {
      "challenge_id": "string",
      "user_id": "string",
      "specifier": "string",
      "is_complete": true,
      "is_active": true,
      "is_disbursed": true,
      "current_step_count": 0,
      "max_steps": 0,
      "challenge_type": "string",
      "metadata": {}
    }
  ]
}

```

### Properties

| Name | Type                                              | Required | Restrictions | Description |
| ---- | ------------------------------------------------- | -------- | ------------ | ----------- |
| data | [[challenge_response](#schemachallenge_response)] | false    | none         | none        |

<a id="schemachallenge_response"></a>
<a id="schema_challenge_response"></a>
<a id="tocSchallenge_response"></a>
<a id="tocschallenge_response"></a>
<h2 id="tocS_challenge_response">challenge_response</h2>

```json
{
  "challenge_id": "string",
  "user_id": "string",
  "specifier": "string",
  "is_complete": true,
  "is_active": true,
  "is_disbursed": true,
  "current_step_count": 0,
  "max_steps": 0,
  "challenge_type": "string",
  "metadata": {}
}

```

### Properties

| Name                 | Type    | Required | Restrictions | Description |
| -------------------- | ------- | -------- | ------------ | ----------- |
| challenge_id         | string  | true     | none         | none        |
| user_id              | string  | true     | none         | none        |
| specifier            | string  | false    | none         | none        |
| is_complete          | boolean | true     | none         | none        |
| is_active            | boolean | true     | none         | none        |
| is_disbursed         | boolean | true     | none         | none        |
| current_step_count | integer | false    | none         | none        |
| max_steps            | integer | false    | none         | none        |
| challenge_type       | string  | true     | none         | none        |
| metadata             | object  | true     | none         | none        |

<a id="schemacontent_list_response"></a>
<a id="schema_content_list_response"></a>
<a id="tocScontent_list_response"></a>
<a id="tocscontent_list_response"></a>
<h2 id="tocS_content_list_response">content_list_response</h2>

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

### Properties

| Name | Type                          | Required | Restrictions | Description |
| ---- | ----------------------------- | -------- | ------------ | ----------- |
| data | [[contentList](#schemacontentList)] | false    | none         | none        |

<a id="schemacontentList"></a>
<a id="schema_content_list"></a>
<a id="tocScontentList"></a>
<a id="tocscontentList"></a>
<h2 id="tocS_content_list">contentList</h2>

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

### Properties

| Name               | Type                                        | Required | Restrictions | Description |
| ------------------ | ------------------------------------------- | -------- | ------------ | ----------- |
| artwork            | [content_list_artwork](#schemacontent_list_artwork) | false    | none         | none        |
| description        | string                                      | false    | none         | none        |
| id                 | string                                      | true     | none         | none        |
| is_album           | boolean                                     | true     | none         | none        |
| content_list_name      | string                                      | true     | none         | none        |
| repost_count       | integer                                     | true     | none         | none        |
| favorite_count     | integer                                     | true     | none         | none        |
| total_play_count | integer                                     | true     | none         | none        |
| user               | [user](#schemauser)                         | true     | none         | none        |

<a id="schemacontent_list_artwork"></a>
<a id="schema_content_list_artwork"></a>
<a id="tocScontent_list_artwork"></a>
<a id="tocscontent_list_artwork"></a>
<h2 id="tocS_content_list_artwork">content_list_artwork</h2>

```json
{
  "150x150": "string",
  "480x480": "string",
  "1000x1000": "string"
}

```

### Properties

| Name      | Type   | Required | Restrictions | Description |
| --------- | ------ | -------- | ------------ | ----------- |
| 150x150   | string | false    | none         | none        |
| 480x480   | string | false    | none         | none        |
| 1000x1000 | string | false    | none         | none        |

<a id="schemacontent_list_digital_contents_response"></a>
<a id="schema_content_list_digital_contents_response"></a>
<a id="tocScontent_list_digital_contents_response"></a>
<a id="tocscontent_list_digital_contents_response"></a>
<h2 id="tocS_content_list_digital_contents_response">content_list_digital_contents_response</h2>

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
      "play_count": 0,
      "permalink": "string"
    }
  ]
}

```

### Properties

| Name | Type                    | Required | Restrictions | Description |
| ---- | ----------------------- | -------- | ------------ | ----------- |
| data | [[DigitalContent](#schemadigitalContent)] | false    | none         | none        |

<a id="schemacontent_list_search_result"></a>
<a id="schema_content_list_search_result"></a>
<a id="tocScontent_list_search_result"></a>
<a id="tocscontent_list_search_result"></a>
<h2 id="tocS_content_list_search_result">content_list_search_result</h2>

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

### Properties

| Name | Type                          | Required | Restrictions | Description |
| ---- | ----------------------------- | -------- | ------------ | ----------- |
| data | [[contentList](#schemacontentList)] | false    | none         | none        |

<a id="schematrending_content_lists_response"></a>
<a id="schema_trending_content_lists_response"></a>
<a id="tocStrending_content_lists_response"></a>
<a id="tocstrending_content_lists_response"></a>
<h2 id="tocS_trending_content_lists_response">trending_content_lists_response</h2>

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

### Properties

| Name | Type                          | Required | Restrictions | Description |
| ---- | ----------------------------- | -------- | ------------ | ----------- |
| data | [[contentList](#schemacontentList)] | false    | none         | none        |

<a id="schemadigital_content_response"></a>
<a id="schema_digital_content_response"></a>
<a id="tocSdigital_content_response"></a>
<a id="tocsdigital_content_response"></a>
<h2 id="tocS_digital_content_response">digital_content_response</h2>

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
    "play_count": 0,
    "permalink": "string"
  }
}

```

### Properties

| Name | Type                  | Required | Restrictions | Description |
| ---- | --------------------- | -------- | ------------ | ----------- |
| data | [DigitalContent](#schemadigitalContent) | false    | none         | none        |

<a id="schemadigital_content_search"></a>
<a id="schema_digital_content_search"></a>
<a id="tocSdigital_content_search"></a>
<a id="tocsdigital_content_search"></a>
<h2 id="tocS_digital_content_search">digital_content_search</h2>

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
      "play_count": 0,
      "permalink": "string"
    }
  ]
}

```

### Properties

| Name | Type                    | Required | Restrictions | Description |
| ---- | ----------------------- | -------- | ------------ | ----------- |
| data | [[DigitalContent](#schemadigitalContent)] | false    | none         | none        |

<a id="schemaattestation_reponse"></a>
<a id="schema_attestation_reponse"></a>
<a id="tocSattestation_reponse"></a>
<a id="tocsattestation_reponse"></a>
<h2 id="tocS_attestation_reponse">attestation_reponse</h2>

```json
{
  "data": {
    "owner_wallet": "string",
    "attestation": "string"
  }
}

```

### Properties

| Name | Type                              | Required | Restrictions | Description |
| ---- | --------------------------------- | -------- | ------------ | ----------- |
| data | [attestation](#schemaattestation) | false    | none         | none        |

<a id="schemaattestation"></a>
<a id="schema_attestation"></a>
<a id="tocSattestation"></a>
<a id="tocsattestation"></a>
<h2 id="tocS_attestation">attestation</h2>

```json
{
  "owner_wallet": "string",
  "attestation": "string"
}

```

### Properties

| Name         | Type   | Required | Restrictions | Description |
| ------------ | ------ | -------- | ------------ | ----------- |
| owner_wallet | string | true     | none         | none        |
| attestation  | string | true     | none         | none        |

<a id="schemaundisbursed_challenges"></a>
<a id="schema_undisbursed_challenges"></a>
<a id="tocSundisbursed_challenges"></a>
<a id="tocsundisbursed_challenges"></a>
<h2 id="tocS_undisbursed_challenges">undisbursed_challenges</h2>

```json
{
  "data": [
    {
      "challenge_id": "string",
      "user_id": "string",
      "specifier": "string",
      "amount": "string",
      "completed_blocknumber": 0
    }
  ]
}

```

### Properties

| Name | Type                                                    | Required | Restrictions | Description |
| ---- | ------------------------------------------------------- | -------- | ------------ | ----------- |
| data | [[undisbursed_challenge](#schemaundisbursed_challenge)] | false    | none         | none        |

<a id="schemaundisbursed_challenge"></a>
<a id="schema_undisbursed_challenge"></a>
<a id="tocSundisbursed_challenge"></a>
<a id="tocsundisbursed_challenge"></a>
<h2 id="tocS_undisbursed_challenge">undisbursed_challenge</h2>

```json
{
  "challenge_id": "string",
  "user_id": "string",
  "specifier": "string",
  "amount": "string",
  "completed_blocknumber": 0
}

```

### Properties

| Name                  | Type    | Required | Restrictions | Description |
| --------------------- | ------- | -------- | ------------ | ----------- |
| challenge_id          | string  | true     | none         | none        |
| user_id               | string  | true     | none         | none        |
| specifier             | string  | true     | none         | none        |
| amount                | string  | true     | none         | none        |
| completed_blocknumber | integer | true     | none         | none        |

<a id="schemaapp_name_trailing_response"></a>
<a id="schema_app_name_trailing_response"></a>
<a id="tocSapp_name_trailing_response"></a>
<a id="tocsapp_name_trailing_response"></a>
<h2 id="tocS_app_name_trailing_response">app_name_trailing_response</h2>

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

### Properties

| Name | Type                                                            | Required | Restrictions | Description |
| ---- | --------------------------------------------------------------- | -------- | ------------ | ----------- |
| data | [[app_name_trailing_metric](#schemaapp_name_trailing_metric)] | false    | none         | none        |

<a id="schemaapp_name_trailing_metric"></a>
<a id="schema_app_name_trailing_metric"></a>
<a id="tocSapp_name_trailing_metric"></a>
<a id="tocsapp_name_trailing_metric"></a>
<h2 id="tocS_app_name_trailing_metric">app_name_trailing_metric</h2>

```json
{
  "count": 0,
  "name": "string"
}

```

### Properties

| Name  | Type    | Required | Restrictions | Description |
| ----- | ------- | -------- | ------------ | ----------- |
| count | integer | false    | none         | none        |
| name  | string  | false    | none         | none        |

