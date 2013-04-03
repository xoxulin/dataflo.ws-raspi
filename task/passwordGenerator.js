var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	crypto       = require ('crypto');

var passwordGeneratorTask = module.exports = function (config) {

	this.init (config);
	
};

util.inherits (passwordGeneratorTask, task);

passwordGeneratorTask.prototype.run = function () {

	var self = this,
		length = self.length;
		
	crypto.randomBytes(length, function(ex, buf) {
		
		var password = buf.toString('base64');
		self.completed(password);
		
	});

}