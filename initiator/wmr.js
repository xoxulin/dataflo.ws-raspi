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
	
	self.wmr.on('statechange', self.statechange.bind(self));
	
}

util.inherits (wmri, EventEmitter);

wmri.prototype.statechange = function (update) {
		
	var self = this;
	
	update.data.forEach(function(item) {
		
		var type = item.newValue.type,
			index = self.wfIndex.indexOf(type);
		
		if (index == -1) index = self.wfIndex.indexOf(DEFAULT_TRIGGER);
		if (index == -1) return;
	
		var wfCfg = self.workflows[index],
			wf = new workflow(wfCfg, {
				value: item.newValue,
				data: {}
			});
		
		wf.run();
	});

};