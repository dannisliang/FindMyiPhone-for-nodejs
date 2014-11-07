var request = require('request');


var user = 'yourAppleIDMail';
var passwd = 'yourAppleIDPassword';
var mailUpdates = false; // for refreshClient


var host = 'fmipmobile.icloud.com';
var scope = '';
var devices = [];
var host_orig = 'fmipmobile.icloud.com';

var clientContext = {
		appName : 'FindMyiPhone',
		appVersion : '3.0',
		buildVersion : '376',
		clientTimestamp : 0,
		deviceUDID : null,
		inactiveTime : 1,
		osVersion : '8.1',
        productType : 'iPhone7,2'
};

var serverContext = {
     callbackIntervalInMS : 10000,
     classicUser : false,
     clientId : null,
     cloudUser : true,
     deviceLoadStatus : 200 ,
     enableMapStats : false,
     isHSA : false,
     lastSessionExtensionTime : null,
     macCount : 0,
     maxDeviceLoadTime : 60000,
     maxLocatingTime : 90000,
     preferredLanguage : 'en-us' ,
     prefsUpdateTime : 0,
     sessionLifespan : 900000,
     timezone : null,
     trackInfoCacheDurationInSecs : 86400,
     validRegion : true
};

var makeRequest = function(method, post_data, headers, callback, timeout){

    headers['Accept-Language'] = 'en-us';
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['X-Apple-Realm-Support'] = '1.0';
    headers['X-Apple-Find-Api-Ver'] = '3.0';
    headers['X-Apple-Authscheme'] = 'UserIdGuest';
    headers['User-Agent'] = 'FindMyiPhone/376 CFNetwork/672.0.8 Darwin/14.0.0';
    
    if(timeout === undefined) timeout = 10000;
    if(!scope) scope = user;
    
    var url = 'https://' + host + '/fmipservice/device/' + scope + '/' + method;
    //console.log(url);
    
    var options = {
        url: url,
        headers: headers,
        body: post_data,
        timeout: timeout
    };
    
    request.post(options, callback)
        .auth(user, passwd, true);
}

var initClient = function(callback){
    var body = {
        clientContext: clientContext
    }

    makeRequest('initClient', JSON.stringify(body), {}, function(error, response, body){
        if(error) console.log(error);
        
       // console.log(response.headers);
       // console.log(response.statusCode);
        //console.log(body);
        
        host = response.headers['x-apple-mme-host'];
        scope = response.headers['x-apple-mme-scope'];
        if(!host) host = host_orig;
        if(!scope) scope = ''; // LOL
        
        callback(host && scope);
    });
}

var refreshClient = function(callback){
    var body = {
        clientContext: clientContext,
        serverContext : serverContext,
        emailUpdates: mailUpdates
    }

    makeRequest('refreshClient', JSON.stringify(body), {} ,function(error, response, body){
        if(error) console.log(error);
        
        body = JSON.parse(body);
        
        for(var i = 0; i < body.content.length; i++){
              devices.push(body.content[i]);
        }
      
        callback(response.statusCode, devices);
    });   
}

var playSound = function(options, callback){
    if(!options.deviceID instanceof String) return console.log('DeviceID should be a string!');
    if(!options.subject instanceof String) return console.log('Subject should be a string!');
    
    var body = {
        clientContext: clientContext,
        serverContext: serverContext,
        device: options.deviceID,
        subject: options.subject,
        emailUpdates: options.mailUpdates
    };
    
    makeRequest('playSound', JSON.stringify(body), {} ,function(error, response, body){
        callback(options.deviceID, JSON.parse(body).content[0].snd);
    });
}

var sendMessage = function(options, callback){

    if(!options.deviceID instanceof String) return console.log('DeviceID should be a string!');
    if(!options.subject instanceof String) return console.log('Subject should be a string!');
    if(!options.text instanceof String) return console.log('Text should be a string!');
            
    var body = {
        clientContext: clientContext,
        serverContext: serverContext,
        device: options.deviceID,
        subject: options.subject,
        emailUpdates: options.mailUpdates,
        sound: options.sound,
        userText: true,
        text: options.text
    };    
    
    makeRequest('sendMessage', JSON.stringify(body), {} ,function(error, response, body){
        callback(options.deviceID, JSON.parse(body).content[0].msg);
    });
    
}

var lostDevice = function(options, callback){
    if(!options.deviceID instanceof String) return console.log('DeviceID should be a string!');
    if(options.passcode.length != 4 || !options.passcode.length instanceof String) return console.log('Passcode should be 4 chars long!');
    if(options.ownerPhoneNumber instanceof String) return console.log('Phone number should be a string');
    if(options.text instanceof String) return console.log('Text should be a string');
    
    var body = {
        clientContext: clientContext,
        serverContext: serverContext,
        trackingEnabled: true,
        userText: true,
        lostModeEnabled: true,
        device: options.deviceID,
        emailUpdates: options.mailUpdates,
        ownerNbr: options.ownerPhoneNumber,
        passcode: options.passcode,
        sound: options.sound,
        text: options.text
    };
    
     makeRequest('lostDevice', JSON.stringify(body), {} ,function(error, response, body){
        callback(options.deviceID, JSON.parse(body).content[0].lostDevice);
    });   
}

