var EventEmitter = require ('events').EventEmitter,
	task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	io			 = require('dataflo.ws/io/easy');

var DEVICE_ID = null;

var deviceIDTask = module.exports = function (config) {

	this.init (config);
	
};

util.inherits (deviceIDTask, task);

deviceIDTask.prototype.run = function () {
	
	var self = this;
	
	if (DEVICE_ID) {
		self.completed(DEVICE_ID);
		return;
	}
	
	var cpuInfo = new io('/proc/cpuinfo');
		
	cpuInfo.readFile(function(error, data) {
		
		if (error) {
			throw error;
		}
		
		var deviceInfo = self._parseCPUInfoList(data);
			
		DEVICE_ID = [deviceInfo.serial, deviceInfo.hardware, deviceInfo.revision].join('_');
		
		self.completed(DEVICE_ID);
			
	});

}


deviceIDTask.prototype._parseCPUInfoList = function(data) {

	data = data.toString().split('\n');
	
	var pair, key, value,
		result = {};
	
	data.forEach(function(line) {
		
		if (line && line.replace(/\s+?/).length) {
			
			pair = line.split(/\t*?: /);
			key = pair[0].replace(/\s+/,'_').toLowerCase();
			value = pair[1].replace(/\s+$/,'');
			
			result[key] = value;
		}
		
	});
	
	return result;

}
