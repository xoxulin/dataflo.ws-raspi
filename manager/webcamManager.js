var EventEmitter = require ('events').EventEmitter,
	util = require ('util');

// - - -

var SINGLETON, state;

var webcamManager = function() {
	
	console.log('WebCamManager initialized');
	state = {};

}

util.inherits (webcamManager, EventEmitter);

webcamManager.prototype.setBusy = function(busy) {
	
	state.busy = busy;
	this.emit('busychange', busy);
	
}

webcamManager.prototype.getBusy = function() {
	
	return state.busy;
	
}

module.exports = {};

module.exports.getInstance = function() {
	
	if (!SINGLETON) {
		
		SINGLETON = new webcamManager();
		
	}
	
	return SINGLETON
	
}