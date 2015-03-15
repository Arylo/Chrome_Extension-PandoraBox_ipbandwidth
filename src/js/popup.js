'use strict';
var isLogin = false,
	isGetting = false;
var oldDate = 0, newDate,
	content = [];
var url = "http://%ip%/cgi-bin/luci/",
	pathname = "bandwidth/sys/ipbandwidth";
var keys = ["ip", "sdown", "sup"];
var second = 1.2;
window.onload = function () {
    var routeIp = window.localStorage.getItem('routeIp');
    if (!routeIp) {
    	document.getElementById("frm_loading").style.display = "none";
        document.getElementById("frm_login").style.display = "block";
        isLogin = false;
    } else {
		url = url.replace("%ip%", routeIp);
    	CheckPandorabox();
    }
    setInterval(function () {
    	if (!isLogin || isGetting) return;
    	isGetting = true;
    	$.ajax({
			url: "http://" + window.localStorage.getItem('routeIp') +
				"/cgi-bin/luci/bandwidth/sys/ipbandwidth",
			success: function (data) {
				oldDate = newDate;
				newDate = data.date;
				data.data.forEach (function (item) {
					var _data = item.split(" "),
						_obj = {};
					_obj.ip = _data[0];
					_obj.mac = _data[1];
					_obj.down = _data[2] / 1024; // Bype -> KB
					_obj.up = _data[3] / 1024; // Bype -> KB
					if (content[_obj.mac]) {
						content[_obj.mac].ip = _obj.ip;
						content[_obj.mac].sdown =
							(_obj.down - content[_obj.mac].down) / (newDate - oldDate);
						content[_obj.mac].sup =
							(_obj.up - content[_obj.mac].up) / (newDate - oldDate);
						content[_obj.mac].down = _obj.down;
						content[_obj.mac].up = _obj.up;
					} else {
						_obj.sdown = _obj.sup = 0;
						content[_obj.mac] = _obj;
					}
					_data = _obj = null;
				});
				injectTable(document.getElementsByTagName("tbody")[0], content);
				isGetting = false;
			},
			error: function () {
				isGetting = false;
			}
		});
    }, second * 1000);
}
document.getElementById("input_ok").onclick = function () {
	var ip = document.getElementById("input_ip").value;
	if (!ip.length || ip.length == 0) return;
	// @TODO ip判断
	url = url.replace("%ip%", ip);
	document.getElementById("frm_loading").style.display = "block";
	document.getElementById("frm_login").style.display = "none";
	CheckPandorabox();
};
document.getElementById("btn_logout").onclick = function () {
	document.getElementById("input_ip").value = window.localStorage.getItem('routeIp');
	document.getElementById("frm_login").style.display = "block";
	document.getElementById("frm_bandwidth").style.display = "none";
	window.localStorage.setItem('routeIp', "");
	isLogin = false;
};
var CheckPandorabox = function () {
	$.ajax({
		url: url,
		success: function (data) {
			CheckMoulde(url);
		},
		error: function () {
			document.getElementById("frm_login").style.display = "block";
			document.getElementById("frm_loading").style.display = "none";
		}
	});
};
var CheckMoulde = function () {
	$.ajax({
		url: url + pathname,
		success: function (data) {
			window.localStorage.setItem('routeIp', $("#input_ip")[0].value);
			document.getElementById("frm_bandwidth").style.display = "block";
			document.getElementById("frm_loading").style.display = "none";
			oldDate = newDate = data.date;
			data.data.forEach (function (item) {
				var _data = item.split(" "),
					_obj = {};
				_obj.ip = _data[0];
				_obj.mac = _data[1];
				_obj.down = _data[2] / 1024; // Bype -> KB
				_obj.up = _data[3] / 1024; // Bype -> KB
				_obj.sdown = _obj.sup = 0;
			});
        	isLogin = true;
		},
		error: function () {
			document.getElementById("frm_login").style.display = "block";
			document.getElementById("frm_loading").style.display = "none";
		}
	});
};
var transfor = function (value) {
	var _value = "";
	var type = value>1024576? 'GB': (value>1024? 'MB': 'KB');
	// KB -> XB
	switch (type) {
		case 'KB':
			_value = value;
			break;
		case 'MB':
			_value = (value >>> 6) / 16;
			break;
		case 'GB':
			_value = (value >>> 16) / 16;
			break;
	}
	_value = _value.toFixed(2);
	return _value + " " + type;
};
var trs = null;
var injectTable = function (table, data) {
	if (!table) table = document;
	if (!trs || table.getElementsByTagName("tr").length != trs.length)
		trs = $("tr", table);
	for (var key in data) {
		var tr, mac = data[key].mac.replace(/\W/g, "");
		// Get tr item
		if(trs.hasClass("table-item-" + mac)) {
			tr = document.getElementsByClassName("table-item-" + mac)[0];
		} else {
			tr = document.createElement("tr");
			tr.className = "table-item table-item-" + mac;
			for (var i = 0; i < keys.length; i++) {
				var td = document.createElement("td");
				tr.appendChild(td);
			};
			table.appendChild(tr);
		}
		var tds = tr.getElementsByTagName("td");
		for (var i = 0; i < keys.length; i++) {
			var value = i > 0 ? transfor(data[key][keys[i]]) + "/s" : data[key][keys[i]];
			tds[i].innerHTML = value;
		};
		tr = tds = mac = null;
	}
}
