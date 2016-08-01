# Building a Messenger bot for Appboy
## About Messenger bots
### Introduction
On April 12, 2016, Facebook launched its [Messenger Platform][1], intended to provide support for bots, or automated messaging interfaces capable of delivering ordering updates, customer service and executing business functions automatically using the Facebook Send API, and if desired, a custom-built or integrated AI solution for bots such as [Wit.ai][7].

As of right now, Facebook allows usage of the Messenger Platform for transactional messages (e.g. receipts and tracking numbers), providing customer service (e.g. allowing users to place an order by messaging the bot) and to deliver content that the user has requested. Before moving any further with building a bot, it’s important to note that the Facebook Messenger Platform cannot be used for sending marketing content such as upsells, newsletters or ads. As for marketing content, Facebook is currently beta testing Sponsored Messages, longhand for ads, on Messenger with a small segment of advertisers, but they haven’t released a timeline for this functionality to be available for the general Facebook Advertising user base.

### What Messenger bots can do
Messenger bots can be used to communicate with users that have authorized your bot to send messages to them. Bots support the following types of messaging:

- Regular text messages
- Media messages (images/video/audio) in a multitude of formats
- Structured Messages (specially formatted cards) - some examples below:
	![Examples of Structured Messages][structured-message-examples]
	- The last example is of a specific receipt template. Facebook also provides templates for airlines such as boarding passes and itinerary cards. Copy and links are customizable but the format of the messages is somewhat strict and does not allow for example, custom HTML objects.

Bots can also react to customer messages using a solution like Wit.ai or a custom made platform and trigger events in the back end depending on what customers message to your bot.

### The APIs
The Messenger Platform consists of three different parts with separate functions:
- __Send API:__ The API for sending messages as the page in various formats outlined above
- __Webhooks:__ Inbound notifications of authentication events, incoming messages, message deliveries and engagement with Structured Messages (postbacks)
- __Plugins:__ The Send to Messenger and Message Us plugins act as entry points for authentication events, allowing users to grant permission to message them on Messenger (Send to Messenger) and launch messaging sessions with the Page (Message Us)

## Getting ready to build a bot
In order to build and run a bot, there are some prerequisites you must set up:

- A Facebook Page - the Page and its profile picture will represent the bot much like your personal profile represents you in Messenger
- A Facebook App - the App will be set up to identify your bot and get the necessary API keys
- A server - the server runs your bot. For this tutorial we will use a small Node.js server hosted on Heroku.

Additionally, to complete this tutorial, you'll need to install [Git][2] if you don't have it and get yourself a [Google Maps API key][3]. If you don't have one, go get one now and write it down. We also recommend using a text editor that supports syntax highlighting for JavaScript and JSON, for example [Sublime Text 2][18].

### Server initialization
Let’s start with setting up the server. If you already have a server running Node.js, feel free to use that. Heroku is free to use for small projects, but also allows you to scale your bot from a small sample web app to anything you can build. Follow these steps to create a server on Heroku.

1. Sign up for [Heroku][4]
2. Install the [Heroku Toolbelt][5], which allows you to manage Heroku instances over the command line.
3. Install [Node.js][6], for this build pick the LTS version. Open up a Terminal/Command Line window and run the following command to make sure you have the latest version of Node Package Manager:  
```sudo npm install npm --global```
4. Create a new folder somewhere and open up a Terminal/Command Line window. Now, enter the following commands one by one to create our local Git repository (storage space for our code) and Heroku instance (server where our code runs):

    ```
    git init
    heroku create
    ```

5. We don't want to push useless things to our Heroku server. Use the command line command `vim .gitignore` to create a .gitignore file that tells Git what not to send over to Heroku. Paste the following lines into the file, press ESC and enter `:wq` to save and exit.

    ```
    /node_modules
    npm-debug.log
    .DS_Store
    /*.env
    ```

6. Run the following on the command line to create our Node.js project and respond yes to any further prompts:  
    
    ```
    npm init
    npm install express body-parser request socket.io uuid --save
    ```

  For the curious, this is what the packages do:
  - Express: the framework we will use to run the server
  - Body-parser: for processing incoming messages as JSON
  - Request: for sending requests to the Send API to send messages
  - Socket.io: to notify the front end of authentication events
  - Uuid: to create unique session IDs identifying a session that the backend communicates with

7. In the folder you just created, create a file called __index.js__. Copy this code into it for now:  
    
    ```javascript
    // initialize server and go from there
    var express = require('express');
    var app = express();
    var server = require('http').Server(app);
    var io = require('socket.io')(server);

    // other requirements
    var bodyParser = require('body-parser');
    var request = require('request');
    var fs = require('fs');
    var path = require('path');
    var uuid = require('uuid');

    /* Redirect http to https */
    app.get('*', function (req,res,next) {
        if (req.headers['x-forwarded-proto'] != 'https' && process.env.NODE_ENV === 'production')
            res.redirect('https://' + req.hostname + req.url);
        else
            next(); /* Continue to other routes if we're not redirecting */
    });

    // serve static files from 'css' (stylesheets), 'scripts' (client-side JS) and 'assets' (images, etc.) directories
    app.use(express.static('scripts'));
    app.use(express.static('css'));
    app.use(express.static('assets'));

    // Process application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({extended: false}));

    // Process application/json
    app.use(bodyParser.json());

    // Index route
    app.get('/', function (req, res) {
        return res.sendFile(path.join(__dirname+'/www/index.html'));
    });

    // router to send API keys to client side
    app.get('/config', function (req, res) {
        res.json({
            "appboy": process.env.APPBOY_API_KEY,
            "facebook": {
                "appID": process.env.FACEBOOK_APP_ID,
                "pageID": process.env.FACEBOOK_PAGE_ID
            },
            "google": {
                "mapsAPI": process.env.GOOGLE_MAPS_API_KEY
            }
        })
    })

    // socket.io listener for connections
    io.on('connection', function (socket) {
        // generate uuid for session
        var session_uuid = uuid.v4();
        // send connected socket to private chat room so that we can safely pass data from auth event
        socket.join(session_uuid);
        // send UUID to connected socket
        socket.emit('response', { 'uuid' : session_uuid } );
    });

    // for Facebook verification
    app.get('/webhook/', function (req, res) {
        if (req.query['hub.verify_token'] === process.env.FACEBOOK_VERIFY_TOKEN) {
            res.send(req.query['hub.challenge']);
        }
        res.send('Error, wrong token');
    });
    ```

