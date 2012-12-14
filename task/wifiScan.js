var EventEmitter = require ('events').EventEmitter,
	crypto       = require ('crypto'),
	task         = require ('task/base'),
	util         = require ('util'),
	urlUtil      = require ('url'),
	spawn        = require('child_process').spawn;

var COMMAND = 'iwlist';

var wifiScanTask = module.exports = function (config) {
	this.init (config);
};

util.inherits (wifiScanTask, task);

util.extend (wifiScanTask.prototype, {
	
	run: function () {

		var self = this,
			args = ['wlan0', 'scan'],
			fork  = spawn(COMMAND, args),
			stderr = '',
			stdout = '';
		
		fork.stdout.on('data', function (data) {
			
			stdout += data;
			
		});

		fork.stderr.on('data', function (data) {
			
			stderr += data;
			
		});

		fork.on('exit', function (code) {

			self.parseIWList(stdout);
		
		});
	
	},
	
	parseIWList: function(output) {
		
		var self = this;
		
		var wifiList = [],
			currentWiFi,
			lastParameter
			cells = output.split (/Cell \d+ - /),
			parameterRe = /^\s*([^:=]+)(:|=)\s*(.*?)\s*$/,
			continueRe = /^\s*(.*?)\s*$/;
		
		cells.shift(); //remove 'wifi scan completed'
		console.log('CELLS:', cells.length)
		cells.forEach(function (cell) {
		
			currentWiFi = {};
			
			var parameters = cell.split("\n");
			parameters.pop();
			
			parameters.forEach(function(parameter) {
				var match = parameter.match(parameterRe);
				
				if (match) {
					lastParameter = match[1];
					currentWiFi[lastParameter] = match[3];
				} else {
					var spaceMatch = parameter.match(continueRe);
					currentWiFi[lastParameter] += spaceMatch && spaceMatch[1] || parameter;
				}
			});
			
			wifiList.push(currentWiFi);
		});
		
		self.completed ({
			success: true,
			total: wifiList.length,
			err: null,
			data: wifiList
		});
	}
});