var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	os 	     = require ('os'),
	spawn        = require ('child_process').spawn;

// - - - - - - - const

var COMMAND = 'uvccapture',
	FREE_MEM = 5,
	AVG_LIMIT = 1,
	KILL_TIMEOUT = 40000,
	HEAP = 0;

// - - - - - - -

var video = module.exports = function() {

	// - - -

}

util.inherits (video, EventEmitter);

video.prototype.shot = function(config) {

	var self = this,
		avg = os.loadavg(),
		freeMem = os.freemem(),
		totalMem = os.totalmem(),
		exitCode = 0,
		timeout,
		t = Date.now(),
		freeMemRelative = ~~( 100 * freeMem / totalMem ),
		memUsage = process.memoryUsage(),
		heap = memUsage.heapUsed/(1 << 20),
		deltaHeap = heap - HEAP;

	HEAP = heap;
	
	console.log('\n\n\nHEAP_USED = ' + heap.toFixed(2) + ' MB, DELTA_HEAP = ' + deltaHeap.toFixed(2) + ' MB, AVG_0 = ' + avg[0] + ',  FREE_MEM = ' + freeMemRelative + ' %\n\n\n');
	
	if (self.forkRunning) {
		self.emit('error', 'fork is still running')
		return;
	} else if (freeMemRelative < FREE_MEM || avg[0] > AVG_LIMIT) {
		self.emit('error', 'cpu is overloaded')
		return;
	}
	
	self.forkRunning = true;
	var fork  = spawn(COMMAND, self.getArgs(config), {detached: true}),
		error = '';
	
	fork.unref();

	setTimeout(function() {
		
		timeout = null;
		fork.kill('SIGKILL');
		error = 'Image capturing timeout is over';
		
	}, KILL_TIMEOUT);
	
	fork.stdout.on('end', function() {
		
		t = (Date.now() - t)/1000;
		console.log('Image shot was captured. Time: ' + t.toFixed(2) + 's');
		if (exitCode == 0) self.emit('end');
		
	});
	
	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});
	
	fork.stderr.on('end', function () {
		
		if (exitCode != 0) {
			self.emit('error', error);
		}
		
	});

	fork.on('exit', function (code) {
		
		self.forkRunning = false;
		exitCode = code;
		if (timeout) clearTimeout(timeout);
		
	});
	
}

video.prototype.getArgs = function(config) {
	
	var result = [
			'-d' + '/dev/video0',
			'-q' + 95,
			'-x' + config.width,
			'-y' + config.height,
			'-B' + 128,
			'-C' + 128,
			'-S' + 128,
			'-G' + 128,
			'-t' + 0,
			'-o' + config.location
		];
	
	return result;
	
}
// avconv -f video4linux2 -i /dev/video -q 2 -vframes 1 htdocs/photos/shot.jpg
// fswebcam --resolution 1280x960 --fps 30  --skip 30 --jpeg 95 --save htdocs/video/shot.jpg
// gst-launch-0.10 -e v4l2src ! ffmpegcolorspace ! pngenc snapshot=true ! filesink location=/path/
// convert ~/Downloads/shot.png rose: -colorspace Gray -colors 64 -format %c histogram:info:- > ~/Desktop/test.txt
// uvccapture -v -d/dev/video0 -x1920 -y1080 -q95 -B128 -C128 -S128 -G128 -t0 -o/mnt/seagate/photos/shot2.jpg