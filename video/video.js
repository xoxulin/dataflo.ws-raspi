var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn;

// - - - - - - - const

var COMMAND = 'avconv';

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
	
	fork.stdout.on('end', function() {
		
		if (!error) self.emit('end');
		
	});
	
	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		
		self.forkRunning = false;
		if (code != 0) {
			self.emit('error', error);
		}
		
	});
	
}

video.prototype.getArgs = function(config) {
	
	var result = [
			'-f', 'video4linux2',
			'-i', '/dev/video0',
			'-q', '2',
			'-s', config.width+'x'+config.height,
			'-r', 30,
			'-pix_fmt', 'yuvj420p',
			'-vframes', '1',
			config.location
		];
	
	return result;
	
}
// avconv -f video4linux2 -i /dev/video -q 2 -vframes 1 htdocs/photos/shot.jpg
// fswebcam --resolution 1280x960 --fps 30  --skip 30 --jpeg 95 --save htdocs/video/shot.jpg
// gst-launch-0.10 -e v4l2src ! ffmpegcolorspace ! pngenc snapshot=true ! filesink location=/path/
//convert ~/Downloads/shot.png rose: -colorspace Gray -colors 64 -format %c histogram:info:- > ~/Desktop/test.txt