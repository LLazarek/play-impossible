/**
 * Connects to a Bluetooth device.
 * The background color shows if a Bluetooth device is connected (green) or
 * disconnected (red).
 * Logs every step, and all the services and characteristics of the
 * Bluetooth device.
 */

// put this in the html
// <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
// <script>eruda.init();</script>
//     <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
//     <table>
//     <tr>
//         <td><canvas id="myChart1"></canvas></td>
//         <td><canvas id="myChart2"></canvas></td>
//         <td><canvas id="myChart3"></canvas></td>
//     </tr>
//     <tr>
//         <td><canvas id="myChart4"></canvas></td>
//         <td><canvas id="myChart5"></canvas></td>
//         <td><canvas id="myChart6"></canvas></td>
//     </tr>
// </table>
//     <canvas id="myChart"></canvas>

var bluetoothDevice;
var serverVar;
var tableFormat = true;


let sampleRates = {
    "1Hz": 1,
    "10Hz": 2,
    "25Hz": 3,
    "50Hz": 4,
    "100Hz": 5,
    "200Hz": 6,
    "400Hz": 7,
    "1.6kHz": 8,
}

function getSampleRate(rate) {

    let sampleRate = sampleRates[rate];
    return Uint8Array.of(sampleRate << 4 | 0x7);
}

