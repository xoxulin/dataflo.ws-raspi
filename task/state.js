var EventEmitter = require ('events').EventEmitter,
	task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	os	 	 	 = require('os')io = require('dataflo.ws/io/easy');

// - - -

var cpuInfo = new io('/proc/cpuinfo');
		
cpuInfo.readFile(function(error, data) {
	
	if (error) {
		throw error;
	}
	
	project.cpuInfo = parseCPUInfoList(data);
		
});

function parseCPUInfoList(data) {

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

// - - -

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
				
			},
			cpuInfo: project.cpuInfo
		};
		
	self.completed(state);
	
}