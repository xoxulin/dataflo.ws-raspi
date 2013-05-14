var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	os	 	 	 = require('os');

var stateTask = module.exports = function (config) {

	this.init (config);
	
};

util.inherits (stateTask, task);

stateTask.prototype.run = function () {
	
	var self = this,
		state = {
			
			node: {
				pid: process.pid,
				memory: process.memoryUsage(),
				uptime: process.uptime()
			},
			
			os: {
				memory: {
					total: os.totalmem(),
					free: os.freemem()
				},
				loadAverages: os.loadavg(),
				networkInterfaces: os.networkInterfaces()
				
			}
		};
		
	self.completed(state);
	
}