// function to turn a uint8array into a hex string
function toHexString(byteArray) {
    return '0x' + Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

/**
 * Object containing the Bluetooth UUIDs of all the services and
 * characteristics of the micro:bit.
 */
var gameballUuid = {
    /**
     * Services
     */
    genericAccess:                              ["00001800-0000-1000-8000-00805f9b34fb", "Generic Access"],
    genericAttribute:                           ["00001801-0000-1000-8000-00805f9b34fb", "Generic Attribute"],
    deviceInformation:                          ["0000180a-0000-1000-8000-00805f9b34fb", "Device Information"],
    accelerometerService:                       ["c75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 1 Service"],
    accelerometer2Service:                        ["d75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 2 Service"],
    gameballService:                            ["00766963-6172-6173-6f6c-7574696f6e73", "Gameball Service"],
    sensorStreamService:                        ["a54d785d-d674-4cda-b794-ca049d4e044b", "Sensor Stream Service"],
    capacitorService:                           ["f4ad0000-d674-4cda-b794-ca049d4e044b", "Capacitor Service"],
    magnetometerService:                           ["acefaea4-db2b-4784-a980-c77ce1994d69", "Magnetometer Service"],

    /**
     * Characteristics
     */
     a1Config:  ["1006bd26-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_config"],
     a1Thresh:  ["1006bd28-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_threshold"],
     a1Data:    ["1006bfd8-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_data"],
     a1id:      ["bb64a6c3-3484-4479-abd2-46dff5bfc574", "accelerometer_1_id"],
     a2Config:  ["8f20fa52-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_config"],
     a2Thresh:  ["8f20fa54-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_threshold"],
     a2Data:    ["8f20fcaa-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_data"],
     a2id:      ["a93d70c9-ed5d-4af1-b0ad-518176309dfb", "accelerometer_2_id"],
     magCom:    ["31696178-3630-4892-adf1-19a7437d052a", "magnetometer_command"],
     magData:   ["042eb337-d510-4ee7-943a-baeaa50b0d9e", "magnetometer_data"],
     magRate:   ["08588aac-e32e-4395-ab71-6508d9d00329", "magnetometer_rate"],
     magid:     ["ea1c2a4b-543c-4275-9cbe-890024d777eb", "magnetometer_id"],
     devTest:   ["8e894cbc-f3f8-4e6b-9a0b-7247598552ac", "device_test"],
     devReset:  ["01766963-6172-6173-6f6c-7574696f6e73", "device_reset"],
     devRef:    ["0d42d5d8-6727-4547-9a82-2fa4d4f331bd", "device_refresh_gatt"],
     devName:   ["7c019ff3-e008-4268-b6f7-8043adbb8c22", "device_name"],
     devCol:    ["822ec8e4-4d57-4e93-9fa7-d47ae7e941c0", "device_color"],
     sstream:   ["a54d785d-d675-4cda-b794-ca049d4e044b", "sensor_stream_config"],
     ssdata:    ["a54d785d-d676-4cda-b794-ca049d4e044b", "sensor_stream_data"],
     capV:      ["f4ad0001-d675-4cda-b794-ca049d4e044b", "capacitor_voltage"],
     capCharge: ["a59c6ade-5427-4afb-bfe4-74b21b7893a0", "capacitor_charging"],

    /**
     * Method that searches an UUID among the UUIDs of all the services and
     * characteristics and returns:
     * - in HTML blue color the name of the service/characteristic found.
     * - in HTML red color a message if the UUID has not been found.
     * @param uuid The service or characteristic UUID.
     * @param serviceOrCharacteristic True (or 1) if it is a service, and false
     * (or 0) if it is a characteristic.
     */
    searchUuid(uuid, serviceOrCharacteristic) {
        for (const key in gameballUuid) {
            if (uuid === gameballUuid[key][0]) {
                return "<font color='blue'>" + gameballUuid[key][1] + "</font>";
            }
        }
        if (serviceOrCharacteristic) {
            return "<font color='red'>Unknown Service</font>";
        } else {
            return "<font color='red'>Unknown Characteristic</font>";
        }
    },
}


let model;

async function modelBusiness() {
  model = await tf.loadGraphModel("https://raw.githubusercontent.com/Adit31/Explorer_Treat/master/Gesture-detect-model/model.json");
  console.log(model);
}

modelBusiness();
let predictLength = 10;

let outputClass ="";

async function runPredict() {
  // 0 -> toss, 1 -> roll, 2 -> hold
  let dataLength = printData.length;
  let predictRows = printData.slice(dataLength - predictLength);
  const dataList = [];
  if(predictRows.length >= predictLength) {
    for(let i=0; i<predictLength; i++) {
      dataList[i] = [predictRows[i]['a1'], predictRows[i]['a2'], predictRows[i]['a3'], 
                     predictRows[i]['a4'], predictRows[i]['a5'], predictRows[i]['a6'],
                     predictRows[i]['a7'], predictRows[i]['a8'], predictRows[i]['a9'], 0];
      
    }
    for(let i=predictLength; i<275; i++) {
      dataList[i] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    let dataListTensor = tf.tensor(dataList);
    // console.log("########", dataList);
    // console.log("$$$$$$$$$", dataListTensor.arraySync());
    dataListTensor = tf.transpose(dataListTensor);
    dataListTensor = dataListTensor.reshape([1, 10, 275]);
    // console.log("@@@@@@@", dataListTensor.arraySync());
    await model.executeAsync(dataListTensor).then((res) => {
      let predictions = res.dataSync();
      const maxIndex = predictions.indexOf(Math.max(...predictions));
      if(maxIndex == 0) {
        outputClass = "Toss";
      }
      else if(maxIndex == 1) {
        outputClass = "Roll";
      }
      else if(maxIndex == 2) {
        outputClass = "Hold";
      }
      // console.log("prediction: ", outputClass);
      return outputClass;
      // console.log(predictions);
    });
    return outputClass;
  }
  
  // console.log(prediction.array());
  // addLog(prediction);  
}

let predicting = false;
let pToggle = document.getElementById("predictionToggle");
let pText = document.getElementById("predictionVal");
let dataLength = 0

async function togglePredicting() {
  pToggle.classList.toggle("btn-success")
  pToggle.classList.toggle("btn-danger")
  
  predicting = !predicting;
  
  if (predicting) {
    pToggle.innerText = "Stop Predicting";
    dataLength = printData.length;
    // startPredictLoop()
    
  }
  else {
    pToggle.innerText = "Start Predicting";
  }
  
}


async function start() {
  // 2. Initialize the JavaScript client library.
  console.log("trying to read file");
  var keysRes = await fetch('keys');
  var kr = JSON.parse(await keysRes.text());
  console.log(kr);

  gapi.client.init({
    'apiKey': kr.apiKey,
    // 'discoveryDocs': ['https://people.googleapis.com/$discovery/rest'],
    // clientId and scope are optional if auth is not required.
    'clientId': kr.clientId,
    'scope': 'profile',
  }).then(function() {
    // 3. Initialize and make the API request.
    // return gapi.client.people.people.get({
    //   'resourceName': 'people/me',
    //   'requestMask.includeField': 'person.names'
    // });
    return gapi.client.request({
        path: "https://script.googleapis.com/v1/scripts/AKfycbwOcXO3lbZiYAXZGaS0U-unR6-RGXEIU68SvTinYufVMGP537Lyr6DC070iFqilyeJi:run",
        method: "POST"
    });
  }).then(function(response) {
    console.log(response);
  }, function(reason) {
    // console.log('Error: ' + reason.result.error.message);
    console.log(reason);
  });
};
// 1. Load the JavaScript client library.
// gapi.load('client', start);

// 



/**
 * Function that adds string to the log. If newLine is true, it adds a new line
 * at the end of the string.
 * @param string String to print to the log.
 * @param newLine Boolean that specifies whether to start a new line or not.
 */
function addLog(string, newLine) {
    document.getElementById("log").innerHTML += string;
    if (newLine) {
        document.getElementById("log").innerHTML += "<br>";
    };
}

/**
 * Function that adds string (and newline) to the log in bold and red color.
 * @param string String to print to the log.
 */
function addLogError(string) {
    addLog("<b><font color='red'>" + string + "</font></b>", true);
}

/**
 * Function that empties the log.
 */
function clearLog() {
    document.getElementById("log").innerHTML = "";
}



/**
 * Function that gets the supported properties of a characteristic in upper
 * case separated by commas.
 * @param  characteristic Characteristic.
 */
function getSupportedProperties(characteristic) {
    let supportedProperties = [];
    for (const p in characteristic.properties) {
        if (characteristic.properties[p] === true) {
            supportedProperties.push(p.toUpperCase());
        }
    }
    return '[' + supportedProperties.join(', ') + ']';
}

/**
 * Function that turns the background color red.
 */

function time(text) {
  addLog('[' + new Date().toJSON().substr(11, 8) + '] ' + text);
}

async function onDisconnected() {
    console.log("disconnection!!");
    document.getElementById("body").style = "background-color:#FFD0D0";
}

/**
 * Function that prints a micro:bit service as a table row.
 * @param service Bluetooth service.
 */
function printService(service) {
    if (tableFormat) {
        stringTable += '<tr style="background-color:#D0D0D0"><td>Service</td><td>' + gameballUuid.searchUuid(service.uuid, 1) + '</td><td>' + service.uuid + '</td><td>-</td></tr>';
    } else {
        addLog('&nbsp;&nbsp;&nbsp;&nbsp;<b>Service: </b>' + gameballUuid.searchUuid(service.uuid, 1) + ' - ' + service.uuid, true);
    };
}

/**
 * Function that prints a micro:bit characteristic.
 * @param characteristic Bluetooth characteristic.
 */
function printCharacteristic(characteristic) {
    if (tableFormat) {
        stringTable += '<tr style="background-color:white"><td>Characteristic</td><td>' + gameballUuid.searchUuid(characteristic.uuid, 0) + '</td><td>' + characteristic.uuid + '</td><td>' + getSupportedProperties(characteristic) + '</td></tr>';
    } else {
        addLog('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Characteristic: </b>' + gameballUuid.searchUuid(characteristic.uuid, 0) + ' - ' + characteristic.uuid + ' ' + getSupportedProperties(characteristic), true);
    };
}



var nSer = Infinity;
var nChar = Infinity;
var stringTable = "";
var myDescriptor;
var a1DataChar;
var a1ThreshChar;
/**
 * Function that connects to a Bluetooth device, prints all its services and
 * all its characteristics.
 */


var accelServices = {
    "accel1": {
        "service": "accelerometerService", 
        "settingsChar": "a1Config",
        "threshChar": "a1Thresh"
    }, 
    "accel2": {
        "service": "accelerometer2Service",
        "settingsChar": "a2Config",
        "threshChar": "a2Thresh"
    }
};


// await writeCharVal(gameballUuid["accelerometerService"][0], gameballUuid["a1Config"][0], Uint8Array.of(0x197));
// await writeCharVal(gameballUuid["accelerometerService"][0], gameballUuid["a1Thresh"][0], Uint16Array.of(135));
// async function writeCharVal()

async function getChar(serviceUuid, charUuid, server) {
    var thisService = await service.getPrimaryService(serviceUuid);
    var thisChar = await thisService.getCharacteristic(charUuid);
    return thisChar;
}

function getCharId(charName) {
    return gameballUuid[charName][0]
}

async function startAccel(accelName, settingsVal, thresholdVal, server) {
    var asa = accelServices[accelName];
    var accelService = await server.getPrimaryService(getCharId(asa["service"]));
    var acSetting = await accelService.getCharacteristic(getCharId(asa["settingsChar"]));
    var acThresh = await accelService.getCharacteristic(getCharId(asa["threshChar"]));
    await acSetting.writeValue(settingsVal);
    await acThresh.writeValue(thresholdVal);
    return [acSetting, acThresh];
}


async function startReadingData(ch) {
    await ch.startNotifications();
    await ch.addEventListener('characteristicvaluechanged', handleDataChange);
    console.log(ch);
}

async function chargeRead(capCharacteristic) {
    // console.log(capCharacteristic);
    var cc = await capCharacteristic.readValue();
    var ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
    console.log(ccVal);

    if (cc != undefined) {
        // console.log("calling againt");
        setTimeout(chargeRead, 10000, capCharacteristic);
    }
}

// allServices = null;
async function startListening(device) {
    console.log("starting to listen!!!");
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    var gameService = await server.getPrimaryService(gameballUuid["gameballService"][0]);
    var refreshCharacteristic = await gameService.getCharacteristic(gameballUuid["devRef"][0]);
    // beware! endianness of the ball is flipped -- the lower byte of these numbers is being interpd as the higher byte
    // https://dotnetfiddle.net/
    // todo next, let's try to detect tosses
    // and then maybe angular rotation
    var a1Chars = await startAccel("accel1", getSampleRate('50Hz'), Uint16Array.of(135), server); // 0x197, 135
    await startAccel("accel2", getSampleRate('100Hz'), Uint16Array.of(135), server); // 0x647, 135
    
    var magService = await server.getPrimaryService(gameballUuid["magnetometerService"][0]);
    var magRateChar = await magService.getCharacteristic(gameballUuid["magRate"][0]);
    await magRateChar.writeValue(Uint8Array.of(0x3F));

    var sService = await server.getPrimaryService("a54d785d-d674-4cda-b794-ca049d4e044b");
    var streamChar = await sService.getCharacteristic("a54d785d-d675-4cda-b794-ca049d4e044b");
    var capService = await server.getPrimaryService(gameballUuid["capacitorService"][0]);
    var capCharacteristic = await capService.getCharacteristic(gameballUuid["capV"][0]);
    setTimeout(chargeRead, 10000, capCharacteristic);


    await streamChar.writeValue(Uint8Array.of(4));
    var streamRead = await sService.getCharacteristic("a54d785d-d676-4cda-b794-ca049d4e044b");
    startReadingData(streamRead);
    console.log(services);
    // secondaryServices
    // genericAttribute = await server.getPrimaryService("00001800-0000-1000-8000-00805f9b34fb");
    // genericAttribute = await server.getCharacteristic("generic_attribute");
    // genChars = await genericAttribute.getCharacteristics();
    // console.log(genChars);

    // sService = await server.getPrimaryService("a54d785d-d674-4cda-b794-ca049d4e044b");
    // streamRead = await sService.getCharacteristic("a54d785d-d676-4cda-b794-ca049d4e044b");
    return services;
}

async function connect() {
    addLog("Requesting micro:bit Bluetooth devices... ", false);
    if (!navigator.bluetooth) {
        addLogError("Bluetooth not available in this browser or computer.");
    } else {
    	// console.log(navigator.bluetooth.getDevices());
        const device = await navigator.bluetooth.requestDevice({
            // To accept all devices, use acceptAllDevices: true and remove filters.
            filters: [{namePrefix: "Gameball"}],
            // acceptAllDevices: true,
            optionalServices: [
                gameballUuid.genericAccess[0], 
                gameballUuid.genericAttribute[0], 
                gameballUuid.deviceInformation[0], 
                gameballUuid.accelerometerService[0], 
                gameballUuid.accelerometer2Service[0], 
                gameballUuid.gameballService[0], 
                gameballUuid.sensorStreamService[0], 
                gameballUuid.magnetometerService[0],
                gameballUuid.capacitorService[0]
                // gameballUuid.magnetometerService[0], 
                // gameballUuid.buttonService[0], 
                // gameballUuid.ioPinService[0], 
                // gameballUuid.ledService[0], 
                // gameballUuid.eventService[0], 
                // gameballUuid.dfuControlService[0], 
                // gameballUuid.temperatureService[0], 
                // gameballUuid.uartService[0]
            ],
        })
        // log('Connecting to GATT Server...');
        var cc;
        

        var services = await startListening(device);
            
        addLog("<font color='green'>OK</font>", true);
        bluetoothDevice = device;
        console.log(device);
        addLog("Connecting to GATT server (name: <font color='blue'>" + device.name + "</font>, ID: <font color='blue'>" + device.id + "</font>)... ", false);
        device.addEventListener('gattserverdisconnected', onDisconnected);
        document.getElementById("body").style = "background-color:#D0FFD0";
    
        addLog("<font color='green'>OK</font>", true);
        addLog("Getting primary services... ", false);
    
        addLog("<font color='green'>OK</font>", true);
        addLog("Getting characteristics... ", false);
        nSer = services.length;
        
        /**
         * Go to https://replit.com/languages/csharp
           byte[];
           data[0] = (byte) (128 | (byte) (((1f)data = new byte[]{0, 0}; / 16.0) * 127));
           data[1] = 0; 
           Console.WriteLine(BitConverter.ToUInt16(data)); * 
         **/
        
        // services.forEach(async (service) =>  {
        //     var characteristics = await service.getCharacteristics();
        //     nChar = characteristics.length;
        //     printService(service);
        //     nSer--;
        //     // console.log(characteristics);
        //     characteristics.forEach(async (characteristic) => {
        //         printCharacteristic(characteristic);
        //         nChar--;
        //         if ((nSer === 0) && (nChar === 0) && tableFormat) {
        //             addLog('<table><tr><th>Service/Characteristic</th><th>Name</th><th>UUID</th><th>Available properties</th></tr>' + stringTable + '</table>', false);
        //             stringTable = "";
        //         };
        //     });
        // });
    
    };
}


var printData = [];
var tagVal = -1;
var lastTagRow = 0;
var runningTag = -1;

class TriAxisAccelerometer {
  constructor(transform) {
    this.ax1 = 0;
    this.ax2 = 0;
    this.ay1 = 0;
    this.ay2 = 0;
    this.az1 = 0;
    this.az2 = 0;
    this.D = 1; // Distance between accelerometers, modify as needed.
    this.wThreshold = 0.1; // Threshold for w, modify as needed.
    // Initialize previous angular velocities to 0
    this.prevWZ = 0;
    this.prevWY = 0;
    this.transform = transform;
    this.history = []; // array of (timestamp, reading_l, reading_r)
    this.windowSize = 2; // seconds
  }

    calculateAngularVelocityWindowed(reading_l, reading_r) {
        let now = new Date().getTime();
        this.history.push([now, reading_l, reading_r]);
        // trim the history to the last windowSize seconds
        while (this.history.length > 0 && now - this.history[0][0] > this.windowSize * 1000) {
            this.history.shift();
        }

        var wZ = 0;
        var wY = 0;
        // iterate over the history and calculate the angular velocity
        for (var i = 0; i < this.history.length - 1; i++) {
            let deltaT = this.history[i + 1][0] - this.history[i][0];
            let l_transformed = this.transform(this.history[i][1]);
            let r_transformed = this.transform(this.history[i][2]);
            let ax1 = l_transformed[0];
            let ay1 = l_transformed[1];
            let az1 = l_transformed[2];
            let ax2 = r_transformed[0];
            let ay2 = r_transformed[1];
            let az2 = r_transformed[2];

            // Calculate total rotation rate magnitude from radial acceleration (Eqn 4)
            let w = Math.abs(ax2 - ax1) / this.D;
            w = w >= this.wThreshold ? w : 0; // Apply threshold

            // Calculate angular accelerations (Eqns 10 & 11)
            let alphaZ = (ay2 - ay1) / this.D;
            let alphaY = (az2 - az1) / this.D;

            // Numerical Integration using Euler's method (Eqns 12 & 13)
            wZ = wZ + alphaZ * deltaT;
            wY = wY + alphaY * deltaT;
        }
        // Calculate total angular rotation rate (Eqn 14)
        let wTotal = Math.sqrt(wY ** 2 + wZ ** 2);

        return { yaw: undefined, roll: undefined, w: wTotal };
    }


    calculateAngularVelocityAllTime(deltaT, reading_l, reading_r) {
      let l_transformed = this.transform(reading_l);
      let r_transformed = this.transform(reading_r);
      this.ax1 = l_transformed[0];
      this.ay1 = l_transformed[1];
      this.az1 = l_transformed[2];
      this.ax2 = r_transformed[0];
      this.ay2 = r_transformed[1];
      this.az2 = r_transformed[2];

    // Calculate total rotation rate magnitude from radial acceleration (Eqn 4)
    let w = Math.abs(this.ax2 - this.ax1) / this.D;
    w = w >= this.wThreshold ? w : 0; // Apply threshold

    // Calculate angular accelerations (Eqns 10 & 11)
    let alphaZ = (this.ay2 - this.ay1) / this.D;
    let alphaY = (this.az2 - this.az1) / this.D;

    // Numerical Integration using Euler's method (Eqns 12 & 13)
    let wZ = this.prevWZ + alphaZ * deltaT;
    let wY = this.prevWY + alphaY * deltaT;

    // Update previous angular velocities for the next iteration
    this.prevWZ = wZ;
    this.prevWY = wY;

    // Calculate total angular rotation rate (Eqn 14)
    let wTotal = Math.sqrt(wY ** 2 + wZ ** 2);

    // Calculate yaw and roll (Eqns 15 & 16)
    let yaw = w * (wZ / wTotal);
    let roll = w * (wY / wTotal);

    return { yaw, roll, w: wTotal };
  }
}

// function that transforms a vector [x, y, z] 90 degrees around the x axis
function rotate_x([x, y, z]) {
  return [x, -z, y];
}
// rotation for y
function rotate_y([x, y, z]) {
  return [z, y, -x];
}
// rotation for z
function rotate_z([x, y, z]) {
  return [-y, x, z];
}

var accel_base = new TriAxisAccelerometer(function(x) {return x;});
var accel_90x = new TriAxisAccelerometer(rotate_x);
var accel_90y = new TriAxisAccelerometer(rotate_y);
var accel_90z = new TriAxisAccelerometer(rotate_z);

function resetData() {
  dataLength = 0;
    printData = [];
    reset_plot();
}

function startTagging(tagVal) {
    runningTag = tagVal;
    document.getElementById("runningTag").innerHTML = "Running tag: " + runningTag;
}

window.addEventListener("keyup", (e) => {
  console.log(`Key "${e.key}" released [event: keyup]`);
  if (!isNaN(e.key)) {
    if (parseInt(e.key) == 0) {
      startTagging(-1);  
    }
    else {
      startTagging(e.key);
    }
  }
});



function tagData(tagVal) {
    for (var i = lastTagRow; i<printData.length; i++) {
        printData[i]["tag"] = tagVal;
    }
    lastTagRow = printData.length;
}

// Initialize the chart
var ctx = document.getElementById('myChart').getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],  // This will hold the timestamps or sample numbers
        datasets: [{
            label: 'w1',
            data: [],  // This will hold the values of w1
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        },
        {
            label: 'w2',
            data: [],  // This will hold the values of w2
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        },
        {
            label: 'w3',
            data: [],  // This will hold the values of w3
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
        },
        {
            label: 'w4',
            data: [],  // This will hold the values of w4
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'Seconds since start'
                }
            },
            y: {
                beginAtZero: true
            }
        }
    }
});

