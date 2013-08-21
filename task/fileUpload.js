var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	spawn        = require('child_process').spawn;

var COMMAND = 'curl',
	MAIN_SPLITTER = '\n\nCURL_OUTPUT\n\n';

var fileUpload = module.exports = function (config) {
	this.init (config);
	console.log(config);
};

util.inherits (fileUpload, task);

util.extend (fileUpload.prototype, {
	
	run: function () {

		var self = this,
			args = this.getArgs(),
			fork  = spawn(COMMAND, args),
			stderr = '',
			stdout = '';
		
		fork.stdout.on('data', function (data) {
			
			stdout += data;
			
		});
		
		fork.stdout.on('end', function() {
			
			if (!stderr) self.parseResponse(stdout);
			
		});

		fork.stderr.on('data', function (data) {
			
			stderr += data;
			
		});

		fork.on('exit', function (code) {
			
			if (code != 0) self.failed('curl returns error');
		
		});
	
	},
	
	parseResponse: function(output) {
	
		console.log(output);
		
		var self = this,
			parts = output.split(MAIN_SPLITTER),
			body = parts[0],
			meta = JSON.parse(parts[1]);
		
		console.log(meta, parts);
		
//		if (statusCode == 200) {
//			self.completed ({
//				ok: true
//			});
//		} else {
			self.failed({error: true});
//		}
		
	},
	
	getArgs: function() {
	
		return [
			'--form', this.file.field + '=@' + this.file.location,
			'--form', 'data=\''+ JSON.stringify(this.data)+'\'',
			'-b', this.cookie,
			'--wite-out', MAIN_SPLITTER +
			'\'{' +
				'"statusCode": %{http_code}, ' +
				'"contentType": "%{content_type}", ' +
				'"totalTime": %{time_total}, ' +
				'"down": {"speed": %{speed_download}, "size": %{size_download}, ' +
				'"up": {"speed": %{speed_upload}, "size": %{size_upload}}' +
			'}\''
			this.path
		]
	
	}
});