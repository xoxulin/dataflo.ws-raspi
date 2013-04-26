var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	urlUtil      = require ('url'),
	workflow     = require ('dataflo.ws/workflow'),
	Callback     = require ('dataflo.ws/initiator/callback'),
	http		 = require('follow-redirects').http,
	https		 = require('follow-redirects').https;

/**
 * Synchronization class between raspberry and http server
 * start -> get cookies -> if no cookies -> get credentials ->
 * if no credentials -> generate credentials -> credentials -> login -> cookies ->
 * sync tick -> get data -> remote resource post -> short timeout -> sync tick
 * if remote resource not available -> pingOnce -> remote resource post
 *
 */

var synci = module.exports = function (config) {
	
	var self = this;
	
	// timeouts and syncDomain
	
	// ping: 1000
	// shortTime: 1000
	// longTime: 30000
	self.timeOuts = config.timeOuts;
	
	// syncDomain: example.com
	self.syncDomain = config.syncDomain;
	
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
	
	self.init();

}

util.inherits(synci, EventEmitter);

synci.prototype.init = function() {
	
	var self = this;
		
	self.getCookies(function(cookies) {
	
		if (cookies) {
			
			self.cookies = cookies;
			self.ready();
			
		} else {
		
			// login for set cookies
	
			self.getCredentials('trackerToServer', function(credentials) {
				
				if (credentials) {
					self.credentials = credentials;
					self.login(function(cookies) {
						
						if (cookies) {
							self.cookies = cookies;
							self.ready();
						} else {
							console.log('It was problem at login!');
						}
						
					});
				} else {
					console.log('Credentials getting is problem!');
				}
				
			});
			
		}
	});
	
}

synci.prototype.getCookies = function(cb) {

	var self = this;
	
	self.processCallbackByToken('getCookies', {
		syncDomain: self.syncDomain,
		timestamp: ~~(Date.now())
	}, function(error, wf) {
		
		if (error) {
			
			cb(true, null);
			
		} else {
			
			var wfData = wf.data,
				cookies = wfData.cookies;
			if (cookies) {
				cb(cookies);
			} else {
				cb(null);
			}
			
		}
		
	});
	
}

synci.prototype.getCredentials = function(id, cb) {

	var self = this;
	
	self.processCallbackByToken('getCredentials', {
		credentialsId: id
	}, function(error, wf) {
		
		if (error) {
			
			cb(null);
			
		} else {
			
			var wfData = wf.data,
				total = wfData.mongoResponse.total,
				data = wfData.mongoResponse.data;
			if (total) {
				cb(data[0]);
			} else {
				self.generateAndSaveDeviceCredentials(id, cb);
			}
			
		}
		
	});
	
}

synci.prototype.generateAndSaveDeviceCredentials = function(id, cb) {

	var self = this;
	
	self.processCallbackByToken('generateAndSaveDeviceCredentials', {
		credentialsId: id
	}, function(error, wf) {
		
		if (error) {
			
			cb(null);
			
		} else {
			
			var wfData = wf.data,
				credentials = {
					_id: wfData.mongoResponse._id,
					login: wfData.login,
					password: wfData.password
				};
				
			cb(credentials);
		}
		
	});
	
}

synci.prototype.login = function(cb) {

	var self = this;
	
	self.processCallbackByToken('login', {
		syncDomain: self.syncDomain,
		credentials: self.credentials
	}, function(error, wf) {
		
		if (error) {
			
			cb(null);
			
		} else {
			
			var dataLogin = wf.data.login;
				
			cb(wf.data.cookies.stoken);
		}
		
	});
	
}

synci.prototype.ready = function() {
	
	var self = this;
	
	self.collectionWfsIndex.forEach(function(collection) {
		
		console.log('[INFO] Start syncing:', collection);
		self.sync(collection);
		
	});
	
}

synci.prototype.sync = function(collection) {

	//collectionWf.$collection
	
	var self = this,
		index = self.collectionWfsIndex.indexOf(collection),
		collectionWf = self.collectionWfs[index];
	
	var wf = new workflow(collectionWf, {
		cookie: self.cookies,
		limit: 10,
		syncDomain: self.syncDomain,		
		data: {}
	});
	
	wf.on('completed', function(wf) {
		
		if (wf.data.syncResponse && !wf.error) {
		
			console.log('[INFO] Sync success:', collection);
			
			setTimeout(function() {
				self.sync(collection);
			}, self.timeOuts.shortTime);
		
		} else {
			
			console.log('[INFO] Sync fail:', collection);
			
			setTimeout(function() {
				self.sync(collection);
			}, self.timeOuts.longTime);
		
		}
		
	});
	
	wf.on('failed', function(wf) {
	
		console.log('[INFO] Sync fail:', collection);
		
		setTimeout(function() {
			self.sync(collection);
		}, self.timeOuts.longTime);
		
	});
		
	wf.run();

};

/////////////////////////////////////////////////////////////////////////////

synci.prototype.processCallbackByToken = function(name, requires, callback) {
	
	var self = this,
		cbWf = self.callbackInitiator.process(name, requires);
	
	cbWf.on('completed', function(wf) {
		callback(null, wf);
	});
	
	cbWf.on('failed', function(wf) {
		callback(new Error('Workflow ' + name + '[' + wf.id + '] failed'), wf);
	});
	
	cbWf.run();
	
}
