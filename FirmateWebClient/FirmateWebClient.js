/************************************************************
* Copyright(C),2016-2017,LattePanda
* FileName: arduino.cs
* Author:   Kevlin Sun
* Version:  V0.1
* Date:     2016.12
* Description: This project provides a minimum HTTP-based firmata
  controller for various hardware, typically Arduino. This extends
  user's control and monitoring of the hardware using platform 
  independant URL requests.
* Support list:
  - Digital Pins
  - Analog Pins
  - PWM
  - Servo
* Special thanks to Rex Xia, on whose johnny five web client
  this code is based.
*************************************************************/

var http = require("http");
var urlParser = require('url');

var five = require("johnny-five");
var board;

var heartbeatInterval;

function initFirmata() {

  // use default address, auto detected
  five = require("johnny-five");
  board = new five.Board();

  // #################################################
  // main function
  board.on("ready", function() {

    // populate pin names
    initPinNames();

    // populate pin objects
    initPinWrites();

    // register reading hooks
    initPinReads();

    // populate the commands array
    initCommands();

    // create server after pin initialization
    createServer();

    heartbeat();

    log("Server is listening");

  });

  // end main
  // #################################################

}

initFirmata();


// for polling frequency calculation
var time = 0;
var count = 0;
var pollInterval = 50;

// Server listening port
var SERVER_PORT = 23456;

// frequency for checking serial port connection
var CONNECTION_TIMEOUT = 2000;

// names of pins. e.g. "5", "13", "A3"
var pinNames = [];

// Readings of Pins, not actual Pin objects.
var pinReads = {};

// provide reading functions to override pinRead values
// Currently used when the servo is sweeping.
var pinReadFuncs = {};

// Writing Pins, actual Pin objects.
var pinWrites = {};

// Record wrote pin data, avoid fast re-write
var pinWroteData = {};

// servo objs
var servos = {};

// piezo objs
var piezos = {};

// LCD, use LCD address as key
var lcds = {};

var lcdGuard = false;

// command objects. e.g. { "poll", function(){ /*returns pin data*/}}
var commands = {};

// debug info flag
var debug = true;

// global http server
var server;

var MODE_OUTPUT = five.Pin.OUTPUT;
var MODE_SERVO = five.Pin.SERVO;
var MODE_PWM = five.Pin.PWM;

// #################################################
// Initialization setups
function initPinNames() {
  pinNames = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "10", "11", "12", "13",
    "A0", "A1", "A2", "A3", "A4", "A5"
  ];
}

// ################################################
// create pins for writing

function initCommands() {
  commands = {
    "set_pwm": setPWM,
    "set_digital": setDigital,
    "set_servo": setServo,
    "sweep_servo": sweepServo,
    "stop_servo": stopServo,
    "reset_all": resetAll,
    "shutdown": shutdown,
    "read_all_pins":reportPins,
  };
}


var motorPin = {
  1: {
    direction: 7,
    speed: 6
  },
  2: {
    direction: 4,
    speed: 5
  }
};



function initPinWrites() {

  pinNames.forEach(function(pinName) {
    try {
      log(pinName);

      pinWrites[pinName] = new five.Pin({
        pin: pinName,
        mode: pinName.indexOf('A') < 0 ? 0 : 2 // input mode by default
      });

      //debug
      var injectPinName = 'pin' + pinName;
      if (debug) {
        board.repl.inject({
          injectPinName: pinWrites[pinName]
        });
      }
    } catch (err) {
      if (debug) {
        dir(err);
        log(err.stack.split("\n"));
      }
    }
  });
}

function initPinReads() {
  Object.keys(pinWrites).forEach(function(pinName) {
    try {
      var pin = pinWrites[pinName];

      log("initPinReads pinName: " + pinName + " type: " + pin.type + " mode: " + pin.mode);

      if (pin.type === 'analog') {
        pin.on("data", function(value) {
          pinReads[pinName] = (value / 1023 * 5).toFixed(2);
        });
      } else if (pin.type === 'digital') {
        pin.on("data", function(value) {
          pinReads[pinName] = value;
        });
      }
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
    }
  });
}


// end init block
// #################################################


// #################################################
// for debugging
function dir() {
  var dataArray = [];
  for (var o in arguments) {
    dataArray.push(arguments[o]);
  }
  if (debug) {
    console.dir.apply(this, dataArray);
  }
}

function log() {
  var dataArray = [];
  for (var o in arguments) {
    dataArray.push(arguments[o]);
  }
  if (debug) {
    console.log.apply(this, dataArray);
  }
}
// #################################################


// #################################################
// command functions
function setDigital(params, force) {

  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1],
    pinVal = params[2];

  if (pinWrites[pinNumber] === null) {
    log("*****************creating new pin " + pinNumber);
    try {
      var pin = new five.Pin(pinNumber);
      pinWrites[pinNumber] = pin;
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));

    }
  }

  log("pinNumber %d, pinVal %d", pinNumber, pinVal);

  // check flag for force writing
  if (force || pinVal != pinWroteData[pinNumber]) {
    // set pin mode to output
    board.io.pinMode(pinNumber, five.Pin.OUTPUT);
    if (pinVal == 1) {
      pinWrites[pinNumber].high();
    } else {
      pinWrites[pinNumber].low();
    }

    pinReads[pinNumber] = pinVal;
    pinWroteData[pinNumber] = pinVal;
  }
  // TODO handle PWM
}