var myCharts = [];
for (let i = 0; i < 6; i++) {
    var ctx = document.getElementById('myChart' + (i + 1)).getContext('2d');
    myCharts[i] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Value',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Seconds since start'
                    }
                },
                y: {
                    type: 'logarithmic',
                    base: 2,
                    title: {
                        display: true,
                        text: 'Value (log scale, base 2)'
                    }
                }
            }
        }
    });
}

var x_base = new Date().getTime();
function update_plot(w1, w2, w3, w4) {
    myChart.data.labels.push((new Date().getTime() - x_base)/1000);
    myChart.data.datasets[0].data.push(w1);
    myChart.data.datasets[1].data.push(w2);
    myChart.data.datasets[2].data.push(w3);
    myChart.data.datasets[3].data.push(w4);
    myChart.update();
}


var max_w = 0;
function reset_plot() {
    x_base = new Date().getTime();
    myChart.data.labels = [];
    myChart.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });
    myChart.update();
    max_w = 0;

    for (let i = 0; i < 6; i++) {
        myCharts[i].data.labels = [];
        myCharts[i].data.datasets[0].data = [];
        myCharts[i].update();
    }
}


var lastSampleTime = new Date().getTime();
var shakeScore = 0;
function checkAccelerometerMagnitude(arr) {
    let time_now = new Date().getTime();
    let deltaT = (time_now - lastSampleTime) / 1000;
    lastSampleTime = time_now;
    for (let i = 0; i < 6; i++) {
        myCharts[i].data.labels.push((new Date().getTime() - x_base)/1000);
        myCharts[i].data.datasets[0].data.push(arr[i + 1]);
        myCharts[i].update();
    }

  arr = arr.map((x) => {return x*0.0008});
  var x1 = arr[1]; var y1 = arr[2]; var z1 = arr[3];
  var x2 = arr[4]; var y2 = arr[5]; var z2 = arr[6];
  var mag1 = (arr.slice(1,4)).reduce((s, x) => s + x**2, 0);
  var mag2 = (arr.slice(4,7)).reduce((s, x) => s + x**2, 0);
//   let w1 = accel_base.calculateAngularVelocity(deltaT, [x1, y1, z1], [x2, y2, z2]);
//   let w2 = accel_90x.calculateAngularVelocity(deltaT, [x1, y1, z1], [x2, y2, z2]);
//     let w3 = accel_90y.calculateAngularVelocity(deltaT, [x1, y1, z1], [x2, y2, z2]);
//     let w4 = accel_90z.calculateAngularVelocity(deltaT, [x1, y1, z1], [x2, y2, z2]);
let w1 = accel_base.calculateAngularVelocityWindowed([x1, y1, z1], [x2, y2, z2]);
let w2 = accel_90x.calculateAngularVelocityWindowed([x1, y1, z1], [x2, y2, z2]);
let w3 = accel_90y.calculateAngularVelocityWindowed([x1, y1, z1], [x2, y2, z2]);
let w4 = accel_90z.calculateAngularVelocityWindowed([x1, y1, z1], [x2, y2, z2]);
    let avg_w = (w1.w + w2.w + w3.w + w4.w) / 4;
    max_w = Math.max(max_w, avg_w);
    rpm = max_w * 60 / (2 * Math.PI);
    update_plot(w1.w, w2.w, w3.w, w4.w);
    //document.getElementById("currentAccel").innerHTML = "rpm: " + rpm + "   max_w: " + max_w;
  document.getElementById("shakeBool").innerHTML = "mag1: " + mag1 + "   mag2: " + mag2 + "    sum: " + (mag1+mag2);
  var sb = "shaking ";
  if ((mag1) > 4000) { sb += "yasss"; shakeScore += (mag1 - 4000) / 1000;}
  else  { sb += "nah"; }
  document.getElementById("shakeScore").innerHTML = "shaking: " + shakeScore;
  
}



