/*
* IoT Hub Raspberry Pi NodeJS - Microsoft Sample Code - Copyright (c) 2017 - Licensed MIT
*/
'use strict';

var http = require('http');

const fs = require('fs');
const path = require('path');

const wpi = require('wiring-pi');

const Client = require('azure-iot-device').Client;
const ConnectionString = require('azure-iot-device').ConnectionString;
//var ConnectionString = 'HostName=devmbotsyiot001.azure-devices.de;DeviceId=Madmax;SharedAccessKey=gyfKzJR0qCgvH1FSO29bTYGwbuSAKRX7VMOL6e4Yryk=';
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt;

const bi = require('az-iot-bi');

const MessageProcessor = require('./messageProcessor.js');
var server = http.createServer(function (req, res) { //add the server

    fs.readFile('./index.html', 'utf-8', function (error, content) {

        res.writeHead(200, {
            "Content-Type": "text/html"
        });

        res.end(content);

    });

});

var io = require('socket.io').listen(server); //add socket io
io.sockets.on('connection', function (socket) {
var sendingMessage = true;
var messageId = 0;
var client, config, messageProcessor;

function sendMessage() {
  if (!sendingMessage) { return; }
  
  setInterval(function () {
  messageId++;
  messageProcessor.getMessage(messageId, (content, temperatureAlert) => {
    var message = new Message(content);
    message.properties.add('temperatureAlert', temperatureAlert ? 'true' : 'false');
    console.log('Sending message: ' + message.getData());
    socket.emit('message',message.getData());
    client.sendEvent(message, (err) => {
      if (err) {
        console.error('Failed to send message to Azure IoT Hub');
      } else {
        blinkLED();
        console.log('Message sent to Azure IoT Hub');
      }
     // setTimeout(sendMessage, config.interval);
    });
  });
  },2000);
 
}

function onStart(request, response) {
  console.log('Try to invoke method start(' + request.payload || '' + ')');
  sendingMessage = true;

  response.send(200, 'Successully start sending message to cloud', function (err) {
    if (err) {
      console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
    }
  });
}

function onStop(request, response) {
  console.log('Try to invoke method stop(' + request.payload || '' + ')')
  sendingMessage = false;

  response.send(200, 'Successully stop sending message to cloud', function (err) {
    if (err) {
      console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
    }
  });
}

function receiveMessageCallback(msg) {
  blinkLED();
  var message1 = msg.getData().toString('utf-8');
  
  client.complete(msg, () => {
   // io.sockets.on('connection', function (socket) {
    console.log('Receive message: ' + message1);
    socket.emit('messagefromiot', message1); 
   //socket.emit('messagefromiot',message1.getData());
   //});
  });
}

function blinkLED() {
  // Light up LED for 500 ms
  wpi.digitalWrite(config.LEDPin, 1);
  setTimeout(function () {
    wpi.digitalWrite(config.LEDPin, 0);
  }, 500);
}

function initClient(connectionStringParam, credentialPath) {
  var connectionString = ConnectionString.parse(connectionStringParam);
  var deviceId = connectionString.DeviceId;

  // fromConnectionString must specify a transport constructor, coming from any transport package.
  client = Client.fromConnectionString(connectionStringParam, Protocol);

  // Configure the client to use X509 authentication if required by the connection string.
  if (connectionString.x509) {
    // Read X.509 certificate and private key.
    // These files should be in the current folder and use the following naming convention:
    // [device name]-cert.pem and [device name]-key.pem, example: myraspberrypi-cert.pem
    var connectionOptions = {
      cert: fs.readFileSync(path.join(credentialPath, deviceId + '-cert.pem')).toString(),
      key: fs.readFileSync(path.join(credentialPath, deviceId + '-key.pem')).toString()
    };

    client.setOptions(connectionOptions);

    console.log('[Device] Using X.509 client certificate authentication');
  }
  return client;
}

(function (connectionString) {
  // read in configuration in config.json
  try {
    config = require('./config.json');
  } catch (err) {
    console.error('Failed to load config.json: ' + err.message);
    return;
  }

  // set up wiring
  wpi.setup('wpi');
  wpi.pinMode(config.LEDPin, wpi.OUTPUT);
  messageProcessor = new MessageProcessor(config);

  bi.start();
  var deviceInfo = {device:"RaspberryPi",language:"NodeJS"};
  if(bi.isBIEnabled()) {
    bi.trackEventWithoutInternalProperties('yes', deviceInfo);
    bi.trackEvent('success', deviceInfo);
  }
  else
  {
    bi.trackEventWithoutInternalProperties('no', deviceInfo);
  }
  bi.flush();

  // create a client
  // read out the connectionString from process environment
  //connectionString = connectionString || process.env['AzureIoTHubDeviceConnectionString'];
    connectionString = 'HostName=devmbotsyiot001.azure-devices.de;DeviceId=Madmax;SharedAccessKey=gyfKzJR0qCgvH1FSO29bTYGwbuSAKRX7VMOL6e4Yryk=';
    client = initClient(connectionString, config);

  client.open((err) => {
    if (err) {
      console.error('[IoT hub Client] Connect error: ' + err.message);
      return;
    }

    // set C2D and device method callback
    client.onDeviceMethod('start', onStart);
    client.onDeviceMethod('stop', onStop);
    client.on('message', receiveMessageCallback);
    setInterval(() => {
      client.getTwin((err, twin) => {
        if (err) {
          console.error("get twin message error");
          return;
        }
        config.interval = twin.properties.desired.interval || config.interval;
      });
    }, config.interval);
    sendMessage();
  });
})(process.argv[2]);
});
server.listen(8080);
