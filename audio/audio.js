var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	spawn        = require ('child_process').spawn,
	wav 		 = require ('wav');

// - - - - - - - const

var COMMAND = 'arecord',
	REC_ARGS = {
		'-f': 'S16_LE',
		'-r': '16000',
		'-D': 'hw:1,0',
		'-c': 1,
		'-d': 1,
		'--disable-softvol': null,
		'-N': null
	};

// - - - microphone constants

var minDB = 60,
	maxDB = 120;

var rangeInt16 = 1 << (16 - 1); // half of range values

// - - - - - - -

var audio = module.exports = function() {
	
	var self = this;
	
	self.buffers = [];
	self.totalLength = 0;
	self.reader = new wav.Reader();
	self.reader.on('format', function(format) {

		self.emit('format', format);

	});
	
	self.reader.on('data', function(data) {

		self.buffers.push(data);
		self.totalLength += data.length;

	});
	
	self.reader.on('error', function(error) {

		self.emit('error', error);

	});

}

util.inherits (audio, EventEmitter);

audio.prototype.clear = function(duration) {
	
	if (this.forkRunning) return;
	this.buffers.splice(0);
	this.totalLength = 0;
	
}

audio.prototype.record = function(config) {
	
	var self = this,
		exitCode;
	
	if (self.forkRunning) return;
	
	self.forkRunning = true;
	
	self.clear();
	
	var fork  = spawn(COMMAND, self.getArgs(config), {detached: true}),
		error = '';
	
	fork.unref();
	
	fork.stdout.pipe(self.reader);
	
	fork.stdout.on('end', function() {
		
		if (exitCode == 0) self.emit('end');
		
	});

	fork.stderr.on('data', function (err) {
		
		error += err;
		
	});

	fork.on('exit', function (code) {
		self.forkRunning = false;
		exitCode = code;
		if (code != 0) {
			self.emit('error', error);
		}
	});
	
}

audio.prototype.measureLevel = function(DC) {
	
	var self = this,
		median = 0,
		abssum = 0,
		count = 0;
	
	self.buffers.forEach(function(buffer) {
	
		var position = 0,
			val;
		
		while (position < buffer.length) {
			val = buffer.readInt16LE(position) - DC;
			abssum += Math.abs(val);
			position += 2;
			count++;
		}
	
	});
	
	median = abssum / (count*rangeInt16);
	
	if (isNaN(median) || median == null) return null;
	 
	median = minDB + (maxDB - minDB)* Math.sqrt(Math.sqrt(median));
	
	return median;
}

audio.prototype.measureDC = function() {
	
	var self = this,
		sum = 0,
		count = 0;
	
	self.buffers.forEach(function(buffer) {
	
		var position = 0,
			val;
		
		while (position < buffer.length) {
			val = buffer.readInt16LE(position);
			sum += val;
			position += 2;
			count++;
		}
	
	});
	
	return sum/count;
}

audio.prototype.getArgs = function(config) {
	
	var ARGS = [];
	
	// must be INTEGER
	config['-d'] = Math.ceil(config['-d']);
	
	Object.keys(REC_ARGS).forEach(function(key) {
		
		ARGS.push(key);
		
		if (config[key] != null) {
			
			ARGS.push(config[key]);
		
		} else if (REC_ARGS[key] != null) {
		
			ARGS.push(REC_ARGS[key])
		
		}
		
	});
	
	return ARGS;
	
}