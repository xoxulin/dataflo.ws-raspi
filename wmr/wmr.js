var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	HID = require('node-hid');

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
	BATERY_STATUS_DATA			= 0xD9;

	ALLOWED_HEADERS = {
		0xD2: true,
		0xD3: true,
		0xD4: true,
		0xD5: true,
		0xD6: true,
		0xD7: true,
		0xD9: true
	},

	excludedKeys = {
		timestamp: true,
		sensorNum: true,
		type: true
	};

// - - - class

var wmr200  = function () {
	
	var self = this;
	
	self.emitter = new EventEmitter();
	self.emitter.state = self.state = {};
	
	var controllers = HID.devices(VID_OREGON, PID_METEO);
	
	if (controllers.length == 0) {
		throw 'Meteo station WMR 200 is not connected!';
	}
	
	var path = controllers[0].path;
	
	self.hid = new HID.HID(path);
	
	if (!self.hid) {
		throw 'Meteo station WMR 200 is not available!';
	}
	
	self.start();
	
}

wmr200.prototype.start = function () {
	
	var self = this;
	
	console.log('WMR200 daemon started');
	
	self.currentHeader = null;
	self.currentBuffer = null;
	self.currentBufferPosition = 0;
	
	self.hid.write(RESET_CMD);
	self.hid.write(HISTORY_CMD);
	self.hid.write(HEART_BEAT_CMD);
	
	self.boundRead = self.read.bind(self);
	
	self.hid.read(self.boundRead);

	self.heartBeat = setInterval(function() {
		self.hid.write(HEART_BEAT_CMD);
	}, 30000);

};
	
wmr200.prototype.reset = function() {

	var self = this;
	
	if (!self.heartBeat) return;
	
	clearInterval(self.heartBeat);
	
	console.log('WMR daemon reset');
	
	self.hid.write(RESET_CMD);
	self.hid.write(HISTORY_CLEAR_CMD);
			
	self.hid.read(self.boundRead);

};
	
wmr200.prototype.read = function(error, data) {
		
	var self = this;
			
	if (error || !self.heartBeat) {
		
		self.errorProcess(error);
		
	} else if (data[0] == 1) {
		
		self.processData(data[1]);
	
	}
	
	self.hid.read(self.boundRead);
	
};
	
wmr200.prototype.errorProcess = function(error) {
	
	self.emitter.emit('error', error);
	
};

wmr200.prototype.processData = function (byte) {
	
	var self = this;
	
	if (self.currentHeader === null && !self.currentBuffer) {
		
		// if header not allowed then ignore
		
		if (!ALLOWED_HEADERS[byte]) return;
		
		// if no header no buffer
		
		self.currentHeader = byte;
		
	} else if (self.currentHeader !== null && !self.currentBuffer) {
	
		// if header no buffer
		
		self.currentBuffer = new Buffer(byte);
		self.currentBufferPosition = 0;
		self.currentBuffer.writeUInt8(self.currentHeader, self.currentBufferPosition++);
		self.currentBuffer.writeUInt8(byte, self.currentBufferPosition++);
		
	} else if (self.currentHeader !== null && self.currentBuffer) {
		
		self.currentBuffer.writeUInt8(byte, self.currentBufferPosition++);
		
		if (self.currentBufferPosition == self.currentBuffer.length) {
			
			var data = true;
			
			switch (self.currentHeader) {
				
				case HISTORIC_DATA:
					data = self.processHistory(self.currentBuffer);
				break;
				case WIND_DATA:
					data = self.processWind(self.currentBuffer);
				break;
				case RAIN_DATA:
					data = self.processRain(self.currentBuffer);
				break;
				case UVI_DATA:
					data = self.processUVI(self.currentBuffer);
				break;
				case PRESSURE_DATA:
					data = self.processPressure(self.currentBuffer);
				break;
				case TEMPERATURE_HUMIDITY_DATA:
					data = self.processTemperatureHumidity(self.currentBuffer);
				break;
				case BATERY_STATUS_DATA:
					data = self.processBatteryStatus(self.currentBuffer);
				break;
				
			}
			
			if (data === false) {
				self.emitter.emit('error', 'Read error at '+self.currentHeader.toString(16)+ ' header');
				self.reset();
			} else {
				self.applyData(data);
			}
			
			self.currentHeader = null;
			self.currentBuffer = null;
			self.currentBufferPosition = 0;
			
		}
		
	}
};

wmr200.prototype.processHistory = function(buffer) {

	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
	
		// - - - rain
		
		rain = this._processRain(buffer, 7),
		
		// - - - wind

		wind = this._processWind(buffer, 20);
		
		// - - - uvi

		uvi = this._processUVI(buffer, 27),

		// - - - baro

		pressure = this._processPressure(buffer, 28),

		// - - - external sensor count

		externalSensorCount = buffer.readUInt8(32),

		// - - - indoor sensors

		indoorTemperatureHumidity = this._processTemperatureHumidity(buffer, 33),
		
		data = [rain, wind, uvi, pressure];
		
		data.push.apply(data, indoorTemperatureHumidity);

		rain. timestamp = wind.timestamp =
		uvi.timestamp = pressure.timestamp =
		indoorTemperatureHumidity[0].timestamp =
		indoorTemperatureHumidity[1].timestamp = timestamp;
		
		
		
		// - - - external sensors
		
		for (var i = 0; i < externalSensorCount; i++) {
		
			var externalSensors = this._processTemperatureHumidity(buffer, 40 + 7*i);

			externalSensors[0].timestamp =
			externalSensors[1].timestamp = timestamp;

			data.push.apply(data, indoorTemperatureHumidity);
		
		}
	
	return data;
};
	
