var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	urlUtil      = require ('url'),
	workflow     = require ('dataflo.ws/workflow'),
	Callback     = require ('dataflo.ws/initiator/callback'),
	http		 = require('follow-redirects').http,
	https		 = require('follow-redirects').https;

var synci = module.exports = function (config) {
	
	var self = this;
	
	// - - - login
	
	self.authUrl = config.authUrl;
	
	// - - - callback wfs
	
	self.callbackInitiator = new Callback({
		workflows: config.callbackWfs
	});
	
	// - - - collection wfs
	
	self.collectionWfs = config.collectionWfs;
	
	self.collectionWfsIndex = self.collectionWfs.map(function(wf) {
		return wf.$collection;
	});
	
}

util.inherits(synci, EventEmitter);

synci.prototype.ping = function() {
	
	
	
}

synci.prototype.generateDeviceCredentials = function(callback) {

	var self = this,
		generateWf = self.callbackInitiator.process('generateDeviceCredentials', {});
	
	generateWf.on('completed', function() {
		callback(null, generateWf.data);
	});
	
	generateWf.on('failed', function(error) {
		callback(error, null);
	});
	
	generateWf.run();
	
}

synci.prototype.login = function () {
		
	var self = this;
	
//	var authParams = urlUtil.parse(self.authUrl),
//		client = (authUrl.protocol == 'https') ? https : http;
//		
		//authParams.headers = {};
	
	
//	client.request(authParams, function(res) {
//	
//	});

};

/*sync.prototype.sync = function (data) {

	var self = this;
	
	data.forEach(function(item) {
		
		var type = item.type,
			index = self.wfIndex.indexOf(type);
		
		if (index == -1) index = self.wfIndex.indexOf(DEFAULT_TRIGGER);
		if (index == -1) return;
	
		var wfCfg = self.workflows[index],
			wf = new workflow(wfCfg, {
				value: item,
				data: {}
			});
		
		wf.run();
	});

};*/