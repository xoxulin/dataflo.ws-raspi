var EventEmitter = require ('events').EventEmitter,
	task         = require ('task/base'),
	util         = require ('util'),
	usb_driver	 = require ('usb');

// initials for USB

var VID_OREGON = 0x0fde,
	PID_METEO = 0xca01;

// Search for meteo device

var meteoDevices = usb.find_by_vid_and_pid(VID_OREGON, PID_METEO);
console.log("Total meteo devices found: " + meteoDevices.length);

var meteo = meteoDevices[0];

// get interfaces of motor
var meteoInterfaces = meteo.interfaces;
console.log("Meteo contains interfaces: " + meteoInterfaces.length);

// claim first interface
var meteoInterface = meteoInterfaces[0];
console.log("Claiming meteo interface for further actions");
meteoInterface.detachKernelDriver();
meteoInterface.claim();

// - - - wmr200Task

var wmr200Task = module.exports = function (config) {

	// GLOBAL VARIABLES
	
	/*this.connected  = false;         // Have we got a connection to the WMR200?
	this.gotHistory = true;          // We always assume that we'll get history data at startup.
	this.stopIssued = false;         // Set to true when we issue a DF stop command to the WMR200.
	this.gotTimeFix = false;         // Set to true when we've determined the time difference
									 // between PC and the WMR200.
	this.iHist = this.iLive = 0;     // Counts for history and live packets received.
	
	this.rcv_data = new Buffer(128); // We collect USB data in this array until we've received a
									 // full WMR packet (1st byte contains length).
	this.wmr_data = new Buffer(128); // We port a full packet into this array and then ship it for
									 // further processing (1st byte contains length).
	this.wmr_time_fix = 0;			 // Packet timestamp correction in whole minutes as determined
									 // from 1st live packet received.
	this.now_time = new Date();
	this.wmr_time = new Date();
	this.timer_heartbeat = 0;		 // timer for sending 30 second [D0] heartbeats.
	*/
	// this config
	
	this.init (config);
	
	/*// BUTTONS

	// START BUTTON
	private void btn_start_Click(object sender, EventArgs e)
	{
	   cmd_start();
	}

	// STOP BUTTON
	private void btn_stop_Click(object sender, EventArgs e)
	{
	   cmd_stop();
	}

	// ERASE BUTTON
	private void btn_erase_Click(object sender, EventArgs e)
	{
	   cmd_erase();
	}
	
	// TIMER MANAGEMENT
	// [D0] Heartbeat timer for the WMR200 to keep on pumping live data otherwise WMR will time
	// out after 30 seconds.

	private void heartbeat_start()
	{
	   timer_heartbeat.Interval = 30000; // 30 seconds timeout trigger
	   timer_heartbeat.Start();
	}

	private void heartbeat_stop()
	{
	   timer_heartbeat.Stop();
	}

	private void heartbeat_reset()
	{
	   timer_heartbeat.Stop();
	   timer_heartbeat.Start();
	}

	private void timer_heartbeat_Tick(object sender, EventArgs e)
	{
	   send_command("01 D0");
	} */
	
};

util.inherits (wmr200Task, task);