wmr200.prototype.processWind= function(buffer) {
	
	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
	
		// - - - wind

		data = this._processWind(buffer);
		
	data.timestamp = timestamp;
	
	return data;
};

wmr200.prototype._processWind= function(buffer, offset) {
	
	if (!offset) offset = 7
	
	var D = buffer.readUInt8(offset),
		windDirection = D & 0x0F,

		gg = buffer.readUInt8(1+offset),
		aG = buffer.readUInt8(2+offset),
		aA = buffer.readUInt8(3+offset),
		windGust = (((aG & 0x0F) * 256) + gg) / 10,
		windAvg = (aA * 16 + (aG >> 4)) / 10,

		WC = buffer.readUInt8(4+offset),
		windChill = (WC - 32) / 1.8;
		
	return {
		type: 'wind',
		direction: windDirection,
		gust: windGust,
		avg: windAvg,
		chill: windChill
	};
	
};

wmr200.prototype.processRain= function(buffer) {
	
	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
	
		// - - - rain

		data = this._processRain(buffer);
		
	data.timestamp = timestamp;
	
	return data;
};

wmr200.prototype._processRain= function(buffer, offset) {
	
	if (!offset) offset = 7;
	
	var rL = buffer.readUInt8(offset),
		rH = buffer.readUInt8(1+offset),
		
		rainRate = (((rH*256) + rL) / 100) * 25.4,
	
		hL = buffer.readUInt8(2+offset),
		hH = buffer.readUInt8(3+offset),

		rainHour = (((hH*256) + hL) / 100) * 25.4,

		dL = buffer.readUInt8(4+offset),
		dH = buffer.readUInt8(5+offset),

		rain24Hour = (((dH*256) + dL) / 100) * 25.4,

		aL = buffer.readUInt8(6+offset),
		aH = buffer.readUInt8(7+offset),

		rainAccum = (((aH*256) + aL) / 100) * 25.4,

		accumTimestamp = this.getTimestamp(buffer, 8+offset);
		
	return {
		type: 'rain',
		rate : rainRate,
		rateHour : rainHour,
		rate24Hour: rain24Hour,
		accum: rainAccum,
		accumDate: accumTimestamp
	};
	
};

wmr200.prototype.processUVI = function(buffer) {
	
	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
	
		// - - - uvi
		
		UV = buffer.readUInt8(7),
		
		uvi = UV & 0x0F,
		
		data = {
			type: 'uvi',
			timestamp: timestamp,
			value: uvi
		};
						
	return data;
};

wmr200.prototype._processUVI= function(buffer, offset) {

	if (!offset) offset = 7
	
	var UV = buffer.readUInt8(offset);
		
	return {
		type: 'uvi',
		value: UV & 0x0F
	};
	
};

wmr200.prototype.processPressure= function(buffer) {
	
	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
	
		// - - - data
		
	data = this._processPressure(buffer);
	data.timestamp = timestamp;
	
	return data;
};

wmr200.prototype._processPressure= function(buffer, offset) {
	
	if (!offset) offset = 7;
	
		// - - - pressure
		
	var	SS = buffer.readUInt8(offset),
		iS = buffer.readUInt8(1+offset),
		
		pressure = ((iS & 0x0F) * 256 + SS) * 0.7500616827042,
		
		// - - - forecast
		
		forecast = iS >> 4,
		
		// - - - altitude
		
		AA = buffer.readUInt8(2+offset),
		xA = buffer.readUInt8(3+offset),
		
		altitude = ((xA & 0x0F) * 256 + AA) * 7.88801728927;
		
	return {
		type: 'pressure',
		value: pressure,
		forecast: forecast,
		altitude: altitude
	};
	
};

wmr200.prototype.processTemperatureHumidity= function(buffer) {

	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - time & date
		
	var timestamp = this.getTimestamp(buffer),
		
		// - - - sensors & trends
		
		data = this._processTemperatureHumidity(buffer);
		
	data[0].timestamp = timestamp;
	data[1].timestamp = timestamp;
	
	return data;
};

