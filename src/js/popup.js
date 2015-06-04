'use strict';

(function (global) {
	var isLogin = false;
	var version,
		version_num;
	var routeIp,
		oldDate = 0, newDate = 0,
		second = 1.2,
		content = [];
	var url = "http://%ip%/cgi-bin/luci/",
		pathname = "bandwidth/sys/ipbandwidth",
		_url;
	var trTpl = null,
		_trTpl = null;
	var checkOpenwrt = function (ipaddr) {
		if (ipaddr)
			_url = url.replace("%ip%", ipaddr);
		else
			return false;
		$.ajax({
			url: _url,
			success: function (data) {
				checkModule(ipaddr);
			},
			error: function () {
				$("#frm_login")[0].style.display = "block";
				$("#frm_loading")[0].style.display = "none";
				isLogin = false;
			}
		});
	};
	var checkModule = function (ipaddr) {
		if (ipaddr)
			_url = url.replace("%ip%", ipaddr) + pathname;
		else
			return false;
		$.ajax({
			url: _url,
			success: function (data) {
				window.localStorage.setItem('routeIp', ipaddr);
				$("#frm_bandwidth")[0].style.display = "block";
				$("#frm_loading")[0].style.display = "none";

				analysisData(data);

				changeTable();
				isLogin = true;
			},
			error: function () {
				$("#frm_login")[0].style.display = "block";
				$("#frm_loading")[0].style.display = "none";
			}
		});
	};
	var analysisData = function (data) {
		if (data.module_version)
			version = data.module_version;
		if (data.module_version_num)
			version_num = data.module_version_num;
		var date
		if (version_num) {
			date = data.content.date
		} else {
			date = data.date
		}
		if (date) {
			if (oldDate === 0) {
				oldDate = newDate = date;
			} else if (newDate == date) {
				return;
			} else {
				oldDate = newDate;
				newDate = date;
			}
		}
		var arr = [];
		if (version_num) {
			arr = data.content.data;
		} else {
			data.data.forEach (function (item) {
				var _data = item.split(" "),
					_obj = {};
				_obj.ip = _data[0];
				_obj.mac = _data[1];
				_obj.download = _data[2];
				_obj.upload = _data[3];

				arr[arr.length] = _obj;
			});
		}
		arr.forEach (function (item) {
			var _obj = item;
			if (newDate < oldDate)
				return;
			if (content[_obj.mac]) {
				var obj = content[_obj.mac];
				// Old IP
				if (obj.ip == _obj.ip &&
					obj.download == _obj.download &&
					obj.upload == _obj.upload) {
					obj.sdown = 0;
					obj.sup = 0;
					return;
				}
				obj.ip = _obj.ip;
				obj.sdown = (_obj.download - obj.download) / (newDate - oldDate);
				obj.download = _obj.download;
				obj.sup = (_obj.upload - obj.upload) / (newDate - oldDate);
				obj.upload = _obj.upload;
			} else {
				// New IP
				_obj.sdown = _obj.sup = "Loading...";
				content[_obj.mac] = _obj;
			}
		});
	};
	var changeTable = function () {
		var arr = content;
		var table = $("tbody")[0];
		var obj, tr, tds;
		for (var key in arr) {
			obj = arr[key];
			tr = document.getElementById("ipbandwidth-" + obj.mac.replace(/:/g, ""));
			if (tr) {
				// Tr is Exist
				tds = $("td", tr);
				tds[0].innerHTML = obj.ip;
				tds[1].innerHTML = transfor(obj.sdown) + "/s";
				tds[2].innerHTML = transfor(obj.sup) + "/s";
			} else {
				// Tr isnot Exist
				_trTpl = trTpl.cloneNode(true);
				tr = _trTpl.childNodes[0];
				tr.id = "ipbandwidth-" + obj.mac.replace(/:/g, "");
				tds = $("td", tr);
				tds[0].innerHTML = obj.ip;
				tds[1].innerHTML = obj.sdown;
				tds[2].innerHTML = obj.sup;
				table.appendChild(_trTpl);
			}
		}
	};
	if (!global.changeTable) global.changeTable = changeTable;
	var transfor = function (value) {
		var _value = 0;
		if (value == "Loading...")
			_value = 0;
		else
			_value = Number(value);
		var type = "B";
		if (value > 1073741824)
			type = "GB"
		else if (value > 1024576)
			type = "MB";
		else if (value > 1024)
			type = "KB";
		else
			type = "B";
		// KB -> XB
		switch (type) {
			case "B":
				_value = value;
				break;
			case 'KB':
				_value = value / 1024;
				break;
			case 'MB':
				_value = value / 1024576;
				break;
			case 'GB':
				_value = value / 1073741824;
				break;
		}
		_value = _value.toFixed(2);
		return _value + " " + type;
	};
	// onclick
	$("#input_ok")[0].onclick = function () {
		var ipaddr = $("#input_ip")[0].value;
		if (!ipaddr.length || ipaddr.length == 0) return;
		if (/^\d+\.\d+\.\d+\.\d+$/.test(ipaddr)) {
			var points = ipaddr.split(".");
			points.forEach(function (num) {
				if (num < 0 || num > 255)
					return false;
			});
		} else
			return false;

		$("#frm_loading")[0].style.display = "block";
		$("#frm_login")[0].style.display = "none";
		checkOpenwrt(ipaddr);
	};
	$("#btn_logout")[0].onclick = function () {
		$("#frm_login")[0].style.display = "block";
		$("#frm_bandwidth")[0].style.display = "none";
		$("#input_ip")[0].value = window.localStorage.getItem('routeIp');
		window.localStorage.setItem('routeIp', "");
		content = [];
		isLogin = false;
	};

	// Start
	routeIp = window.localStorage.getItem("routeIp");
	trTpl = document.createDocumentFragment();
	trTpl.appendChild($("tbody tr")[0]);
	if (routeIp) {
		checkOpenwrt(routeIp);
	} else {
		$("#frm_loading")[0].style.display = "none";
		$("#frm_login")[0].style.display = "block";
		isLogin = false;
	}

	setInterval(function () {
		if (!isLogin) return;
		var _url,
			ipaddr = window.localStorage.getItem("routeIp");
		_url = url.replace("%ip%", ipaddr) + pathname;
		$.ajax({
			url: _url,
			success: function (data) {
				analysisData(data);
				changeTable();
			},
			error: function () {
			}
		});
	}, second * 1000);
})(typeof window !== undefined? window: this);