util.extend (wmr200Task.prototype, {
	
	run: function () {},
	
	tick: function() {
		
	},
	
	connect: function() {
		
		var usb = {};

		try {
			usb.ProductId = 51713; // 0xCA 0x01
			usb.VendorId  = 4062;  // 0x0F 0xDE
			usb.CheckDevicePresent(); // USB DLL library function
		}
		catch (e) {
			console.log(e.toString());
		}
	},
	
	// START [D0] COMMAND
	start: function() {
		if (!this.connected) {
			this.connect(); // we'll get a "usb_OnSpecifiedDeviceArrived" event if successfull
		} else {
			this.reset();
			this.sendD0();
		}
	},
	
	// STOP [DF] COMMAND
	stop: function() {
	// NOTE: The stop sometimes responds with a last packet and then confirms with DF
		this.stopIssued = true;
	},
	
	// ERASE [DB] COMMAND (erases the history in the WMR200 data logger)
	erase: function() {
		this.heartbeat_stop();
		this.reset();
		this.send_command("01 DB");
		this.stopIssued = true;
	},
	
	// RESET COMMAND
   reset: function() {
       this.heartbeat_stop();
       this.iLive      = 0;
       this.iHist      = 0;
       this.gotHistory = true;
       this.gotTimeFix = false;
       this.stopIssued = false;
       this.send_command("20 00 08 01");
       this.rcv_dataClear(); // clear the data collector array
   },
   
	// SEND [D0] COMMAND
	sendD0: function() {
		if (this.stopIssued) return;
		this.heartbeat_start();
		this.send_command("01 D0");
	},

	// SEND [DA] COMMAND
	sendDA: function() {
		if (this.stopIssued) {
			this.heartbeat_stop();
			this.send_command("01 DF");
		} else {
			this.heartbeat_reset();
			this.send_command("01 DA");
		}
	},
	
	// USB SEND COMMAND FRAME

	send_command: function(cmd) {
		try {
			cmd += " ";
			cmd.Trim();
			if (cmd == null) return;
			var command = cmd.split(' '),
				data = new Buffer(128); // 9byte { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
			
			for (var i = 0; i < command.length; i++) {
				if (command[i] != "")
				{
					var value = parseInt(command[i], 16);
					data.writeInt(value);
				}
			}

			if (this.usb.SpecifiedDevice != null) {
			usb.SpecifiedDevice.SendData(data); // USB DLL function
			} else {
			 console.log("Sorry but the WMR200 is not present. Plug it in!! ");
			}
		}
		catch (e) {
			console.log(e.toString());
		}
	},
	
	// -----------------------------------------------
	
	// USB DEVICE ARRIVED EVENT
	usb_OnSpecifiedDeviceArrived: function(sender, e) {
		// WMR200 device has been found .. now start sending
		this.reset();
		this.sendD0();
		this.connected = true;
	},
	
	// USB ON DATA RECEIVED EVENT
	usb_OnDataReceived: function(sender, args) {
		
		if (InvokeRequired) {
			try {
				Invoke(new DataReceivedEventHandler(usb_OnDataReceived), new object[] { sender, args });
			}
			catch (Exception ex) {
				MessageBox.Show(ex.ToString());
			}
		} else {
		
			// expected 9 byte USB frame in "args.data": 0x00 0x03 0xD3 0x10 0x30 0x.. 0x.. 0x.. 0x.. 0x..
			// If we're collecting a new packet make sure it's not junk (because in shared mode we
			// might get half packets on startup).
			
			if (rcv_data[0] == 0x00 // the length in rcv_data[0] will be 0 if expecting a new packet
				&& !(args.data[2] >= 0xD1 && args.data[2] <= 0xD7) // make sure 2nd byte is a valid packet
				&& !(args.data[2] == 0xD9)
				&& !(args.data[2] == 0xDB)
				&& !(args.data[2] == 0xDF)
			) return; // junk ... we're not in sync with WMR200

			// Collect and append the USB frames into "rcv_data"
			Array.Copy(args.data, 2, rcv_data, rcv_data[0] + 1, args.data[1]);
			rcv_data[0] += args.data[1]; // rcv_data[0] holds the count of valid USB data received

			// Check that we have collected a full data packet before we proceed to process it.
			if (rcv_data[2] != 0x00         	// We must have at least received the pkt length to
												// determine the logic following in this "if" condition.
				&&  rcv_data[0] >= rcv_data[2]  // Collected length must be at least expected packet
												// length or greater.
				&& (rcv_data[1] >= 0xD2 && rcv_data[1] <= 0xD7   // Must also be one of the expected
				||  rcv_data[1] == 0xD9)) {                      // packet types [d2] to [d7] or [d9].
												// Move the received packet for further processing into "wmr_data" (excluding any
												// overflow ... weâ€™ll handle overflow below).
			
				Array.Copy(rcv_data, 1, wmr_data, 1, rcv_data[2]);
				wmr_data[0] = wmr_data[2]; // set the array length to packet length


				// Fix the timestamp on data packets (but only if the WMR200 clock is out)
				if (gotTimeFix && wmr_time_fix != 0) {
					fix_pkt_timestamp(ref wmr_data);
				} else {
					if (!gotTimeFix && wmr_data[1] < 0xD9) {
						// D9 packet has no timestamp ... skip it
						// calculate time difference between WMR200 and PC clock for timestamp correction.
						now_time = DateTime.Now;
						now_time = new DateTime( now_time.Year
								, now_time.Month
								, now_time.Day
								, now_time.Hour
								, now_time.Minute
								, 0               // round this to the minute
								);
						wmr_time = new DateTime( wmr_data[7] + 2000
								, wmr_data[6]
								, wmr_data[5]
								, wmr_data[4]
								, wmr_data[3]
								, 0
								);

						// substract the now_time from wmr_time to determine timespan difference
						TimeSpan timeCorrection = now_time.Subtract(wmr_time);
						wmr_time_fix = decimal.Ceiling(Convert.ToDecimal(timeCorrection.TotalMinutes));
						gotTimeFix = true;
						fix_pkt_timestamp(ref wmr_data); // Fix timestamp of this packet
					}


					// Check if we received overflow while collecting data. If so then don't ACK this
					// wmr_data packet until we receive all of the frames for the overflow packet.

					// Check if the received data is greater than the packet length.
					if (rcv_data[0] > rcv_data[2]) // overflow?
					{
						// calculate length of overflow
						byte lenOvr = Convert.ToByte((int)rcv_data[0] - (int)rcv_data[2]);

						// move the overflow to the beginning of "rcv_data"
						Array.Copy(rcv_data, rcv_data[2] + 1, rcv_data, 1, lenOvr);
						rcv_data[0] = lenOvr;

						// Clear the remainder of "rcv_data" so that we don't process half packets by
						// mistake (important!)
						Array.Clear(rcv_data, lenOvr + 1, rcv_data.Length - lenOvr - 1);

						// Handle 1 byte overflow packets immediately and check for junk
						if(!(rcv_data[1] >= 0xD1 && rcv_data[1] <= 0xD7)
							&& !(rcv_data[1] == 0xD9)
							&& !(rcv_data[1] == 0xDB)
							&& !(rcv_data[1] == 0xDF)) {// then we've got junk
							
							rcv_dataClear();
							
						} else if (rcv_data[1] == 0xD1) {
							
							rcv_dataClear();
							
							if (iHist > 0) {
								// If not then wait for the 1st live to determine
								cmd_sendDA();
								// time difference between PC and WMR clock
							}
							
						} else if (rcv_data[1] == 0xDF) {
						
							timer_timeout.Stop();
							rcv_dataClear();
							stopIssued = true;
							
						}
						
					} else {
						// ACK the packets where necessary
						switch (wmr_data[1]) {
							case 0xD2: // we always send an ACK after history packets
								if (!stopIssued) {
									gotHistory = true; // Switch back to history extraction mode (so that we
									cmd_sendDA();      // ACK live packets again)
								}
								iLive = 0;
								iHist++;
								rcv_dataClear();
								break;

							default:
								if (gotHistory) {
									// after 10 consecutive live packets we assume end of history and start
									// sending a heartbeat instead
									if (iLive++ >= 10) { // now start a heartbeat instead of ACKing every live packet
										if (!stopIssued)
										{
											heartbeat_start(); // start pumping [D0]'s every 30 seconds
											send_command("01 D0");
										}
										gotHistory = false;
										iLive = 0;
									} else if (gotTimeFix) {
										// if no time fix then wait for the next live packet
										cmd_sendDA();
									}
								}
								rcv_dataClear();
							break;
						}

						// now send off the received packet for further processing.
						process_WMR_Packet(wmr_data);

					// end of valid data packets [d2] to [d7] and [d9]
					} else if (rcv_data[0] == 1) {
						// 1 byte WMR packets are handled here ...[d1], [db] or [df]
						switch (rcv_data[1]) {
							case 0xD1:
								rcv_dataClear();
								if (iHist > 0 && !stopIssued) {
									// If not then wait for the 1st live packet to get time difference between
									// PC and WMR clock
									cmd_sendDA();
								}
							break;

							case 0xDB:
								timer_timeout.Stop();
								rcv_dataClear();
							break;

							case 0xDF:
								timer_timeout.Stop();
								rcv_dataClear();
								stopIssued = true;
							break;
						}
					}
				// else we keep on collecting USB frames until we have at least a full packet
				}
			}
		}
	},
	
	// process wmr packets
	
	process_WMR_Packet: function(wmr_data) {
		// wmr_data[0] is length of array.
		// NOTE: You need to collect live data while in history mode and append that to history
		// when finished.

		if (check_CRC(wmr_data)) {
			// if CRC is OK then process packet
			switch (wmr_data[1])
			{// do whatever needs to be done with these
				case 0xD2: process_History(wmr_data);     break;
				case 0xD3: process_Wind(wmr_data);        break;
				case 0xD4: process_Rain(wmr_data);        break;
				case 0xD5: process_UVI(wmr_data);         break;
				case 0xD6: process_Pressur(wmr_data);     break;
				case 0xD7: process_Temperature(wmr_data); break;
				case 0xD9: process_Status(wmr_data);      break;
			}
		}
	},
	
	// CRC CHECK
	check_CRC: function(wmr_data) {
		
		// 1st byte of wmr_data contains length
		
		var len = wmr_data[2],
			CRC = 0,
			pkt_CRC = Convert.ToUInt16((wmr_data[len] * 256) + wmr_data[len - 1]);
			
		for (byte i = 1; i <= (wmr_data[2]-2); i++) {
			CRC += wmr_data[i];
		}
		
		return ((pkt_CRC + histTimeFix) == CRC);
	},
	
	// CLEAR THE PACKET COLLECTOR
	rcv_dataClear: function() {
		Array.Clear(rcv_data, 0, rcv_data.Length);  // Array.Clear(source , sourecindex, len)
	},
	
	// FIX PACKET TIMESTAMP
	fix_pkt_timestamp: function(wmr_data) {
	
		if (wmr_data[1] == 0xD9) return;  // D9 packet does not have a timestamp

		// Get packet timestamp and correct it's time
		DateTime wmr_time = new DateTime( wmr_data[7] + 2000,
			wmr_data[6],
			wmr_data[5],
			wmr_data[4],
			wmr_data[3],
			0
		);
		
		wmr_time = wmr_time.AddMinutes((long)wmr_time_fix); // apply the time correction

		// fix packet timestamp
		wmr_data[3] = Convert.ToByte(wmr_time.Minute);
		wmr_data[4] = Convert.ToByte(wmr_time.Hour);
		wmr_data[5] = Convert.ToByte(wmr_time.Day);
		wmr_data[6] = Convert.ToByte(wmr_time.Month);
		wmr_data[7] = Convert.ToByte(wmr_time.Year-2000);
	},
	
	process_History: function(wmr_data) {},
	process_Wind: function(wmr_data) {},
	process_Rain: function(wmr_data) {},
	process_UVI: function(wmr_data) {},
	process_Pressur: function(wmr_data) {},
	process_Temperature: function(wmr_data) {},
	process_Status: function(wmr_data) {}
});