async function handleDataChange(event) {
  var tb = event.target.value.buffer;
  // console.log(tb);
  var bytes = new Uint8Array(tb);
  var tba = new Uint16Array(tb);
  console.log("ticks: " + tba[0] + " (" + (tba[0] / 32768) + "s)");
  console.log(tba);
  checkAccelerometerMagnitude(tba);
  var pushObj = {};
  tba.map((c, index) => pushObj["a" + String(index)] = c);
  pushObj["time"] = new Date().getTime();
  pushObj["tag"] = runningTag;
  printData.push(pushObj);
  
  if (printData.length - dataLength > 10 && predicting) {
    console.log("gonna predict now");
    dataLength = printData.length;
    console.log(await runPredict());
    pText.innerText = "Prediction: " + await runPredict();  
  }
}

let mockRunning = false;
async function startMock(run) {
  if (run == 1) {
    mockRunning = true;
    produceMock();
  }
  else {
    mockRunning = false;
    
  }
  
}

async function produceMock () {
  if (mockRunning == true) {
    console.log(runningTag);
    await new Promise(r => setTimeout(r, 500));
    produceMock();
  }
}

function exportData() {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var csvRows = ["time, a1x, a1y,a1z,a2x, a2y, a2z, magx, magy, magz, tag"];
    for (var p in printData){
        var row = printData[p].time + ", "
        // for d in range
        // printData[p].data[0]

        // csv
    }
        
    console.log(printData);
    var json = JSON.stringify(printData),
        blob = new Blob([json], {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

var fileName = "dataExport.json";


/**
 * Function that disconnects from the Bluetooth device (if connected).
 */
function disconnect() {
    addLog("Disconnecting... ", false);
    if (!bluetoothDevice) {
        addLogError("There is no device connected.");
    } else if (bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
        if (!bluetoothDevice.gatt.connected) {
            addLog("<font color='green'>OK</font>", true);
        };
    } else {
        addLogError("There is no device connected.");
    }
}