var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	audio 	 	 = require('../audio/audio');

var audioTask = module.exports = function (config) {

	this.init (config);
	this.audioRecorder = new audio();
	
};

util.inherits (audioTask, task);

audioTask.prototype.run = function () {
	
	var self = this;
		
	self.audioRecorder.on('end', function() {
		
		var ambientLevel = self.audioRecorder.measureLevel();
		
		self.audioRecorder.clear();
		
		self.completed({
			type: 'ambient',
			value: ambientLevel
		});
	
	});
	
	self.audioRecorder.on('error', function(error) {
		
		self.failed(error);
	
	});
	
	self.audioRecorder.record(1);
	
};