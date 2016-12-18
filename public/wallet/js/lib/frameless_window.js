var gui = require("nw.gui");

// Get the current window
var win = gui.Window.get();

// Extend application menu for Mac OS
if (process.platform == "darwin") {
	var menu = new gui.Menu({type: "menubar"});
	menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
	gui.Window.get().menu = menu;
}

window.onload = function() {
    console.log("Starting Node...");

	var count = 0;
	function timeout() {
		setTimeout(function () {
			count += 1;
			console.log('CHECKED RPC FOR: ' + count);
			check_rpc_connection();
			if (count <= 29) {
				timeout();
			} else {
				console.log ('RPC CONNECTED!');
				setTimeout(function () { window.location.replace("http://127.0.0.1:8181"); }, 8000);
			}
		}, 3000);
	}
	
	timeout();
	
	function check_rpc_connection() {
		var coin=require("./lib/coinapi");
		coin.getinfo(function(err,result) {
			if(err) {
				console.log('ERROR CONNECTING RPC');
			}
			else {
				console.log('RPC CONNECTED!');
				count = 30;
			}
		});
	}

	updateContentStyle();
	gui.Window.get().show();
};

win.on('close', function() {
	this.hide(); // Pretend to be closed already
	console.log("Closing app...");
	this.close(true);
});

// OBSOLETE Since we do not start the wallet! Left for posterity.
// Start Process by passing executable and its attribute.
function ExecuteProcess(prcs, atrbs) {
	var spawn = require('child_process').spawn,
	coinExec = spawn(prcs, [atrbs]);
	coinExec.stdout.on('data', function (data) {
		console.log('stdout: ' + data);
	});

	coinExec.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
	});

	coinExec.on('close', function (code) {
		console.log('child process exited with code ' + code);
	});
}
