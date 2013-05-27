var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	video 	 	 = require('../video/video');

var videoTask = module.exports = function (config) {

	this.init (config);
	this.videoRecorder = new video();
	
};

util.inherits (videoTask, task);

videoTask.prototype.run = function () {
	
	var self = this;
		
	self.videoRecorder.on('end', function() {
		
		self.completed({
			type: 'shot',
			location: self.location
		});
	
	});
	
	self.videoRecorder.on('error', function(error) {
		
		self.failed(error);
	
	});
	
	self.videoRecorder.shot({
		'--resolution': self.resolution,
		'--save': self.location,
	});
	
};