wmr200.prototype._processTemperatureHumidity= function(buffer, offset) {
	
	if (!offset) offset = 7;
	
		// - - - sensors & trends
		
	var temHumSensor = buffer.readUInt8(offset),
		temperatureTrend = temHumSensor >> 6,
		humidityTrend = temHumSensor >> 4 & 0x03,
		sensorNum = temHumSensor & 0x0F,
		
		// - - - temperature
		
		TT = buffer.readUInt8(1+offset),
		sT = buffer.readUInt8(2+offset),
		temperatureSign = ((sT >> 7) == 1) ? -1 : 1,
		temperature = temperatureSign * ((sT & 0x7F) * 256 + TT) / 10,
		
		// - - - humidity
		
		humidity = buffer.readUInt8(3+offset),
		
		// - - - dew point
		
		DD = buffer.readUInt8(4+offset),
		sD = buffer.readUInt8(5+offset),
		dewSign = ((sT >> 7) == 1) ? -1 : 1,
		dewTemperature = dewSign * ((sD & 0x7F) * 256 + DD) / 10,
		
		// - - - heat
		
		heatIndex = (buffer.readUInt8(6+offset) - 32) / 1.8;
		
	return [{
		type: 'temperature',
		sensorNum: sensorNum,
		value: temperature,
		trend: temperatureTrend,
		heatIndex: heatIndex
	}, {
		type: 'humidity',
		sensorNum: sensorNum,
		value: humidity,
		trend: humidityTrend,
		dewPoint: dewTemperature
	}];
	
};

wmr200.prototype.processBatteryStatus= function(buffer) {

	if (!this.getCheckSumValid(buffer)) return false;
	
		// - - - fault & battery
		
	var SW = buffer.readUInt8(2),
		tempHumSensorFault = (SW & 0x02) == 0x02,
		windSensorFault = (SW & 0x01) == 0x01,
		
		UR = buffer.readUInt8(3),
		uviSensorFault = (SW & 0x80) == 0x80,
		rainSensorFault = (SW & 0x40) == 0x40,
		
		RB = buffer.readUInt8(3),
		rfSignalWeak = (RB & 0x80) == 0x80,
		tempHumBatteryLow = (RB & 0x02) == 0x02,
		windBatteryLow = (RB & 0x01) == 0x01,
		
		BB = buffer.readUInt8(3),
		uviBatteryLow = (BB & 0x20) == 0x20,
		rainBatteryLow = (RB & 0x10) == 0x10,


		data = [{
			type: 'sensorError',
			tempHum: tempHumSensorFault,
			wind: windSensorFault,
			uvi: uviSensorFault,
			rain: rainSensorFault
		}, {
			type: 'batteryLow',
			tempHum: tempHumBatteryLow,
			wind: windBatteryLow,
			uvi: uviBatteryLow,
			rain: rainBatteryLow
		}, {
			type: 'signal',
			weak: rfSignalWeak
		}];
	
	return data;
};

wmr200.prototype.getTimestamp = function(buffer, offset) {
	
	if (!offset) offset = 2;
	
	var date = new Date(
			buffer.readUInt8(4+offset) + 2000 ,
			buffer.readUInt8(3+offset)-1,
			buffer.readUInt8(2+offset),
			buffer.readUInt8(1+offset),
			buffer.readUInt8(offset)
		);
	
	return ~~(date.getTime()/1000);
	
};

wmr200.prototype.getCheckSumValid = function(buffer) {
	
	var length = buffer.readUInt8(1);
		
	if (buffer.length != length) return false;
		
	var	cL = buffer.readUInt8(length-2),
		cH = buffer.readUInt8(length-1),
		checkSum = 0;
	
	Array.prototype.every.call(buffer, function(byte, ix) {
		
		if (ix < length - 2) {
			checkSum += byte;
			return true;
		}
		
		return false;
		
	});
	
	return (checkSum == 256*cH + cL);
	
};

wmr200.prototype.applyData = function(data) {
	
	var self = this,
		change = false,
		
		stateChange = [];
	
	if (data.constructor !== Array) data = [data];
	
	data.forEach(function(item) {
		
		if (self.isChangedData(item)) {
			
			var oldValue;
			
			change = true;
			
			if (item.hasOwnProperty('sensorNum')) {
				
				oldValue = self.state[item.type][item.sensorNum];
				self.state[item.type][item.sensorNum] = item;
				
			} else {
				
				oldValue  = self.state[item.type];
				self.state[item.type] = item;
				
			}
			
			stateChange.push({
				newValue: item,
				oldValue: oldValue
			});
			
		}
		
	});
	
	if (change) {
		
		self.emitter.emit('statechange', {
			data: stateChange,
		});
		
	}
	
};

wmr200.prototype.isChangedData = function(data) {
	
	var self = this,
		value,
		change = false;
	
	if (!this.state[data.type]) {
		this.state[data.type] = {};
		change = true;
	}
	
	if (data.hasOwnProperty('sensorNum')) {
		
		if (!this.state[data.type][data.sensorNum]) {
			this.state[data.type][data.sensorNum] = {};
			change = true;
		}
		
		value = this.state[data.type][data.sensorNum];
		
	} else {
	
		value = this.state[data.type];
		
	}
	
	if (change) return change;
	
	Object.keys(data).every(function(key) {
		
		if (excludedKeys[key]) return true;
		
		change = (value[key] != data[key]);
		return !change;
		
	});
	
	return change;
		
};

// - - - module exports

module.exports = new wmr200().emitter;