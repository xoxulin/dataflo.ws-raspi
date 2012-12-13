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
	
	parseIWList: function() {
		
		var self = this;
		
		var docs = [],
			currentWiFi = {},
			records = stdout.split ("\n");
		
		console.log();
	
		records.map (function (item) {
		
			console.log(item);
			
//				Cell 01 - Address: 58:BC:27:5C:D4:E0
//                    ESSID:"<hidden>"
//                    Protocol:IEEE 802.11bgn
//                    Mode:Master
//                    Frequency:2.412 GHz (Channel 1)
//                    Encryption key:on
//                    Bit Rates:1 Mb/s; 2 Mb/s; 5.5 Mb/s; 6 Mb/s; 9 Mb/s
//                              11 Mb/s; 12 Mb/s; 18 Mb/s; 24 Mb/s; 36 Mb/s
//                              48 Mb/s; 54 Mb/s
//                    Extra:rsn_ie=30180100000fac020200000fac02000fac040100000fac022800
//                    IE: IEEE 802.11i/WPA2 Version 1
//                        Group Cipher : TKIP
//                        Pairwise Ciphers (2) : TKIP CCMP
//                        Authentication Suites (1) : PSK
//                    Signal level=62/100
			
		});
		
		self.completed ({
			success: true,
			total: 0,
			err: null,
			data: []
		});
	}
});