function setPWM(params) {

  // parse params, params[0] should be "set_pwm"
  var pinNumber = params[1],
    pinVal = params[2];

  if (pinWrites[pinNumber] === null) {
    log("*****************creating new pin " + pinNumber);
    try {
      var pin = new five.Pin(pinNumber);
      pinWrites[pinNumber] = pin;
    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));
    }
  }

  dir(pinWrites[pinNumber]);

  if (board.pins[pinNumber] && board.pins[pinNumber].supportedModes.indexOf(five.Pin.PWM) > 0) { // pin supports pwm
    log("set pwm pinNumber %s, pinVal %d", pinNumber, pinVal);

    // set pin mode to pwm
    board.io.pinMode(pinNumber, five.Pin.PWM);
    // write
    board.io.analogWrite(pinNumber, Math.round(pinVal));
    pinReads[pinNumber] = pinVal;
  } else {
    console.warn("Pin " + pinNumber + "does not support PWM");
  }
}

function setServo(params) {

  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1],
    degree = params[2];

  var servo = servos[pinNumber];

  if (!servo) {
    log("creating new servo " + pinNumber);
    try {
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;

    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));

    }
  }

  log("servoNumber %d, degree %d", pinNumber, degree);
  servo.to(degree);

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReads[pinNumber] = degree;
}

function stopServo(params) {

  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1];

  var servo = servos[pinNumber];

  if (!servo) {
    log("creating new servo " + pinNumber);
    try {
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;

    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));

    }
  }
  log("servoNumber %d stop", pinNumber);

  servo.stop();

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReads[pinNumber] = servo.value;
}

function sweepServo(params) {

  // parse params, params[0] should be "set_digital"
  var pinNumber = params[1];
  var servo = servos[pinNumber];

  if (!servo) {
    log("creating new servo " + pinNumber);
    try {
      servo = new five.Servo(pinNumber);
      servos[pinNumber] = servo;

    } catch (err) {
      dir(err);
      log(err.stack.split("\n"));

    }
  }

  log("servoNumber %d sweep", pinNumber);

  servo.sweep();

  pinWrites[pinNumber].mode = MODE_SERVO;
  pinReadFuncs[pinNumber] = function() {
  };
  return servos[pinNumber].value;
}

// writeObj is a function
function reportPins() {
  var pinStatus = {};
  Object.keys(pinWrites).forEach(function(pinName) {
    var readVal = pinReads[pinName];

    var pin = pinWrites[pinName];

    if (pin.type === "digital" && pin.mode != MODE_SERVO) {
      readVal = readVal == 1 ? "true" : "false";
    }

    // overwrite with reading functions
    var func = pinReadFuncs[pinName];
    if (func) {
      //log("calling reading func for %d", pinName);
      readVal = func();
    }

    var pinType = pin.type;

    var pinMode = pin.mode;

    // use "servo" to indicate servo reading
    if (pinMode == MODE_SERVO) {
      pinType = "servo";
    }

    // log(line);
    pinStatus[pinName] = readVal;;
  });

  return pinStatus;

}

function resetAll() {

  Object.keys(servos).forEach(function(pinName) {
    var servo = servos[pinName];
    servo.stop();
  });

  Object.keys(lcds).forEach(function(address) {
    if (lcds[address] && lcds[address].obj) {
      var lcd = lcds[address].obj;
      lcd.clear();
      lcd.blink();
    }
  });
}

function heartbeat() {

  heartbeatInterval = setInterval(function() {
    if (!isConnected()) {
      log("Error: disconnected!");
      shutdown();
      process.exit(-1);
      // retry connection
    }
  }, CONNECTION_TIMEOUT);

}

// checks if the connection is alive
// using the check version api call from firmata lib
function isConnected() {
  var now = new Date().getTime();
  board.io.reportVersion(function() {});
  if (now - board.io.dataTimeStamp > CONNECTION_TIMEOUT){
    return false;
  } else {
    return true;
  }
}

function shutdown() {
  console.log('shutting down...');
  clearInterval(heartbeatInterval);
  if (board) {
    board.io.sp.close();
    board.occupied = [];
  }
  pinWrites = [];
  board = null;
  five = null;
  delete require.cache[require.resolve('johnny-five')];
  setTimeout(process.exit, 100);
}

// #################################################
// create server async
function createServer() {

  // don't create server twice
  if (!server) {

    server = http.createServer(function(request, response) {

      // start recording request entry time
      if (time === 0) {
        time = new Date().getTime();
      }

      var parsedURL = urlParser.parse(request.url, true);

      dir(parsedURL.pathname);

      var params = parsedURL.pathname.substring(1).split("/");
      log(params);
      var command = params[0];

      var commandFunc = commands[command];

      // check board readiness again
      if (commandFunc && board.isReady) {
          response.end(JSON.stringify({
            command:params,
            data: commandFunc(params),
            type: parsedURL.query.type
          }));
      }

      count += 1;
      if (count % pollInterval === 0) {
        var currentTime = new Date().getTime();
        log((currentTime - time) / count);
        count = 0;
        time = currentTime;
      }

      response.end(JSON.stringify({
        data: "command faild",
        type: parsedURL.query.type
      }));
    });
  }

  server.listen(SERVER_PORT);

}

process.on('exit', function() {
  console.log('exiting process, shutting down connections');
  shutdown();
});

process.on('message', function(packet) {
  console.dir(packet);
});