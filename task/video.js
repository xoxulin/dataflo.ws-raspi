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
	
	var timestamp = new Date().toISOString().replace(/-|T|:/g,'').substr(0, 14);
	
	self.location = self.path + timestamp + '.jpg';
	
	self.videoRecorder.shot({
		location: self.location,
		width: self.resolution.width,
		height: self.resolution.height
	});
	
};