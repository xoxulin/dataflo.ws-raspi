var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	execFile		 = require('child_process').execFile;

var COMMAND = 'shutdown';

var shutDownTask = module.exports = function (config) {
	this.init (config);
	if (!this.args) this.args = ['-h', 'now'];
};

util.inherits (shutDownTask, task);

util.extend (shutDownTask.prototype, {
	
	run: function () {

		var self = this;
		
		execFile(COMMAND, self.args, function(error, stdout, stderr) {
			
			if (error !== null) {
				self.failed('can`t to shutdown, because: ' + stderr);
			} else {
				self.completed({
					success: true,
					log: stdout
				})
			}
			
		});
	}
});