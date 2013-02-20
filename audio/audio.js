var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn,
	wav 		 = require ('wav');

// - - - - - - - const

var COMMAND = 'arecord',
	ARGS = ['-f', 'S16_LE', '-r', '16000', '-D', 'hw:1,0', '-d'];

// - - - microphone constants

var DC = 254.96,
	minDB = 30,
	maxDB = 120;

var rangeInt16 = 1 << 15;

// - - - - - - -

var audio = module.exports = function() {
	
	var self = this;
	
	self.buffers = [];
	self.totalLength = 0;
	self.reader = new wav.Reader();
	self.reader.on('format', function(format) {

		console.log('<<<<<< format', format);

	});
	
	self.reader.on('data', function(data) {

		self.buffers = self.buffers.push(data);
		self.totalLength += data.length;

	});

}

util.inherits (audio, EventEmitter);

audio.prototype.clear = function(duration) {
	
	if (this.forkRunning) return;
	this.buffers.splice(0);
	
}

audio.prototype.record = function(duration) {
	
	var self = this;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	
	self.clear();
	
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
	
	var self = this,
		median = 0,
		abssum = 0,
		count = 0;
	
	buffers.forEach(function(buffer) {
	
		var position = 0,
			val;
		
		while (position < buffer.length) {
			val = data.readInt16LE(position)-DC;
			abssum += Math.abs(val);
			position += 2;
			count++;
		}
	
	});
	
	median = abssum / (count*rangeInt16);
	median = maxDB + minDB * Math.log(median)/Math.LN10;
	
	console.log('Signal Level', median.toFixed(2), 'dB');
	
	return median;
}