var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	workflow     = require ('dataflo.ws/workflow'),
	bancroft	 = require ('bancroft');

var gpsi = module.exports = function (config) {
	
	var self = this;
	
	EventEmitter.constructor.call(this);
	
	// - - - config
	
	self.workflow = config.workflow;
	
	// - - - bancroft sensor
	
	var sensor = self.sensor = new bancroft();
	
	sensor.on('location', self.onlocation.bind(self));
	
	sensor.on('connect', self.onconnect.bind(self));	
	sensor.on('satellite', self.onsatellite.bind(self));
	sensor.on('disconnect', self.ondisconnect.bind(self));
	
}

util.inherits (gpsi, EventEmitter);

gpsi.prototype.onlocation = function (location) {
	
	if (location.longitude == undefined || location.latitude == undefined) return;
	
	var loc = {
		timestamp: location.timestamp,
		latitude: location.latitude,
		longitude: location.longitude,
		altitude: location.altitude,
		speed: location.speed
	};
	
	var wfCfg = this.workflow,
		wf = new workflow(wfCfg, {
			location: loc,
			data: {}
		});
	
	wf.run();

};

gpsi.prototype.onconnect = function () {
		
	console.log('GPS connected');

};

gpsi.prototype.ondisconnect = function (err) {
		
	console.log('GPS disconnected', err);

};

gpsi.prototype.onsatellite = function (satellite) {
		
	console.log('GPS satellites', satellite);

};