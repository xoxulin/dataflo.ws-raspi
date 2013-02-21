var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn;

// - - - - - - - const

var COMMAND = 'gst-launch-0.10',
	SHOT_ARGS = ['-e v4l2src',
			' ! ffmpegcolorspace',
			' ! pngenc snapshot=true',
			' ! filesink location='];

// - - - - - - -

var video = module.exports = function() {

	// - - -

}

util.inherits (video, EventEmitter);

video.prototype.shot = function(location) {
	
	var self = this;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	
	var fork  = spawn(COMMAND, SHOT_ARGS.concat([location])),
		error = '';

	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		self.forkRunning = false;
		
		if (code != 0) self.emit('error', error);
		else self.emit('end');
	});
	
}