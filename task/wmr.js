var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	wmr 	 	 = require('../wmr/wmr');

var wmrTask = module.exports = function (config) {

	this.init (config);
	this.wmr = wmr;
	
};

util.inherits (wmrTask, task);

wmrTask.prototype.run = function () {
	
	var self = this,
		flat = self.flat;
		
	if (flat) {
	
		var	state = wmr.state,
			data = Object.keys(wmr.state).map(function(key) {
				return state[key];
			})
		
		self.completed({
			data: data,
			success: true,
			err: null,
			total: data.length
		});
	
	} else {
		self.completed(wmr.state);
	}
	
};