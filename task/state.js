var EventEmitter = require ('events').EventEmitter,
	task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	os	 	 	 = require('os'),
	spawn        = require('child_process').spawn;

var COMMAND = 'cat',
	ARGS = ['/proc/cpuinfo'];

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

	if (this.cpuInfo) {
		
		callback(project.cpuInfo);
		
		return;
		
	}
	
	var self = this,
		fork  = spawn(COMMAND, ARGS),
		stderr = '',
		stdout = '';
		
	fork.stdout.on('data', function (data) {
		
		stdout += data;
		
	});

	fork.stderr.on('data', function (data) {
		
		stderr += data;
		
	});

	fork.on('exit', function (code) {

		project.cpuInfo = self.parseInfoList(stdout);
		callback(project.cpuInfo);
	
	});

}

stateTask.prototype.parseInfoList = function(data) {

	console.log('<<< data', data);
	
	return {};

}