var remoteLock = function(options, callback){
    if(!options.deviceID instanceof String) return console.log('DeviceID should be a string!');
    if(options.passcode.length != 4 || !options.passcode.length instanceof String) return console.log('Passcode should be 4 chars long!');
    
    var body = {
        clientContext: clientContext,
        serverContext: serverContext,
        device: options.deviceID,
        emailUpdates: options.mailUpdates,
        passcode: options.passcode
    };
    
    makeRequest('remoteLock', JSON.stringify(body), {} ,function(error, response, body){
        callback(options.deviceID, JSON.parse(body).content[0].remoteLock);
    }); 
 }


Array.prototype.indexOfObject =  function(object){
    var index = -1;
    for(var i = 0; i < this.length; i++){
        if(this[i] === object){
            index = i;
            break;
        }
    }
    return index;
}

var locateDevice = function(options, callback){
    if(!options.deviceID instanceof String) return console.log('DeviceID should be a string!');

    //console.log(devices);

    var device = {};
    for(var i = 0; i < devices.length; i++){
        if(devices[i].id === options.deviceID){
            device = devices[i];
            break;
        }
    }
    
    // actual block which tracks the device
    var track = function(device){
        var startTime = new Date().getTime();    
        var index = devices.indexOfObject(device);
        
        if(devices[index].location.locationFinished){
            callback(options.deviceID, devices[index].location); // If already locationFinished -> callback
            return;
        }
        
        while(!devices[index].location.locationFinished){
            setTimeout(function(){
            
                refreshClient(function(code, devices){ 
                     var currentTime = new Date().getTime();  
                     if(devices[index].location.locationFinished) callback(options.deviceID, devices[index].location);
                     
                    if(currentTime - startTime > options.timeout){
                        callback(options.deviceID, devices[index].location);
                    }
                    
                });                
            
            }, 2000); // wait 2 seconds between refreshes
        }
        
    } 
    
    
    if(!device){ 
        refreshClient(function(code, devices){ 
             track(device);
        });
    }else{
         track(device);
    }    
}

initClient(function(success){ // call this first!

    refreshClient(function(code, devices){
        
        /*
        var options = {
            deviceID: '4ehRh2jIWwbBQlUQuCmF4o3i2YqSA/8r/sio8qrd64EvNd/CJaZjMeHYVNSUzmWV',
            subject: 'MySubject :P',
            mailUpdates: false
        };
        
        playSound(options, function(deviceID, result){
            if(result.statusCode == parseInt(200)){
                console.log('Success!');
            }else{
                console.log('Error!' + '(' + result.statusCode +')');
            }
        });
        */
        
        /*
        var options = {
            deviceID: '4ehRh2jIWwbBQlUQuCmF4o3i2YqSA/8r/sio8qrd64EvNd/CJaZjMeHYVNSUzmWV',
            subject: 'MySubject',
            text: 'MyText',
            sound: true,
            mailUpdates: false
        };
        
        sendMessage(options, function(deviceID, result){
            if(result.statusCode == parseInt(200)){
                console.log('Success!');
            }else{
                console.log('Error!' + '(' + result.statusCode +')');
            }
        });
        */
        
         /*
        var options = {
            deviceID: '4ehRh2jIWwbBQlUQuCmF4o3i2YqSA/8r/sio8qrd64EvNd/CJaZjMeHYVNSUzmWV',
            mailUpdates: false,
            ownerPhoneNumber: '0049 2871 17705',
            passcode: '1234',
            sound: true,
            text: 'Lost this device...'
        };
        
        lostDevice(options, function(deviceID, result){
            if(result.statusCode == parseInt(2204)){
                console.log('Success!');
            }else{
                console.log('Error!' + '(' + result.statusCode +')');
            }
        });
         */
        
        /*
        var options = {
            deviceID: '4ehRh2jIWwbBQlUQuCmF4o3i2YqSA/8r/sio8qrd64EvNd/CJaZjMeHYVNSUzmWV',
            mailUpdates: false,
            passcode: '1819'
        };
        
        remoteLock(options, function(deviceID, result){
            if(result.statusCode == parseInt(2200) || result.statusCode == parseInt(2204)){
                console.log('Success!');
            }else{
                console.log('Error!' + '(' + result.statusCode +')');
            }
        });
        */
        
    
        var options = {
            deviceID: '4ehRh2jIWwbBQlUQuCmF4o3i2YqSA/8r/sio8qrd64EvNd/CJaZjMeHYVNSUzmWV',
            timeout: 12000
        };
        
        locateDevice(options, function(deviceID, result){
            console.log('Longitude: ' + result.longitude + ' Latitude: ' + result.latitude);
        });
                
    });
    
});
