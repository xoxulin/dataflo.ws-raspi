var EventEmitter = require ('events').EventEmitter,
	util         = require ('util');
	workflow     = require ('dataflo.ws/workflow'),
	HID = require('node-hid');

// - - -
/*
PC FRAMES:
Commands to be issued to the WMR200 Console i.e. by the PC to the Console.

NOTE:
o There does not seem to be a way to only request historic data from the WMR200's data logger.
o If the console has historic data available after issuing a [D0] command, it will respond by
  sending a [D1] packet otherwise it'll start sending live data.
o If you don't receive any data within 30 seconds then you should issue a [D0] frame again.
o If you don't acknowledge historic data packets with [DA] that you have received the WMR200
  console will stop sending them.
o If you don't send a heartbeat [D0] frame periodically the WMR200 stops pumping live data
  after 30 seconds, and then goes into history logging mode.
o Normally the WMR200 sends data for most of the sensors within 30 seconds after a [D0] data
  retrieval request.
o For historic data retrieval you need to send a [D0] on startup and then wait for a [D1].
  This you need to ACK with a [DA] to trigger [D2] history record retrieval.
o If you are not interested in historic data retrieval then only issue a [D0] frame at startup,
  don't ACK the [D1]'s and perhaps send a [DB] command to clear the data logger.

D0 .. Heartbeat to Console ........ Console starts streaming [d3 - d9] records for 30 seconds.
                                    This is a heartbeat to let the console know that your
                                    application is still active. You should implement a timer
                                    that pumps out [D0] frames on 30 second intervals. If the
                                    WMR console does not receive a heartbeat from your
                                    application within 30 seconds it will switch to data
                                    logging mode.
DA .. Request historic data ....... This should be sent in response to [D1] and [D2] packets.
                                    It triggers the retrieval of the next historic data record.
DB .. Erase WMR200 data logger .... Clears the historic data from WMR200's data logger memory
                                    and when done the console will respond with a [DB].
DF .. Stop communication .......... Stops communication between PC and WMR200 Console and puts
                                    the WMR200 into data logging mode. The console responds
                                    with a [DF] in return if the command has been honoured.

NOTE: USB frames are made up of 9 bytes where the second byte indicates the length of the
      command within the frame. Unused bytes in the frame should be padded with [00]'s. For
      instance to issue a [D0] command you would send [00 01 D0 00 00 00 00 00 00] to the
      USB port.


CONSOLE FRAMES:
Packets received by the PC i.e. returned by the WMR200 Console in response to one of the above
commands.

D1 .. Historic Data Notification .. Normally received after the first [D0] command has been
                                    issued at startup if historic data is available in the
                                    WMR200's data logger. Should you encounter such a packet
                                    during normal execution then the data logger has gathered
                                    some historic data. In such a case immediatly respond with
                                    a [DA] command to retrieve the record.
D2 .. Historic Data ............... Issue [DA] immediately when received for the next historic
                                    data record retrieval.
D3 .. Wind Data ................... Delivered during hearbeat period.
D4 .. Rain Data ................... Delivered during hearbeat period.
D5 .. UVI Data .................... Delivered during hearbeat period.
D6 .. Pressure Data ............... Delivered during hearbeat period.
D7 .. Temperature/Humidity Data ... Delivered during hearbeat period.
D8 .. Spare ....................... Not in use or not known at this stage.
D9 .. Battery & Sensor Status ..... Delivered during hearbeat period.
DB .. Erase Acknowledgment ........ By the console that erase data logger [DB] command has
                                    been honoured.
DF .. Stop Acknowledgment ......... By the console that an issued stop communication [DF]
                                    command has been honoured.
*/

var VID_OREGON = 0x0fde,
	PID_METEO = 0xca01,

	// commands

	RESET_CMD 			= [0x20, 0x00, 0x08, 0x01],
	HEART_BEAT_CMD 		= [0x01, 0xD0],

	HISTORY_CMD 		= [0x01, 0xDA],
	HISTORY_CLEAR_CMD 	= [0x01, 0xDB],

	STOP_COMMUNICATION_CMD 	= [0x01, 0xDF],

	// headers

	HISTORIC_DATA 				= 0xD2,
	WIND_DATA 					= 0xD3,
	RAIN_DATA 					= 0xD4,
	UVI_DATA 					= 0xD5,
	PRESSURE_DATA 				= 0xD6,
	TEMPERATURE_HUMIDITY_DATA 	= 0xD7,
	BATERY_STATUS_DATA			= 0xD9,

	LENGTH = {
		0xD2: 49,
		0xD3: 16,
		0xD4: 22,
		0xD5: 10,
		0xD6: 13,
		0xD7: 16,
		0xD9: 8
	};

