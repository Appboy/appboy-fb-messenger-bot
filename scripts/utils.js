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

/* 
2. APPBOY INITIALIZATION SCRIPT
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
    appboy.initialize(apiKeys.appboy);
    appboy.display.automaticallyShowNewInAppMessages();
    // open Appboy Session
    appboy.openSession();
});

/* 
3. FRONTEND EVENT-TRIGGERED FUNCTIONS 
*/


function setAppboyUser() {
    // get email and create user ids and such
    var emailAddress = document.getElementById('email-address').value
    var hashedAddress = emailAddress.hashCode()
    var abUser = appboy.getUser().getUserId()

    appboy.changeUser(hashedAddress)
    appboy.getUser().setEmail(emailAddress)

    // set user attributes in profile
    var firstName = document.getElementById('first-name').value
    var lastName = document.getElementById('last-name').value
    var phoneNumber = document.getElementById('phone-number').value

    if (firstName) appboy.getUser().setFirstName(firstName);
    if (lastName) appboy.getUser().setLastName(lastName);
    if (phoneNumber) appboy.getUser().setPhoneNumber(phoneNumber);

    // change id button to Identified!
    document.getElementById('login-button').value = "Identified!"
}

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

    // log custom event for pizza order
    appboy.logCustomEvent('Ordered Pizza', orderDetails)
}

/* 
4. SOCKET.IO LISTENERS
*/
var socket = io({secure: true});

socket.on('response', function (msg) {
    // store uuid for this session
    sessionStorage.uuid = msg.uuid;
    // configure Facebook messenger auth event to send uuid to backend
    document.getElementById('messenger-button').setAttribute('data-ref', msg.uuid);
});

socket.on('fb_messenger_auth', function (data) {
    // get the messenger id that the backend sent
    var messengerID = data.messenger_id;
    // set this as a custom attribute
    appboy.getUser().setCustomUserAttribute('messenger_id', messengerID);
});

/* 
5. FACEBOOK MESSENGER BUTTON
*/
window.fbAsyncInit = function() {
    FB.init({
        appId      : apiKeys.facebook.appID,
        xfbml      : true,
        version    : 'v2.6'
    });
}; (function(d, s, id){
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) {return;}
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

/* 
6. GOOGLE MAPS AUTOCOMPLETE
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