8. Create a new file in the main directory (the directory where you should now have __index.js__ called __Procfile__. This file tells Heroku what to run when the server is initialized.

    ```
    web: node index.js
    ```

9. Let's save our work in Git and push it to the server. Use the command line to issue the following commands:

    ```
    git add .
    git commit -m "first commit"
    git push heroku master
    ```

Our Messenger bot is now ready to be developed! Before we can continue, we have to finalize setting up our Facebook App and server settings.

### Creating a Facebook Page and App
For the purposes of this documentation, we will assume you already have a page created. If you don’t, [follow this link][8] and its instructions to create one. You'll need the Facebook Page ID from the Page. You can find the Page ID by opening up your Page and clicking "About". Copy down the Page ID somewhere you can get it later.

Once the Page is created, we must create a Facebook App. If you already have a Facebook App, skip steps 1-4 and just open your Facebook App and follow steps 5-8. Otherwise, follow the below steps to create the App:

1. Make sure you’re logged in on a Facebook account.
2. Navigate to the [Apps page in Facebook Developers][9]
3. In the upper right corner, find a green button saying “Create new App.” In the frame that opens, look in the bottom and find the link for “use the basic setup”
4. You should see the following window. Enter the name for your App and your e-mail. Under Category, select “Apps for Pages.”  
![App ID Creation Window][app_id_creation]
5. Copy down the App ID from where the below screenshot has a black square.
6. Click on "Add Product" on the left side bar. Select "Messenger" in the following menu.
![Window to Add Messenger Product][adding_messenger]
7. Get a Page Access Token by selecting your page in the dropdown menu and write this down.
![Page Access Token dropdown][page_access_token]
8. Select a Verification Token to use with your webhook, which can be any long string without whitespace, e.g. `my_dogs_name_is_charlie`. Write this down.

### Server configuration
In order for our server to be able to interface with the various third-party services we use to create the bot, we'll need the server to know our API keys. 

1. Let's start by getting our API key for Appboy. Go on your [App Settings][16] page in the Appboy dashboard, find your app on the side bar and copy down the API key.
2. Find the list of various IDs and keys you have written down so far and open a Terminal window. 
3. Navigate to the root folder of your project (where __index.js__ is).
4. Issue the following command, replacing the values surrounded by <> with your respective values:

```
heroku config:set APPBOY_API_KEY=<YOUR_APPBOY_API_KEY_HERE> FACEBOOK_APP_ID=<YOUR_FACEBOOK_APP_ID> FACEBOOK_PAGE_ID=<YOUR_FACEBOOK_PAGE_ID> FACEBOOK_VERIFY_TOKEN=<VERIFY_TOKEN_YOU_PICKED> FACEBOOK_ACCESS_TOKEN=<YOUR_FACEBOOK_PAGE_ACCESS_TOKEN> GOOGLE_MAPS_API_KEY=<YOUR_GOOGLE_MAPS_API_KEY>
```

Your Heroku server will restart and give you a response with the variables you set. Make sure they match the ones you wrote down before continuing.

### Setting up the webhook

1. In the Facebook Developers Console, under the Messenger tab, click "Setup Webhook", which will ask you for a callback URL and a Verify Token. As a callback URL, give the url of your Heroku server with the subdirectory /webhook/ - e.g. "https://pacific-chamber-27146.herokuapp.com/webhook/" and insert the verification token you chose earlier. Subscribe to all Subscription Fields.
![Setup Webhook button location][webhook_setup_button]  
![Setup Webhook prompt][webhook_setup_prompt]
2. Open up the Terminal window that you used to push code to Heroku or open a new one. Now issue the following command, replacing `<PAGE_ACCESS_TOKEN>` with the long token you received when attaching your Page to your App.
    
    ```
    curl -X POST "https://graph.facebook.com/v2.7/me/subscribed_apps?access_token=<PAGE_ACCESS_TOKEN>"
    ```

Congratulations, we're now all set to start developing our bot!

## Building the back end of the bot

Now that our server is all set, we can finish building out the bot's back end. Let's start by opening up the __index.js__ file, which is where the logic of our bot will live.

### Configuring our webhook and setting up text messages
1. We need to configure what's called an API endpoint to process incoming messages to our bot. After the code you copied to index.js earlier, insert the following code. This bit of code will handle messages sent to our bot, and later we'll add some content-specific message handling:

    ```javascript
    // API endpoint to process incoming messages
    var myURL;
    app.post('/webhook/', function (req, res) {
        // save our server's URL
        myURL = req.protocol + '://' + req.get('host');

        // get the events that occurred
        messaging_events = req.body.entry[0].messaging;

        // iterate through the events and react to them
        for (i = 0; i < messaging_events.length; i++) {
            // get the event
            event = req.body.entry[0].messaging[i];
            // get the sender from whom the message came
            sender = event.sender.id;
            // handle text messages
            if (event.message && event.message.text) {
                // get the message text
                text = event.message.text;
                
                /* we'll add some message content-specific logic here later on. */

                // echo back the message that came in
                sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200));
            }
            /* we'll add handling opt-ins here later on. */
        }
        // send a 200 (successful) status to the Facebook server
        res.sendStatus(200);
    })

    /* We'll add handling for GET requests of item data here later on. */

    // FACEBOOK MESSENGER AUTH TOKEN
    var token = process.env.FACEBOOK_ACCESS_TOKEN
    ```

2. Our next step is to define a function that we can use to send messages to the user. Let's define a function `sendMessage(sender, messageData)` that'll allow us to send a message: 

    ```javascript
    /**
     * Sends a message to a given Facebook Messenger ID using a POST request to the Facebook Send API
     * @param {string} sender - The page-specific Messenger ID of the intended recipient
     * @param {Object} messageData - The contents of the message in Facebook-compliant JSON
     * @return nothing
     */
    function sendMessage(sender, messageData) {
        request({
            url: 'https://graph.facebook.com/v2.7/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })
    }
    ```

3. In the code we added in step 1, you might notice that there's a function call to `sendTextMessage()`, which we haven't defined yet. Let's define that function below the code added in step 2. This function will allow us to send a text message to a specific Messenger ID.
    
    ```javascript
    /**
     * Sends a text message to a given Facebook Messenger ID using a POST request to the Facebook Send API
     * @param {string} sender - The page-specific Messenger ID of the intended recipient
     * @param {string} text - The text message to be sent
     * @return nothing
     */
    function sendTextMessage(sender, text) {
        var messageData = {
            text:text
        }

        // send the message
        sendMessage(sender, messageData);
    }
    ```

4. Now that we have set up text messaging functionality, it's time to commit our changes to our Heroku server and check that everything works up to this point. Return to the terminal/command line window and type the following commands:
    
    ```
    git add .
    git commit -m "added text messaging to Messenger bot"
    git push heroku master
    ```

5. Go to your Page, click on "Message" and type something in the chat window that opened:  
![Page Message button location][message_page_button]
6. You should see a response similar to this:  
![Setup Webhook button location][sample_chat_window]

### Configuring content-specific Structured Message replies
Our Messenger bot can now handle incoming text messages by echoing back the message. However, Messenger supports a number of other messaging types as well. Let's add a few improvements to send Structured Messages in response to messages containing certain keywords coming in.

1. Let's start by writing two functions - `sendAppboyMessage()` and `sendPizzaCTA()` to send different Structured Messages to the person chatting with our bot. Copy and paste the following code to the end of your __index.js__ file.
    
    ```javascript
    /**
     * Sends a Button message with a call to action to visit the site to a given Facebook Messenger ID using a POST request to the Facebook Send API
     * @param {string} sender - The page-specific Messenger ID of the intended recipient
     * @return nothing
     */
    function sendPizzaCTA(sender) {
        messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": "We don't yet support ordering pizza via our bot, but you can grab a delicious imaginary pie from the link below!",
                    "buttons": [{
                        "type": "web_url",
                        "title": "Order a Pie!",
                        "url": myURL
                    }]
                }
            }
        }

        // send the message
        sendMessage(sender, messageData);
    }

    /**
     * Sends a Structured Message with the Appboy logo and a link to appboy.com to a given Facebook Messenger ID using a POST request to the Facebook Send API
     * @param {string} sender - The page-specific Messenger ID of the intended recipient
     * @return nothing
     */
    function sendAppboyMessage(sender) {
      // JSON body of the message data
      messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Appboy",
                        "subtitle": "Premier Marketing Automation for Apps",
                        "image_url": myURL + "/appboy_logo.png",
                        "buttons": [{
                            "type": "web_url",
                            "url": "https://www.appboy.com",
                            "title": "Learn more"
                        }]
                    }]
                }
            }
        }

        // send the message
        sendMessage(sender, messageData);
    }
    ```

2. Now, let's make the bot respond to messages with certain key words with these Structured Messages. Search for `/* we'll add some message content-specific logic here later on. */` in your __index.js__ file to find the right place and paste this code below that comment. What this code does is send a message to our user in case their message contains a certain key phrase.

    ```javascript
    // convert the received text to all upper case to ignore case differences
    var upperCasedText = text.toUpperCase();
    if (upperCasedText.includes('ORDER PIZZA')) {
      // if the user signals intent to order pizza, send them a call to action to take them to the site where they can place an order
      sendPizzaCTA(sender);
      // ignore rest of the event handling
      continue;
    } else if (upperCasedText.includes('WHO BUILT THIS')) {
      // if the sender is curious as to who built the bot, send them a message with our website
      sendAppboyMessage(sender);
      // ignore rest of the event handling
      continue;
    }
    ```

3. We now have the bot set up to react differently to messages which contain the exact strings "order pizza" and "who built this". Before we can test, you'll notice that `sendAppboyMessage()` contains a reference to "assets/appboy_logo.png" which we don't have. Create a directory called _assets_ in your project folder, and download [this image][10] into it.
4. We're all set for this, let's commit and push our changes and test!

    ```
    git add .
    git commit -m "placed a few Structured Message reactions to Messenger bot"
    git push heroku master
    ```
5. You should now have a test chat with your bot like this:  
![Sample chat involving Structured Messages][sample_chat_structured]

### Adding Authentication event handling
Now we have a bot capable of responding to two particular queries and otherwise echoing back the message. However, we're looking to create a bot that's integrated with a web app. Because we want to use Appboy to track users' interactions with our web app, we need to add some code to use socket.io to emit the Messenger ID of the user who just authenticated themselves by clicking our Send to Messenger button so that we can pass their Messenger ID to Appboy. Let's add some code to do this handling.

Search __index.js__ for the comment `/* we'll add handling opt-ins here later on. */`. Below the comment, add the following code:
  ```javascript
  // this gets triggered if the event the webhook received is an optin (an authentication event)
  else if (event.optin) {
    // get the data reference came in, this is the UUID of the session where the authentication event got triggered
    var dataRef = event.optin.ref;
    // use socket.io to send the messenger id to the socket belonging to this UUID
    io.to(dataRef).emit('fb_messenger_auth', { 'messenger_id' : sender });
    // send the user a message thanking them for subscribing
    sendTextMessage(sender, "Thanks for subscribing to MyZa updates. You're now eligible to receive messages about your future imaginary pizza orders. Happy demoing!");
  }
  ```

### Adding a database of products
Our final back end touch is to add some code to parse GET requests coming to the server. We want to get a JSON object denoting the properties of an order, decode it and then put together the information that we need to send back to prepare a receipt.

If we were building an actual web interface, we'd configure a database to store product and order data and simply pass the order ID in the request, however, since this is a simple demo we'll avoid the pain of configuring an actual database and use a file instead. Download [menu.json][24] and put it in your project's root folder (same folder as __index.js__). This is a JSON file that will contain our product information.

In __index.js__, find the comment that says `/* We'll add handling for GET requests of item data here later on. */` and paste the following code below it:

```javascript
// handle a URI encoded JSON request as a GET
var products = require('./menu.json'); // product data stored on the server
app.get('/api/products', function (req, res) {
    // decode the JSON object that was passed with the GET
    var reqJSON = JSON.parse(decodeURIComponent(req.query.orderData));
    // get the order details
    order_details = reqJSON.order;

    // begin putting together the response as JSON
    var response = {"item_data" : []};
    var subtotal = 0; // track the subtotal

    // loop through every item ordered
    for (var j = 0; j < order_details.length; j++) {
        // get the ordered items
        var item = order_details[j];

        // find the corresponding entries in our entire product data set
        var product = products.products[item.productID];
        var title = product.title;
        var subtitle = "";
        var product_image = product.image_url;
        var price = product.price;

        // get the extras selected for this item and add them to the subtitle
        var extras = item.extras;
        for (var i = 0; i < extras.length; i++) {
            var extra = products.extras[extras[i]];
            price += extra.price;
            if (extras.length === 1 || i == extras.length - 2) {
                subtitle += extra.title;
            } else if (i === extras.length - 1) {
                subtitle += ' and ' + extra.title;
            } else {
                subtitle += extra.title + ", ";
            }
        }

        // increment the subtotal
        subtotal += item.quantity * price;

        // add the details needed by Facebook Messenger to the response
        response.item_data.push({
            "title" : title,
            "subtitle" : subtitle,
            "price" : price,
            "quantity" : item.quantity,
            "image_url" : product_image
        });
    }

    // calculate the taxes and total cost 
    var total_tax = 0.0825 * subtotal;
    var total_cost = subtotal + total_tax;

    // append the cost details to the response
    response.summary = {
        "subtotal" : subtotal.toFixed(2),
        "total_tax" : total_tax.toFixed(2),
        "total_cost" : total_cost.toFixed(2)
    };

    // send the response as JSON
    res.json(response);
})
```

Congratulations on being finished with the back end! Let's commit our changes before moving on.

  ```
  git add .
  git commit -m "finished Messenger bot backend"
  git push heroku master
  ```

## Building the front end

Let's take a moment to set up our front end. Our front end code will provide us with an user interface to send fake pizza orders to Appboy and our bot. Before we begin coding, we'll set up the static content that determines what fields our app will have and how they look.

1. Create three empty folders called _css_, _scripts_, and _www_ in your project's root directory.
2. Download __styles.css__ from [here][23] and add it to the _css_ folder. This is the style sheet that we'll use to contain styling for our web app and its components. If you know CSS, feel free to edit the file to make the web app look nicer.
3. Download __index.html__ from [here][25] and add it to the _www_ folder. This is the static front page of our web app.

We now have an app that looks as it's supposed to, but no functionality. Let's change that!

### Getting started

In the _scripts_ folder, create a file called __utils.js__. Copy the below code snippet into it. Part 0 simply fetches our API keys from the server dynamically and sets the static page's properties to match our API keys. Part 1 generates hashes that we'll use to save Appboy user IDs.

``` javascript
/* JAVASCRIPT FOR MYZA FRONTEND */

/*
0. GET API KEYS FROM SERVER AND SET PARAMS FOR ELEMENTS
 */
var apiKeys;
$.ajax({
    url: '../config', 
    async: false, 
    success: function (data, textStatus, jqXHR) {
        apiKeys = data;
    }
});

$(document).ready(function() {
    $('#messenger-button').prop({
        'messenger_app_id': apiKeys.facebook.appID,
        'page_id': apiKeys.facebook.pageID
    });

    var gMapsUrl = 'https://maps.googleapis.com/maps/api/js?key=' + apiKeys.google.mapsAPI + '&libraries=places&callback=initAutocomplete';

    $.getScript(gMapsUrl);
});

/* 
1. UTILITY FUNCTIONS
*/
// method for hashing e-mail address to set as Appboy User ID, source : http://stackoverflow.com/a/29941895
String.prototype.hashCode = function() {

    if (Array.prototype.reduce) {
        return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    } else {

        var hash = 0, i, chr, len;
        if (this.length == 0) return hash;
        for (i = 0, len = this.length; i < len; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
};
```

### Facebook Send to Messenger button
Let's start by setting up the Send to Messenger button on our web app's front page so that we can add the Facebook Messenger button on our site so that we can test the authentication event handling.

1. Open up the __utils.js__ file in the _scripts_ subfolder of our project.
2. Copy and paste the following code into the end of the file. This snippet of code simply loads the Facebook Messenger button and sets it up for us to use. Facebook provides some documentation on what exactly this snippet does [here][13].

    ```javascript
    /* 
    2. FACEBOOK MESSENGER BUTTON
    */
    window.fbAsyncInit = function() {
      FB.init({
        appId      : apiKeys.facebook.appID,
        xfbml      : true,
        version    : 'v2.7'
      });
      };

      (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "//connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    ```

### socket.io
We'll use [socket.io][11] to send data from the backend to the client side as it comes along. We'll need this to record the Messenger ID of whoever authorized us to send them messages. Socket.io is an add-on that enables us to send data to a web socket as events happen, and enables seamless bidirectional communication between the front end and the back end.

1. Copy and paste the following code at the end of the file __utils.js__ file. This code creates a socket for us and allows us to react to two types of events - an event labeled 'response' and another one labeled 'fb_messenger_auth'. The 'response' event gets fired when the back end notices we've connected to it (when we've started a new session in the app). The 'fb_messenger_auth' event gets fired when an authorization event hits the webhook (when the user has clicked the Send to Messenger button).

    ```javascript
    /* 
    3. SOCKET.IO LISTENERS
    */
    var socket = io();

    socket.on('response', function (msg) {
      // store uuid for this session
      sessionStorage.uuid = msg.uuid;
      
      // set the "data-ref" payload for the button so we can identify the source of the button click as this session in the backend
      document.getElementById('messenger-button').setAttribute('data-ref', msg.uuid);
    });

    socket.on('fb_messenger_auth', function (data) {
      // get the messenger id that the backend sent
      var messengerID = data.messenger_id;
      
      /* We'll add saving the messenger ID as a custom attribute here later as we're integrating Appboy */
    });
    ```
2. Now we have our Messenger authentication set up in our front end. Let's commit our code:
    
    ```
    git add .
    git commit -m "added auth event handling to frontend"
    git push heroku master
    ```
3. Let's test and make sure everything works. Navigate to the URL of your Heroku server and you should see your web app open up. Note that a significant part of the buttons don't yet work, but Facebook's Send to Messenger button will. If you don't see the button, go to [Facebook Messenger][12] and make sure you're logged in - since our App is in Development mode, the button will only be shown to people who are authorized in the App page. Click on the button. The Messenger bubble will change into a check mark and you should receive a welcome message on Messenger.

### Google Maps integration
Now that we have set up the Messenger button, let's add some flair to our web app by integrating Google Maps to have an auto-completing address field to get the delivery address for our imaginary pizza.

1. Let's keep editing our __utils.js__ file. Add the following code snippet at the end of the file. The code is an adapted version of [Google's Sample Code][14] for an Autocomplete address form, and it allows us to communicate with [Google's Maps API][15] to get address suggestions matching the user's search near where the connection is made and eventually get the different components of the address.
    
    ```javascript
    /* 
    4. GOOGLE MAPS AUTOCOMPLETE
    */
    var autocomplete;
          
    function initAutocomplete() {
        // Create the autocomplete object, restricting the search to geographical
        // location types.
        autocomplete = new google.maps.places.Autocomplete(
            /** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
            {types: ['address']});

        autocomplete.addListener('place_changed', function() {
            document.getElementById('order-button').disabled=false
        })
    }

    // Bias the autocomplete object to the user's geographical location,
    // as supplied by the browser's 'navigator.geolocation' object.
    function geolocate() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var geolocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                var circle = new google.maps.Circle({
                    center: geolocation,
                    radius: position.coords.accuracy
                });
                autocomplete.setBounds(circle.getBounds());
            });
        }
    }
    ```

2. Let's commit our code.

    ```
    git add .
    git commit -m "Integrated Google Maps"
    git push heroku master
    ```

3. Let's check that it works - open up the web app, and start typing an address on the address field. You should see a dropwdown of addresses near you, and after selecting your address the ordering button should activate:  
![Google Maps Autocomplete Prompt][maps_prompt]  
![Order button activates after address selection][maps_after_select]

If you're experiencing issues with Google Maps, please refer to the Frequently Asked Questions at the end of this tutorial.

### Order Handling
We're now finished adding the external APIs that are crucial for our app's functionality. However, our own buttons and fields don't yet do anything, and we need to add the rest of our code to make these fields and buttons work. Let's first set up the script that runs when we click the ordering button. We'll add to this script when we're integrating Appboy, but for now let's just set it up to collect data from the fields we fill out while ordering. This code belongs in the end of __utils.js__.

```javascript
/* 
5. FRONTEND EVENT-TRIGGERED FUNCTIONS 
*/

/**
 + Collects the order properties and selected delivery address when the order button is clicked on the page
 + @return nothing
 */
function dispatchOrder() {
    // get purchase properties
    var order = [];
    var margs = document.getElementById('marg-quantity').selectedIndex;
    var pepps = document.getElementById('pepp-quantity').selectedIndex;
    
    // check that something was ordered
    if (margs == 0 && pepps == 0) {
        alert("looks like your cart is empty, add something to your cart before ordering!");
        return false;
    }

    if (margs > 0) {
        // get extras for the order
        var margExtras = [];
        
        var margExtraCheese = document.getElementById('marg-extra-cheese')
        var margExtraPepperoni = document.getElementById('marg-extra-pepperoni')
        var margGarlic = document.getElementById('marg-garlic')
        
        if (margExtraCheese.checked) margExtras.push(margExtraCheese.value);
        if (margExtraPepperoni.checked) margExtras.push(margExtraPepperoni.value);
        if (margGarlic.checked) margExtras.push(margGarlic.value);

        order.push({"productID" : 0, "extras" : margExtras, "quantity" : margs});
    }

    if (pepps > 0) {
        // get extras for the order
        var peppExtras = [];
        
        var peppExtraCheese = document.getElementById('pepp-extra-cheese')
        var peppExtraPepperoni = document.getElementById('pepp-extra-pepperoni')
        var peppGarlic = document.getElementById('pepp-garlic')
        
        if (peppExtraCheese.checked) peppExtras.push(peppExtraCheese.value);
        if (peppExtraPepperoni.checked) peppExtras.push(peppExtraPepperoni.value);
        if (peppGarlic.checked) peppExtras.push(peppGarlic.value);

        order.push({"productID" : 1, "extras" : peppExtras, "quantity" : pepps});
    }

    // get users address
    var place = autocomplete.getPlace()
    var fieldCounter = 0;
    var orderDetails = {};

    orderDetails.order = order;
    orderDetails.order = encodeURIComponent(JSON.stringify(orderDetails));

    // address components that we need from the address
    var componentForm = {
        street_number: 'short_name',
        route: 'long_name',
        locality: 'long_name',
        administrative_area_level_1: 'short_name',
        country: 'short_name',
        postal_code: 'short_name'
    };

    // put together address from address components
    for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
        if (componentForm[addressType]) {
            orderDetails[Object.keys(componentForm)[fieldCounter]] = place.address_components[i][componentForm[addressType]];
            fieldCounter++;
        }
    }

    // merge street number and name into one field and delete partial fields
    orderDetails['street_address'] = orderDetails['street_number'] + ' ' + orderDetails['route'];
    delete orderDetails['street_number'];
    delete orderDetails['route'];

    /* We'll add Appboy Custom Event Logging here later on */
}

/* We'll add the Appboy user identification function here later. */
```

Once again, let's push the code to Heroku.

```
git add .
git commit -m "Added order details collection"
git push heroku master
```

## Integrating Appboy's Web SDK
In order for us to send an event-triggered message, we need to integrate Appboy's Web SDK.

### Adding Appboy
The first thing we have to do is add Appboy to our web app. Simply open up your __utils.js__ file and add the Appboy initialization script that will initialize Appboy to be used in our app to the end of the file:

```javascript
/*  
6. APPBOY INITIALIZATION SCRIPT
*/ 

+function(a,p,P,b,y) {
  appboy={};for(var s="destroy toggleAppboyLogging setLogger openSession changeUser requestImmediateDataFlush requestFeedRefresh subscribeToFeedUpdates logCardImpressions logCardClick logFeedDisplayed requestInAppMessageRefresh logInAppMessageImpression logInAppMessageClick logInAppMessageButtonClick subscribeToNewInAppMessages removeSubscription removeAllSubscriptions logCustomEvent logPurchase isPushSupported isPushBlocked registerAppboyPushMessages unregisterAppboyPushMessages submitFeedback ab ab.User ab.User.Genders ab.User.NotificationSubscriptionTypes ab.User.prototype.getUserId ab.User.prototype.setFirstName ab.User.prototype.setLastName ab.User.prototype.setEmail ab.User.prototype.setGender ab.User.prototype.setDateOfBirth ab.User.prototype.setCountry ab.User.prototype.setHomeCity ab.User.prototype.setEmailNotificationSubscriptionType ab.User.prototype.setPushNotificationSubscriptionType ab.User.prototype.setPhoneNumber ab.User.prototype.setAvatarImageUrl ab.User.prototype.setLastKnownLocation ab.User.prototype.setUserAttribute ab.User.prototype.setCustomUserAttribute ab.User.prototype.addToCustomAttributeArray ab.User.prototype.removeFromCustomAttributeArray ab.User.prototype.incrementCustomUserAttribute ab.InAppMessage ab.InAppMessage.SlideFrom ab.InAppMessage.ClickAction ab.InAppMessage.DismissType ab.InAppMessage.OpenTarget ab.InAppMessage.prototype.subscribeToClickedEvent ab.InAppMessage.prototype.subscribeToDismissedEvent ab.InAppMessage.prototype.removeSubscription ab.InAppMessage.prototype.removeAllSubscriptions ab.InAppMessage.Button ab.InAppMessage.Button.prototype.subscribeToClickedEvent ab.InAppMessage.Button.prototype.removeSubscription ab.InAppMessage.Button.prototype.removeAllSubscriptions ab.SlideUpMessage ab.ModalMessage ab.FullScreenMessage ab.ControlMessage ab.Feed ab.Feed.prototype.getUnreadCardCount ab.Card ab.ClassicCard ab.CaptionedImage ab.Banner display display.automaticallyShowNewInAppMessages display.showInAppMessage display.showFeed display.destroyFeed display.toggleFeed sharedLib".split(" "),i=0;i<s.length;i++){for(var k=appboy,l=s[i].split("."),j=0;j<l.length-1;j++)k=k[l[j]];k[l[j]]=function(){}}appboy.initialize=function(){console&&console.log("Appboy cannot be loaded - this is usually due to strict corporate firewalls or ad blockers.")};appboy.getUser=function(){return new appboy.ab.User};appboy.getCachedFeed=function(){return new appboy.ab.Feed};
    (y = a.createElement(p)).type = 'text/javascript';
    y.src = 'https://js.appboycdn.com/web-sdk/1.4/appboy.min.js';
    (c = a.getElementsByTagName(p)[0]).parentNode.insertBefore(y, c);
    if (y.addEventListener) {
      y.addEventListener("load", b, false);
    } else if (y.readyState) {
      y.onreadystatechange = b;
    }
  }(document, 'script', 'link', function() {
    appboy.initialize(apiKeys.appboy, {enableLogging: true});
    appboy.display.automaticallyShowNewInAppMessages();

  // open Appboy Session
    appboy.openSession();

});
```

Appboy is now set up for our app.

### Configuring our custom events and properties
The next step in finishing up with our code is to finalize the Appboy integration by starting to collect the Custom Attributes and Events that we need to collect. We'll do this in three steps.

1. First, we'll add a function that allows us to collect data about our users in Appboy. The following code will hash their e-mail address, set that as the user ID, and subsequently collect our users' e-mail address, first and last name as well as their phone number if they have been entered. Search your __utils.js__ file for `/* We'll add the Appboy user identification function here later. */` and paste the following function under the comment:

    ```javascript
    /**
     * Collects the user's input for their e-mail,  and selected delivery address when the order button is clicked on the page
     * @return nothing
     */
    function setAppboyUser() {
        // get email and create user ids and such
        var emailAddress = document.getElementById('email-address').value
        var hashedAddress = emailAddress.hashCode()
        var abUser = appboy.getUser().getUserId()

        // set Appboy user
        appboy.changeUser(hashedAddress)
        appboy.getUser().setEmail(emailAddress)

        // get user attributes from fields and set them in Appboy profile
        var firstName = document.getElementById('first-name').value
        var lastName = document.getElementById('last-name').value
        var phoneNumber = document.getElementById('phone-number').value

        if (firstName) appboy.getUser().setFirstName(firstName);
        if (lastName) appboy.getUser().setLastName(lastName);
        if (phoneNumber) appboy.getUser().setPhoneNumber(phoneNumber);

        // change id button to Identified!
        document.getElementById('login-button').value = "Identified!"
    }
    ```

2. Now, let's add the collection of the user's Messenger ID as a custom attribute. Find the comment `/* We'll add saving the messenger ID as a custom attribute here later as we're integrating Appboy */` and paste the following line of code under it:

    ```javascript
    // set messenger ID as a custom attribute
    appboy.getUser().setCustomUserAttribute('messenger_id', messengerID);
    ```

3. Let's add our Custom Event for the Pizza Order that will trigger our Facebook Messenger message. Find the comment that says `/* We'll add Appboy Custom Event Logging here later on */`, and paste the following line of code under it:

    ```javascript
    // log custom event for pizza order
    appboy.logCustomEvent('Ordered Pizza', orderDetails);
    ```

The front end of our web app is now complete! You can save __utils.js__ and close the file.

Congratulations! We have now built our entire web app! Time to make the final commit to Heroku and get the app up and running!

```
git add .
git commit -m 'Integrated Appboy and finished web app!'
git push heroku master
```

## Creating our first campaign
Now that we have a fully integrated web app, we can go over to the Appboy dashboard and set up a campaign using Webhooks and connected content to send the order details to our customers as they order pizza. Before we get started, open up your web app, enter your details, identify yourself, click the "Send to Messenger" button and go through the process of ordering pizza. This is the easiest way to make sure our custom attributes and events are saved in Appboy and can be used in creating the campaign.

### Getting ready
1. Open up your Appboy dashboard.
2. On the left side of the dashboard, find "Campaigns" under "Engagement"  
![Appboy Campaigns Location][appboy-selection]
3. Create a new campaign by selecting "Create Campaign" and subsequently "Webhook". Webhook campaigns allow us to make HTTP POST requests to a given endpoint, in this case, Facebook's Send API, sending in some data as a request that the endpoint then acts on.  
![Creating a Webhook Campaign][appboy-webhook]
4. Enter a name for your campaign.
5. On the right, next to "Compose Webhook", click on the gear icon. In the webhook settings, we need to let the server know that we're sending it JSON as the body of our request. Click "Add New Pair", and as a key enter `Content-Type`, and as a value enter `application/json`. The settings should now look like this:
![Sample Webhook Settings][appboy-webhook-settings]
6. Add the webhook URL. This is going to be in the following format, make sure to replace `<PAGE_ACCESS_TOKEN>` with your actual access token:  
`https://graph.facebook.com/v2.7/me/messages?access_token=<PAGE_ACCESS_TOKEN>`
7. Click the pen icon to go back to editing our campaign. Since our request is complex, find the dropdown menu for "JSON Key/Value Pairs", click on it and change to "Raw Text" mode. This enables us to enter a multi-level JSON request.

### Composing the JSON
1. Now we're finally ready to compose our JSON request that specifies the message we're sending! Let's start by configuring the body of the message. Since the request is quite long and complex, we recommend finalizing it in a text editor such as Sublime Text before copying and pasting it into Appboy.
2. Let's start by adding the field for the intended recipient into the request body. This will use a little bit of Liquid syntax to fetch the messenger_id of the recipient from the Appboy database. We'll also add a stub for a message, which we'll fill out in the upcoming steps.

    ```json
    {
      "recipient": {
        "id": "{{custom_attribute.${messenger_id}}}"
      },
      "message": {
        "attachment": {
          "type": "template",
          "payload": {

          }
        }
      }
    }
    ```
3. Next, we'll fill out the payload section. Our payload will specify what the message should contain, and we'll use Liquid logic and Connected Content to correctly format our content as JSON. Our first step is to add a Liquid filter to combine the first and last name of the recipient and use a default value if the name isn't available. We'll add this right below the line with "payload":  
```{% assign name = {{${first_name} | default: 'Valued'}} | append: ' ' | append: {{${last_name} | default: 'Customer'}} %}```  
We can use the Liquid variable `{{name}}` later to refer to this name.
4. Below the line where we created the Name variable, add this JSON, which will specify most of our message body. The Liquid in the timestamp field simply gets the current time and formats it as a long integer that Facebook will understand.

    ```json
    "template_type":"receipt",
    "recipient_name":"{{name}}",
    "order_number":"12345678902",
    "currency":"USD",
    "payment_method":"Visa 1234",
    "order_url":"http://appboy.com",
    "timestamp":"{{'now' | date: "%s"}}",
    "elements":[

    ],
    "address":{

    },
    "summary":{

    }
    ```
5. Let's fill out the elements section (between the brackets after "elements") by adding details about the products that the customer ordered. We'll make a connected content request to our server and fetch the details of the order that we saved as a Custom Event Property, and subsequently format it as JSON. Make sure to replace `<YOUR_HEROKU_URL>` with the address of your Heroku server.

    ```
    {% connected_content <YOUR_HEROKU_URL>/api/products?orderData={{event_properties.${order}}} :save order %}
    {% for order_item in order.item_data %}
    {
    "title" : "{{order_item.title}}", 
    "subtitle":"{{order_item.subtitle}}", 
    "quantity":"{{order_item.quantity}}", 
    "price":"{{order_item.price}}", 
    "currency":"USD", 
    "image_url":"{{order_item.image_url}}" 
    }
    {% unless forloop.last %}
    ,
    {% endunless %}
    {% endfor %}
    ```

6. Next, we'll get the address from the Custom Event Properties that we pass to the server when the custom event gets logged. Between the curly braces after "address", add the following, which will simply fetch the details of the event and use a default value in case for some reason the event properties did not come through.

    ```
    "street_1":"{{ event_properties.$(street_address) | default: '318 West 39th Street' }}",
    "city":"{{ event_properties.$(locality) | default:'New York' }}",
    "postal_code":"{{ event_properties.$(postal_code) | default: 10018 }}",
    "state":"{{ event_properties.$(administrative_area_level_1) | default: 'NY' }}",
    "country":"{{event_properties.$(country) | default: 'US' }}"
    ``` 

7. Finally, let's add the Summary section between the curly braces after "summary". This code will fetch the subtotals from the connected content request we made earlier.

    ```
    "subtotal":{{order.summary.subtotal}},
    "total_tax":{{order.summary.total_tax}},
    "total_cost":{{order.summary.total_cost}}
    ```

8. We now have a filled out JSON request, which should look like the one below. Check that yours matches it, and copy it into the request body in Appboy:

    ```
    {
      "recipient": {
        "id": "{{custom_attribute.${messenger_id}}}"
      },
      "message": {
        "attachment": {
          "type": "template",
          "payload": {
            {% assign name = {{${first_name} | default: 'Valued'}} | append: ' ' | append: {{${last_name} | default: 'Customer'}} %}
            "template_type":"receipt",
            "recipient_name":"{{name}}",
            "order_number":"1234567890",
            "currency":"USD",
            "payment_method":"Visa 1234",
            "order_url":"http://appboy.com",
            "timestamp":"{{'now' | date: "%s"}}",
            "elements":[
              {% connected_content <YOUR_HEROKU_URL>/api/products?orderData={{event_properties.${order}}} :save order %}
              {% for order_item in order.item_data %}
              {
              "title" : "{{order_item.title}}", 
              "subtitle":"{{order_item.subtitle}}", 
              "quantity":"{{order_item.quantity}}", 
              "price":"{{order_item.price}}", 
              "currency":"USD", 
              "image_url":"{{order_item.image_url}}" 
              }
              {% unless forloop.last %}
              ,
              {% endunless %}
              {% endfor %}
            ],
            "address":{
              "street_1":"{{ event_properties.$(street_address) | default: '318 West 39th Street' }}",
              "city":"{{ event_properties.$(locality) | default:'New York' }}",
              "postal_code":"{{ event_properties.$(postal_code) | default: 10018 }}",
              "state":"{{ event_properties.$(administrative_area_level_1) | default: 'NY' }}",
              "country":"{{event_properties.$(country) | default: 'US' }}"
            },
            "summary":{
              "subtotal":{{order.summary.subtotal}},
              "total_tax":{{order.summary.total_tax}},
              "total_cost":{{order.summary.total_cost}}
            }
          }
        }
      }
    }
    ```

### Setting up the campaign trigger and segmenting users
We want to send our campaign via Facebook Messenger in response to an event of ordering pizza. In order to do this, we must set up an event triggered campaign in Appboy. The below steps will help you finish up the campaign:

1. After copying the JSON request to the request body, click on "Delivery" either up top or in the bottom right of the page.
2. In the ensuing screen, select "Action-Based Delivery". Click on the "Select Trigger Type..." dropdown menu and select "Performed Custom Event" as the campaign trigger. Click "Add Trigger".
3. Now select the Custom Event "Ordered Pizza" as the trigger event.
4. Scroll down and make sure that "Allow users to become re-eligible to receive campaign" is checked and the delay is set to 1 minutes. Customers should be able to receive this message every time they order pizza, not just once. Also make sure that "Ignore frequency capping settings for this campaign" is checked. After these steps, the page should look like this (ignore the difference in the times, those are set automatically when the campaign is being created):  
![Sample delivery settings][appboy-step2]
5. Click on "Target Users". Under "Add Filter", select "Custom Attributes". In the box that appears, select "messenger_id", and select "exists". This simply means that the messenger ID for the user is set, we wouldn't want to make erroneous requests to the Send API. This window should look as follows:  
![Sample targeting settings][appboy-targeting]
6. Select the App you created to house your demo on the next page, and set the conversion deadline to whatever you want.
7. Finally, confirm that you got all the details right and confirm the campaign.
8. Go to your Heroku app's URL, go through the workflow of the app and you should receive a receipt on Messenger soon after clicking the "Order your imaginary pizza!" button.

__Congratulations! You've successfully created your first Messenger bot!__

## Frequently asked questions and additional challenges
### Frequently asked questions
#### The Send to Messenger Button is not showing up.
While your app is in Development Mode, the button only shows up to users who have been included as Admins, Developers or Testers of your app. If you created the app, go to [Messenger.com][12] and log in, then refresh your web app page.  If you are trying to share the bot page with someone, make sure they have "Administrator", "Developer" or "Tester" permissions for your app in the Facebook Developers page for your Facebook App. These can be managed under the "Roles" section of your App's settings.
  
#### My Google Maps field is reporting an error.
The most probable source of this error is your server's address not being authorized on Google Maps. Go to the [Credentials Management page][19] of the Google API Manager, find the API key you're trying to use and make sure that your web address is included in the allowed addresses in a format like `*pacific-chamber-12101.herokuapp.com/*`. Also make sure that you have the "Google Places API Web Service" enabled under Overview -> Enabled APIs on the Google Developer Console. Finally, make sure you have [verified your site with Google.][21]

#### I'm not receiving the message from the campaign on Messenger.
If you can chat with the bot but don't receive the Appboy-sent message with a receipt, check your [Appboy Message Error Log][22]. This will give you clues as to why your webhook is failing. Depending on the error message, please reference the relevant part of the tutorial and make sure you completed each step as instructed.

### Additional challenges
- Add [Wit.ai][7] and expand your bot's communication capabilities using AI
  - Or alternatively, program more preprogrammed responses to user input
- Use Appboy to automate and track more of your Messenger activities, such as sending the welcome message after authorization by using a custom event for authentication.
- Install a database on the back end to dynamically pull order data from the server
- Integrate the [Facebook User Profile API][17] to gather more information about your users
- Make the Messenger Bot a part of your organization's real communication!

[1]: http://newsroom.fb.com/news/2016/04/messenger-platform-at-f8/
[2]: http://git-scm.com/download/mac
[3]: https://developers.google.com/maps/documentation/javascript/get-api-key
[4]: https://signup.heroku.com/
[5]: https://toolbelt.heroku.com/
[6]: https://nodejs.org/en/
[7]: https://wit.ai/
[8]: https://www.facebook.com/pages/create
[9]: https://developers.facebook.com/apps/
[10]: assets/appboy_logo.png
[11]: http://socket.io/
[12]: https://messenger.com
[13]: https://developers.facebook.com/docs/messenger-platform/plugin-reference
[14]: https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform
[15]: https://developers.google.com/maps/documentation/javascript/3.exp/reference
[16]: https://dashboard.appboy.com/app_settings/app_settings/
[17]: https://developers.facebook.com/docs/messenger-platform/send-api-reference#user_profile_request
[18]: http://www.sublimetext.com/2
[19]: https://console.developers.google.com/apis/credentials/
[20]: https://www.google.com/webmasters/verification/home?hl=en
[21]: https://support.google.com/webmasters/answer/35179
[22]: https://dashboard.appboy.com/app_settings/developer_console/errorlog/
[23]: css/styles.css
[24]: /menu.json
[25]: www/index.html
[adding_messenger]: assets/adding_messenger.png
[app_id_creation]: assets/app_id_creation.png
[appboy-selection]: assets/appboy-selection.png
[appboy-step2]: assets/appboy-step2.png
[appboy-targeting]: assets/appboy-targeting.png
[appboy-webhook-settings]: assets/appboy-webhook-settings.png
[appboy-webhook]: assets/appboy-webhook.png
[maps_prompt]: assets/maps_prompt.png
[maps_after_select]: assets/maps_after_select.png
[message_page_button]: assets/message_page_button.png
[page_access_token]: assets/page_access_token.png
[sample_chat_window]: assets/sample_chat_window.png
[sample_chat_structured]: assets/sample_structured_chat.png
[structured-message-examples]: https://cdn-images-1.medium.com/max/800/0*wQY4SN7xSHN4CoYz.jpg
[webhook_setup_button]: assets/webhook_setup_button.png
[webhook_setup_prompt]: assets/webhook_setup_prompt.png