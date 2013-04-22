var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn;

// - - - - - - - const

var COMMAND = 'fswebcam',
	SHOT_ARGS = [
		'--resolution', '1280x960',
		'--fps', '30',
		'--skip', '30',
		'--jpeg', '95',
		'--no-timestamp',
		'--save'
	];

// - - - - - - -

var video = module.exports = function() {

	// - - -

}

util.inherits (video, EventEmitter);

video.prototype.shot = function(location) {
	
	var self = this;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	var fork  = spawn(COMMAND, SHOT_ARGS.concat([location]), {detached: true}),
		error = '';
	
	fork.unref();
	
	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		self.forkRunning = false;
		console.log(code);	
		if (code != 0) self.emit('error', error);
		else self.emit('end');
	});
	
}

// fswebcam --resolution 1280x960 --fps 30  --skip 30 --jpeg 95 --save htdocs/video/shot.jpg
// gst-launch-0.10 -e v4l2src ! ffmpegcolorspace ! pngenc snapshot=true ! filesink location=/path/
//convert ~/Downloads/shot.png rose: -colorspace Gray -colors 64 -format %c histogram:info:- > ~/Desktop/test.txt