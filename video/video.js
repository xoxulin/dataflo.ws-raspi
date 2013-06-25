var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn;

// - - - - - - - const

var COMMAND = 'gst-launch-0.10';

// - - - - - - -

var video = module.exports = function() {

	// - - -

}

util.inherits (video, EventEmitter);

video.prototype.shot = function(config) {
	
	var self = this;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	var fork  = spawn(COMMAND, self.getArgs(config), {detached: true}),
		error = '';
	
	fork.unref();
	
	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		self.forkRunning = false;
		if (code != 0) self.emit('error', error);
		else self.emit('end');
	});
	
}

video.prototype.getArgs = function(config) {
	
	var resolution = [
			'video/x-raw-yuv',
			'width=' + config.width,
			'height=' + config.height
		].join(','),
		result = [
			'-e', 'v4l2src', 'always-copy=false', 'num-buffers=1',
			'!', resolution,
			'!', 'ffmpegcolorspace',
			'!', 'jpegenc', 'quality=100',
			'!', 'filesink', 'location='+config.location
		]
	
	return result;
	
}
// fswebcam --resolution 1280x960 --fps 30  --skip 30 --jpeg 95 --save htdocs/video/shot.jpg
// gst-launch-0.10 -e v4l2src ! ffmpegcolorspace ! pngenc snapshot=true ! filesink location=/path/
//convert ~/Downloads/shot.png rose: -colorspace Gray -colors 64 -format %c histogram:info:- > ~/Desktop/test.txt