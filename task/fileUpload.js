var task         = require ('dataflo.ws/task/base'),
	util         = require ('util'),
	spawn        = require('child_process').spawn;

var COMMAND = 'curl',
	MAIN_SPLITTER = '\n\nCURL_OUTPUT\n\n',
	CURL_ERROR_REGEX = /^(curl):\s*?\((\d+)\)\s+(.*)$/mi;

var fileUpload = module.exports = function (config) {
	this.init (config);
};

util.inherits (fileUpload, task);

util.extend (fileUpload.prototype, {
	
	run: function () {

		var self = this,
			args = this.getArgs(),
			fork  = spawn(COMMAND, args),
			stderr = '',
			stdout = '',
			exitCode;

		fork.stdout.on('data', function (data) {
			
			stdout += data;
			
		});
		
		fork.stdout.on('end', function() {
			
			if (exitCode != null && exitCode == 0) self.parseResponse(stdout);
			
		});

		fork.stderr.on('data', function (data) {
			
			stderr += data;
			
		});
		
		fork.stderr.on('end', function (data) {
			
			if (exitCode != null && exitCode != 0) {
				self.failed(self.parseError(stderr));
			}
			
		});

		fork.on('exit', function (code) {
			
			exitCode = code;
			if (code != 0 && fork.stderr.destroyed) self.failed(self.parseError(stderr));
			if (fork.stdout.destroyed) self.parseResponse(stdout);
		
		});
	
	},
	
	parseResponse: function(output) {
	
		var self = this,
			parts = output.split(MAIN_SPLITTER),
			body = parts[0],
			meta = parts[1];
		
		try {
			meta = JSON.parse(meta);
		} catch (e) {
			self.failed('meta format is broken');
			return;
		}
		
		if (meta) {
			var contentType = meta.contentType.split('; ')[0];
			if (meta.statusCode == 200 && contentType == 'application/json') {
				
				try {
					var response = JSON.parse(body);
					self.completed ({
						response: response,
						meta: meta
					});
				} catch (e) {
					self.failed('response JSON is broken');
				}
			} else {
				self.failed(meta);
			}
		
		} else {
		
			self.failed('meta is broken')

		}
		
	},
	
	parseError: function(err) {
		
		var match = err.match(CURL_ERROR_REGEX);
		
		if (match && match[1] && match[2] && match[3]) {
			
			var err = new Error(match[3]);
			
			err.name = "CurlError";
			err.type = parseInt(match[2]);
			
			return err;
		}
		
		return new Error(err);
		
	},
	
	getArgs: function() {
	
		return [
			'--form', 'src=@' + this.file,
			'--form', 'data='+ JSON.stringify(this.data),
			'-b', this.cookie,
			'--write-out', MAIN_SPLITTER +
			'{' +
				'"statusCode": %{http_code}, ' +
				'"contentType": "%{content_type}", ' +
				'"totalTime": %{time_total}, ' +
				'"down": {' + 
					'"speed": %{speed_download}, ' +
					'"size": %{size_download}' +
				'}, ' +
				'"up": {' +
					'"speed": %{speed_upload}, ' +
					'"size": %{size_upload}' +
				'}' +
			'}',
			this.path
		]
	
	}
});