var EventEmitter = require ('events').EventEmitter,
	task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	os	 	 	 = require('os'),
	io        	 = require('dataflo.ws/io/easy');

var stateTask = module.exports = function (config) {

	this.init (config);
	
};

util.inherits (stateTask, task);

stateTask.prototype.run = function () {
	
	var self = this,
		state = {
			
			node: {
				pid: process.pid,
				memory: process.memoryUsage()
			},
			
			os: {
				memory: {
					total: os.totalmem(),
					free: os.freemem()
				},
				loadAverages: os.loadavg(),
				networkInterfaces: os.networkInterfaces(),
				uptime: process.uptime()
				
			}
		};
		
	self.getCPUInfo(function(cpuInfo) {
		
		state.cpuInfo = cpuInfo;
		self.completed(state);
		
	});
	
}

stateTask.prototype.getCPUInfo = function(callback) {

	if (project.cpuInfo) {
		
		callback(project.cpuInfo);
		
		return;
		
	}
	
	var self = this,
		cpuInfo = new io('/proc/cpuinfo');
		
	cpuInfo.readFile(function(error, data) {
		
		if (error) {
			self.failed(error);
			return;
		}
		
		project.cpuInfo = self.parseCPUInfoList(data);
		callback(project.cpuInfo);
		
	});

}

stateTask.prototype.parseCPUInfoList = function(data) {

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