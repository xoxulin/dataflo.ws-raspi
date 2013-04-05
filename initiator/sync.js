var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	urlUtil      = require ('url'),
	workflow     = require ('dataflo.ws/workflow'),
	Callback     = require ('dataflo.ws/initiator/callback'),
	http		 = require('follow-redirects').http,
	https		 = require('follow-redirects').https;

/**
 * Synchronization class between raspberry and http server
 * start -> get credentials -> if no credentials -> generate credentials -> credentials ->
 * get coockies -> if no coockies -> login -> coockies ->
 * get data -> sync tick -> short timeout -> sync tick -> no data -> long timeout
 *
 */

var synci = module.exports = function (config) {
	
	var self = this;
	
	// - - - callback wfs
	
	self.callbackInitiator = new Callback({
		workflows: config.callbackWfs
	});
	
	// - - - collection wfs
	
	self.collectionWfs = config.collectionWfs;
	
	self.collectionWfsIndex = self.collectionWfs.map(function(wf) {
		return wf.$collection;
	});

	// - - -
	
	self.getCredentials('trackerToServer', function(credentials) {
		self.credentials = credentials;
		self.ready();
	});

}

util.inherits(synci, EventEmitter);

synci.prototype.getCredentials = function(id, cb) {

	var self = this,
		getCredentialsWf = self.callbackInitiator.process('getCredentials', {
			credentialsId: id
		});
	
	getCredentialsWf.on('completed', function(wf) {
		var wfData = wf.data,
			total = wfData.mongoResponse.total,
			data = wfData.mongoResponse.data;
		if (total) {
			cb(data[0]);
		} else {
			self.generateAndSaveDeviceCredentials(id, cb);
		}
	});
	
	getCredentialsWf.on('failed', function(wf) {
		console.log('error', wf.id);
	});
	
	getCredentialsWf.run();
}

synci.prototype.generateAndSaveDeviceCredentials = function(id, cb) {

	var self = this,
		generateWf = self.callbackInitiator.process('generateAndSaveDeviceCredentials', {
			credentialsId: id
		});
	
	generateWf.on('completed', function(wf) {
		var wfData = wf.data,
			credentials = {
				_id: wfData.mongoResponse._id,
				login: wfData.login,
				password: wfData.password
			};
		cb(credentials);
	});
	
	generateWf.on('failed', function(wf) {
		console.log('credentials generation and save failed', error);
	});
	
	generateWf.run();
	
}

synci.prototype.ready = function() {

	console.log('READY', this.credentials);

}



//synci.prototype.login = function () {
//		
//	var self = this;
//	
//	var authParams = urlUtil.parse(self.authUrl),
//		client = (authUrl.protocol == 'https') ? https : http;
//		
//		//authParams.headers = {};
//	
//	
//	client.request(authParams, function(res) {
//	
//	});
//
//}

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
