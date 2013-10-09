var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	urlUtil      = require ('url'),
	workflow     = require ('dataflo.ws/workflow'),
	Callback     = require ('dataflo.ws/initiator/callback'),
	http		 = require('follow-redirects').http,
	https		 = require('follow-redirects').https;

/**
 * Synchronization class between raspberry and http server
 * start -> get cookie -> if no cookie -> get credential ->
 * if no credential -> generate credential -> credential -> login -> cookie ->
 * sync tick -> get data -> remote resource post -> short timeout -> sync tick
 * if remote resource not available -> pingOnce -> remote resource post
 *
 */

var synci = module.exports = function (config) {
	
	var self = this;
	
	// timeouts and syncDomain
	
	// sync: 1000
	// error: 30000
	self.timeOuts = config.timeOuts;
	
	// syncDomain: example.com
	self.syncDomain = config.syncDomain;
	
	// limits
	
	self.limit = config.limit;
	
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
		
	self.getCookie(function(cookie) {
	
		if (cookie) {
			
			self.cookie = cookie;
			self.ready();
			
		} else {
		
			// login for set cookie
	
			self.getCredential('trackerToServer', function(credential) {
				
				if (credential) {
					self.credential = credential;
					self.login(function(loginData) {
						
						if (loginData && loginData.headers && loginData.headers['set-cookie']) {
							
							var rawCookie = loginData.headers['set-cookie'];
							
							self.updateCookie(rawCookie, function(cookie) {
								
								if (cookie) {
									self.cookie = cookie;
									self.ready();
								}
								
							});
						
						} else {
							console.log('It was problem at login!');
							
							setTimeout(function() {
								self.init();
							}, self.timeOuts.longTime);
						}
						
					});
				} else {
					console.log('Credentials getting is problem!');
				}
				
			});
			
		}
	});
	
}

synci.prototype.getCookie = function(cb) {

	var self = this;
	
	self.processCallbackByToken('getCookie', {
		syncDomain: self.syncDomain,
		path: '/',
		timestamp: ~~(Date.now())
	}, function(error, wf) {
		
		if (error) {
			
			cb(true, null);
			
		} else {
			
			var wfData = wf.data,
				cookie = wfData.cookie;
			if (cookie) {
				cb(cookie);
			} else {
				cb(null);
			}
			
		}
		
	});
	
}

synci.prototype.cookieIsFresh = function() {
	
	var self = this;
	self.cookie = cookie;
	
}

synci.prototype.getCredential = function(id, cb) {

	var self = this;
	
	self.processCallbackByToken('getCredential', {
		credentialId: id
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
		credentialId: id
	}, function(error, wf) {
		
		if (error) {
			
			cb(null);
			
		} else {
			
			var wfData = wf.data,
				credential = {
					_id: wfData.mongoResponse._id,
					login: wfData.login,
					password: wfData.password
				};
				
			cb(credential);
		}
		
	});
	
}

synci.prototype.login = function(cb) {

	var self = this;
	
	self.processCallbackByToken('login', {
		timeout: self.timeOuts.sync,
		syncDomain: self.syncDomain,
		credential: self.credential
	}, function(error, wf) {
		
		if (error || wf.error) {
			
			cb(null);
			
		} else {
			
			var dataLogin = wf.data.login;
				
			cb(dataLogin);
		}
		
	});
	
}

synci.prototype.updateCookie = function(rawCookie, cb) {

	var self = this;
	
	self.processCallbackByToken('updateCookie', {
		cookie: rawCookie,
		syncDomain: self.syncDomain
	}, function(error, wf) {
		
		if (error) {
			
			cb(null);
			
		} else {
			
			var wfData = wf.data,
				mongo = wfData.mongoResponse,
				cookie = wfData.renderedCookie;
			console.log('[COOKIE.LENGTH]:', mongo.length || mongo.length, cookie.length);
			cb(cookie);
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
		index = self.collectionWfsIndex.indexOf(collection);
		
	if (index != -1) {
		var collectionWf = self.collectionWfs[index];
			syncTime = collectionWf.timeOut.sync;
			errorTime = collectionWf.timeOut.error;
	} else {
		return;
	}
	
	var wf = new workflow(collectionWf, {
		cookie: self.cookie,
		limit: self.limit,
		syncDomain: self.syncDomain,		
		data: {}
	});
	
	wf.on('completed', function(wf) {
		
		if (wf.data.syncResponse && !wf.error) {
		
			console.log('[INFO] Sync success:', collection);
			
			var syncResponse = wf.data.syncResponse,
				rawCookie = syncResponse.headers['set-cookie'];
			
			self.afterSync(rawCookie, function() {
				
				setTimeout(function() {
					self.sync(collection);
				}, syncTime);
				
			});
		
		} else {
			
			console.log('[ERROR] Sync fail:', collection);
			
			setTimeout(function() {
				self.sync(collection);
			}, errorTime);
		
		}
		
	});
	
	wf.on('failed', function(wf) {
	
		console.log('[ERROR] Sync fail:', collection);
		
		var failWf = self.runCatch(wf);
		
		if (failWf) {
		
			failWf.on('completed', function() {
			
				setTimeout(function() {
					self.sync(collection);
				}, errorTime);
			
			});
			
			failWf.on('failed', function() {
			
				setTimeout(function() {
					self.sync(collection);
				}, errorTime);
			
			});
			
			failWf.run();
			
			
		} else {
		
			setTimeout(function() {
				self.sync(collection);
			}, errorTime);
		
		}
		
	});
		
	wf.run();

};

synci.prototype.afterSync = function(rawCookie, cb) {

	var self = this;
	
	self.updateCookie(rawCookie, function(cookie) {
								
		if (cookie) {
			self.cookie = cookie;
		}
		
		cb();
		
	});

}

/////////////////////////////////////////////////////////////////////////////

synci.prototype.processCallbackByToken = function(name, requires, callback) {
	
	var self = this,
		cbWf = self.callbackInitiator.process(name, requires);
	
	if (cbWf) {
	
		cbWf.on('completed', function(wf) {
			callback(null, wf);
		});
		
		cbWf.on('failed', function(wf) {
			callback(new Error('Workflow ' + name + '[' + wf.id + '] failed'), wf);
		});
		
		cbWf.run();
	
	} else {
		
		callback(new Error('Workflow ' + name + ' not found'), null);
		
	}
}

// run catch error level

synci.prototype.runCatch = function (wf) {
	
	var self = this,
		error = wf.error;
	
	if (!error || !error.name || !error.type) return;
	
	var errDesc = error.name + " " + error.type,
		stage = err.name + " (" + (err.type || err.message) + ")";
	
	if (!wf.$catches || !wf.$catches[errDesc]) return;
	
	var catchTasks = wf.$catches[errDesc].tasks,
		reqParams = util.extend(true, {
			error: wf.error
		}, wf.data),
		failWf = new workflow ({
			id:    wf.id,
			tasks: catchTasks,
			stage: stage
		}, reqParams);

	failWf.on ('completed', function () {
		//self.log ('presenter done');
	});

	failWf.on ('failed', function () {
		failWf.log ('Fail Handler failed');
	});
	
	return failWf;
}