// - - -

var wmri = module.exports = function (config) {
	
	var self = this;
	
	self.workflows = config.workflows;
	
	var controllers = HID.devices(VID_OREGON, PID_METEO);
	
	if (controllers.length == 0) {
		throw 'Meteo station WMR 200 is not connected!';
	}

	self.hid = new HID.HID(controllers[0].path);
	
	if (!self.hid) {
		throw 'Meteo station WMR 200 is not available!';
	}
	
	self.start();
	
}

util.inherits (wmri, EventEmitter);

util.extend (wmri.prototype, {
	
	start: function () {
		
		var self = this;
		
		console.log('WMR daemon started');
		
		self.hid.write(RESET_CMD);
		self.hid.write(HISTORY_CMD);
		self.hid.write(HEART_BEAT_CMD);
		
		self.boundRead = self.read.bind(self);
		
		self.hid.read(self.boundRead);

		self.heartBeat = setInterval(function() {
			self.hid.write(HEART_BEAT_CMD);
		}, 30000);

	},
	
	reset: function() {
	
		var self = this;
		
		if (!self.heartBeat) return;
		
		clearInterval(self.heartBeat);
		
		console.log('WMR daemon reset');
		
		self.hid.write(RESET_CMD);
		self.hid.write(HISTORY_CLEAR_CMD);
				
		self.hid.read(self.boundRead);
	
	},
	
	read: function(error, data) {
		
		var self = this;
				
		if (error || !self.heartBeat) {
			
			self.errorProcess(error);
			
		} else if (data) {
		
			var length = data.shift(),
				values = data.slice(0, length);
			
			values.forEach(function(d) {
			
				self.processData(d);
				
			});
		
		}
		
		self.hid.read(self.boundRead);
		
	},
	
	errorProcess: function(error) {
		
		console.log(error);
		
	},

	processData: function (byte) {
		
		var self = this;
		
		if (self.currentHeader && self.currentBuffer) {
			
			self.currentBuffer.writeUInt8(byte, self.currentBufferPosition++);
			
			if (self.currentBufferPosition == self.currentBuffer.length) {
				
				var checkSumValid = true;
				
				switch (self.currentHeader) {
					
					case HISTORIC_DATA:
						checkSumValid = self.processHistory(self.currentBuffer);
					break;
					case WIND_DATA:
						checkSumValid = self.processWind(self.currentBuffer);
					break;
					case RAIN_DATA:
						checkSumValid = self.processRain(self.currentBuffer);
					break;
					case UVI_DATA:
						checkSumValid = self.processUVI(self.currentBuffer);
					break;
					case PRESSURE_DATA:
						checkSumValid = self.processPressure(self.currentBuffer);
					break;
					case TEMPERATURE_HUMIDITY_DATA:
						checkSumValid = self.processTemperatureHumidity(self.currentBuffer);
					break;
					case BATERY_STATUS_DATA:
						checkSumValid = self.processBateryStatus(self.currentBuffer);
					break;
					
				}
				
				if (!checkSumValid) {
					self.reset();
				}
				
				self.currentHeader = null;
				self.currentBuffer = null;
				self.currentBufferPosition = 0;
				
			}
			
		} else if (LENGTH[byte]) {
		
			self.currentHeader = byte;
			self.currentBuffer = new Buffer(LENGTH[byte]);
			self.currentBufferPosition = 0;
			self.currentBuffer.writeUInt8(byte, self.currentBufferPosition++);
		
		} else {
			
			self.currentHeader = null;
			self.currentBuffer = null;
			self.currentBufferPosition = 0;
			
		}
	},
	
	processHistory: function(buffer) {
		console.log('history', buffer);
		return true;
	},
	
	processWind: function(buffer) {
		console.log('wind', buffer);
		return true;
	},
	
	processRain: function(buffer) {
		console.log('rain', buffer);
		return true;
	},
	
	processUVI: function(buffer) {
		console.log('uvi', buffer);
		return true;
	},
	
	processPressure: function(buffer) {
		console.log('pressure', buffer);
		return true;
	},
	
	processTemperatureHumidity: function(buffer) {
		console.log('temperature_humidity', buffer);
		return true;
	},
	
	processBateryStatus: function(buffer) {
		console.log('batery_status', buffer);
		return true;
	}
});