var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	workflow     = require ('dataflo.ws/workflow'),
	wmr		 	= require('../wmr/wmr');

var DEFAULT_TRIGGER = 'default';

var wmri = module.exports = function (config) {
	
	var self = this;
	
	// - - - config
	
	self.workflows = config.workflows;
	
	self.wfIndex = self.workflows.map(function(wf) {
		return wf.$trigger;
	});
	
	// - - - wmr
	
	self.wmr = wmr;
	
	wmr.setOutdoorSensorIds(config.outdoorSensorIds);
	
	self.wmr.on('historystate', self.historystate.bind(self));
	self.wmr.on('statechange', self.statechange.bind(self));
	
}

util.inherits (wmri, EventEmitter);

wmri.prototype.historystate = function (data) {
		
	var self = this;
	
	data.forEach(function(item) {
		
		self.getAndRunWF(item);
		
	});

};

wmri.prototype.statechange = function (update) {
		
	var self = this;
	
	update.data.forEach(function(item) {
		
		self.getAndRunWF(item.newValue);
		
	});

};

wmri.prototype.getAndRunWF = function(value) {
	
	var self = this,
		index = self.wfIndex.indexOf(value.type);
		
	if (index == -1) index = self.wfIndex.indexOf(DEFAULT_TRIGGER);
	if (index == -1) return;
	
	var wfCfg = self.workflows[index],
		wf = new workflow(wfCfg, {
			value: value,
			data: {}
		});
	
	wf.run();
	
}