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
		
		var ambientLevel = self.audioRecorder.measureLevel(self.DC);
		
		self.audioRecorder.clear();
		
		if (ambientLevel != null) {
		
			self.completed({
				type: 'ambient',
				value: ambientLevel
			});
		
		} else {
			
			self.failed('no sound signal');
			
		}
	
	});
	
	self.audioRecorder.on('error', function(error) {
		
		self.failed(error);
	
	});
	
	self.audioRecorder.record({
		'-d': self.duration,
		'-c': self.channels,
		'-r': self.rate
	});
	
};