var EventEmitter = require ('events').EventEmitter,
	util         = require ('util'),
	workflow     = require ('dataflo.ws/workflow'),
	serialport	 = require ('serialport'),
	SerialPort	 = serialport.SerialPort;

var arduino = module.exports = function (config) {
	
	var self = this;
	
	EventEmitter.constructor.call(this);
	
	// - - - config
	
	self.serialPortConfig = config.serialPort;
	self.writeTimeout = config.writeTimeout;
	
	// - - - commands
	
	self.commands = config.commands || {};
	
	self.commands.ping = "ping";
	self.commands.shutDown = "shut_down";
	
	// - - - workflows
	
	self.workflows = config.workflows;
	
	self.commands.list = [self.commands.ping];
	self.workflowsIndex = [];
	
	self.workflows.forEach(function(wf) {
		
		if (wf.$trigger != self.commands.shutDown && wf.$trigger != self.commands.ping) {
			self.commands.list.push(wf.$trigger);
		}
		
		self.workflowsIndex.push(wf.$trigger);
	});
	
	// - - - serial port of Arduino search
	
	self.boundOnError = self.onError.bind(self);
	
	self.scan();
	
}

util.inherits (arduino, EventEmitter);

arduino.prototype.scan = function() {

	var self = this;
	
	serialport.list(function (err, ports) {
	
		var needPort;
		
		ports.forEach(function(port) {
			
			if (port.vendorId == self.serialPortConfig.vendorId &&
				port.productId == self.serialPortConfig.productId) {
				needPort = port;
			}
			
		});
		
		if (needPort) {
			self.init(needPort.comName);
		} else {
			console.log('Arduino is not connected!');
			setTimeout(function() {
				self.scan();
			}, self.serialPortConfig.timeout);
		}
		
	});
	
}

arduino.prototype.init = function(address) {
	
	var self = this;
	
	self.serialPort = new SerialPort(address, {
	  baudrate: self.serialPortConfig.baudRate,
	  parser: serialport.parsers.readline("\r\n")
	}, false);
	
	self.serialPort.open(self.onOpen.bind(self));
};

arduino.prototype.onOpen = function() {
	var self = this;
	console.log('Arduino connected through', self.serialPort.path);
	self.serialPort.on('data', self.onData.bind(self));
	self.serialPort.on('error', self.boundOnError);
	
	self.serialPort.write("RESET\r\n");
	
	self.writeInterval = setInterval(self.sendCmd.bind(self), self.writeTimeout);
}

arduino.prototype.onData = function(data) {
	
	var self = this,
		answer = data.toString().toLowerCase();
	
	if (self.currentCommand) {
	
		var indexCmd = answer.indexOf(self.currentCommand); // ~(-1) -> 0 | false
		
		self.processAnswer(answer);
			
		if (~indexCmd) {
			if (self.idleTimeout) clearTimeout(self.idleTimeout);
			self.idleTimeout = setTimeout(self.boundOnError, self.serialPortConfig.timeout)
		}
	}
	
}

arduino.prototype.onError = function() {
	
	var self = this;
	console.log('Arduino disconnected');
	self.serialPort.close();
	self.serialPort = null;
	
	if (self.writeInterval) {
		clearInterval(self.writeInterval);
		self.writeInterval = null;
	}
	
	setTimeout(function() {
		self.scan();
	}, self.serialPortConfig.timeout);
	
}

arduino.prototype.sendCmd = function() {
	
	var self = this;
	
	if (self.currentCommandIndex == null || self.currentCommandIndex >= self.commands.list.length) {
		self.currentCommandIndex = 0;
	}
	
	self.currentCommand = self.commands.list[self.currentCommandIndex];
	
	self.serialPort.write(self.currentCommand + "\r\n");
	
	self.currentCommandIndex++;
	
}

arduino.prototype.processAnswer = function(answer) {

	var self= this,
		parts = answer.split(' '),
		header = parts.shift(),
		body = parts.join(' '),
		ix = self.workflowsIndex.indexOf(header);
		
	if (~ix) {
		
		var wfCfg = self.workflows[ix],
			data = {
				type: header,
				timestamp: ~~(Date.now()/1000)
			};
		
		if (body) {
			if (wfCfg.$parser) {
				
				switch (wfCfg.$parser) {
					case "boolean":
						body = Boolean(body);
						break;
					case "int":
						body = parseInt(body);
						break;
					case "float":
						body = parseFloat(body);
						break;
				}
				
			}
			data.value = body;
		}
		
		var wf = new workflow(wfCfg, {
				value: data
			});
		
		wf.run();
	
	}

}