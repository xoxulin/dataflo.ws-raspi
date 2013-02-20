var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn,
	wav 		 = require ('wav');

// - - - - - - -

var COMMAND = 'arecord',
	ARGS = ['-f', 'S16_LE', '-r', '16000', '-D', 'hw:1,0', '-d'];

// - - - - - - -

var audio = module.exports = function() {
	
	this.reader = new wav.Reader();
	this.reader.on('format', function(format) {

		console.log('<<<<<< format', format);

	});

}

util.inherits (audio, EventEmitter);

audio.prototype.record = function(duration) {
	
	var self = this;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	
	var fork  = spawn(COMMAND, ARGS.concat([duration])),
		error = '';

	fork.stdout.pipe(self.reader);

	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		self.forkRunning = false;
		
		console.log('<<<<< exit with code =', code);
		if (error) console.log('<<<<< error', error);

	});
	
}

audio.prototype.measure = function(duration) {
	
	var position = 0,
		abssum = 0,
		count = 0,
		dc = 255,
		val,
		calibration = 30,
		min, max, avg,
		rangeInt16 = 1 << 15;
	
	while (position < data.length) {
		val = data.readInt16LE(position);
		abssum += Math.abs(val-dc);
		position += 2;
		count++;
	}
	
	abssum /= count*rangeInt16;
	abssum = 120 + calibration * Math.log(abssum)/Math.LN10;
	
	console.log('Signal Level', abssum.toFixed(2), 'dB');
	
	return {
		min: min,
		max: max,
		avg: avg
	};
}