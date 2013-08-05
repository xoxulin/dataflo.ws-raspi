var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
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
		
		fork.stdout.on('end', function() {
			
			if (!stderr) self.parseIWList(stdout);
			
		});

		fork.stderr.on('data', function (data) {
			
			stderr += data;
			
		});

		fork.on('exit', function (code) {

			if (code != 0) self.failed('no sound signal');
		
		});
	
	},
	
	parseIWList: function(output) {
		
		var self = this;
		
		var wifiList = [],
			currentWiFi,
			lastParameter
			cells = output.split (/Cell \d+ - /),
			firstSpacesRe = /^\s*/gm,
			lastSpacesRe = /\s*$/gm,
			doubleSpacesRe = /\s\s/gm,
			parameterRe = /^([^:=]+?)\s*(:|=)\s*(.*?)$/,
			continueRe = /^(.*?)$/;
		
		cells.shift(); //remove 'wifi scan completed'
		if (self.verbose) self.emit('log', 'CELLS accepted: ' + cells.length);
		cells.forEach(function (cell) {
		
			currentWiFi = {};
			cell = cell.replace(firstSpacesRe, '').replace(lastSpacesRe, '').replace(doubleSpacesRe, '\n');
			
			var parameters = cell.split("\n");
			
			if (parameters && parameters.length > 0) {
			
				parameters.forEach(function(parameter) {
					var match = parameter.match(parameterRe);
					
					if (match) {
						lastParameter = match[1].toLowerCase().replace(/\(\d*\)/g,'').replace(/\s+/g,'_');
						currentWiFi[lastParameter] = match[3];
					} else {
						var spaceMatch = parameter.match(continueRe);
						currentWiFi[lastParameter] += spaceMatch && spaceMatch[1] || parameter;
					}
				});
				
			}
			
			if (currentWiFi.essid && currentWiFi.address) {
				currentWiFi.essid = currentWiFi.essid.replace(/["<>\(\)]/g,'');
				currentWiFi.address = currentWiFi.address.replace(/:/g,'').toLowerCase();
				
				var signal = currentWiFi.signal_level && currentWiFi.signal_level.split('/') || ['0', '100'];
				if (signal.length == 1) signal.push('100');
				currentWiFi.signal_level = Math.round(parseInt(signal[0])/parseInt(signal[1])*100);
				
				var quality = currentWiFi.quality && currentWiFi.quality.split('/') || ['0', '100'];
				if (quality.length == 1) quality.push('100');
				currentWiFi.quality = Math.round(parseInt(quality[0])/parseInt(quality[1])*100);
				
				wifiList.push(currentWiFi);
			}
		});
		
		self.completed ({
			success: true,
			total: wifiList.length,
			err: null,
			data: wifiList
		});
	}
});