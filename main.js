const { SerialPort } = require('serialport');

let pingInterval;
let pingIntervalDelay = 1000;
let serialPortPath = 'COM8';
let serialPortBaudRate = 9600;

let port = new SerialPort({
  path: serialPortPath,
  baudRate: serialPortBaudRate,
  autoOpen: false,
});

port.on('error', (err) => {
  console.log('Error: ', err.message);
});

port.on('open', () => {
  console.log('port open event');
  pingStart();
});

port.on('close', () => {
  console.log('port close event');

  pingStop();
  // TODO: RECONNECT
});

const start = () => {
  console.log('start call');
  openPort();
};

const openPort = () => {
  console.log('openPort call');

  port.open((err) => {
    if (err) {
      return console.log('Error opening port: ', err.message);
    }
  });
};

const ping = () => {
//   console.log('ping call');

  let writeMessage = 'ping ' + new Date();
  console.log(writeMessage);
  port.write(writeMessage, portError);
};

const pingStart = () => {
  console.log('ping call');

  pingInterval = setInterval(ping, pingIntervalDelay);
};

const pingStop = () => {
  clearInterval(pingInterval);
};

const portError = (event) => {
  console.log('Error: ' + event);
};

start();
