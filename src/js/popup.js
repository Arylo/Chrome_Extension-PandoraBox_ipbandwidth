'use strict';

(function () {
	var url = "http://%ip%/cgi-bin/luci/",
		pathname,
		pathname_api = "api/bandwidth/ipbandwidth",
		pathname_old = "bandwidth/sys/ipbandwidth",
		_url;

	var app = angular.module("ipbandwidth", ["ngRoute"], angular.noop);

	app.config(["$routeProvider", function ($routeProvider) {
		$routeProvider
			.when("/", {
				redirectTo: '/loading'
			})
			.when("/loading", {
				templateUrl: "/views/tpl-load.html",
				controller: "LoadCtrl"
			})
			.when("/login", {
				templateUrl: "/views/tpl-login.html",
				controller: "InputCtrl"
			})
			.when("/list", {
				templateUrl: "/views/tpl-show.html",
				controller: "ShowCtrl"
			})
			.otherwise({
				redirectTo: '/loading'
			});
	}]);

	app.service("Data", [function () {
		this.routingTable = {
			"login": {
				"path": "/login"
			},
			"loading": {
				"path": "/loading"
			},
			"list": {
				"path": "/list"
			}
		};
		this.DEBUG = false;
		this.isStart = true;
		this.content = [];
		this.array = [];
		this.oldDate = 0;
		this.newDate = 0;
		this.second = 1.2;
	}]);

	app.service("Fn", ["$location", "Data", function ($location, Data) {
		this.jump = function (key) {
			$location.path(Data.routingTable[key].path);
		};
		this.checkIp = function (ipaddr, _option) {
			var options = {
				ingoreLocal: true,
				ingoreZero: true
			};
			if (_option && typeof(_option) == 'object') {
				for (var i in _option)
					options[i] = _option[i];
			}
			return (function () {
				var reg = /^(\d{1,3}\.){3}\d{1,3}$/;
				if (reg.test(ipaddr)) {
					if (!options.ingoreLocal && ipaddr == "127.0.0.1") return false;
					if (!options.ingoreZero && ipaddr == "0.0.0.0") return false;
					var ipArr = ipaddr.split("."),
						isOutBound = true;
					ipArr.forEach(function (ipp) {
						if (ipp > 255 || ipp < 0)
							isOutBound = false;
					});
					return isOutBound;
				}
				return false;
			})();
		};
		var transfor = this.transfor = function (value) {
			var _value = 0;
			if (/^\d+$/.test(value))
				_value = Number(value);
			else
				_value = 0;
			var type = "B";
			if (value > 1073741824)
				type = "GB";
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
		this.analysisData = function (data) {
			if (data.module_version)
				Data.version = data.module_version;
			if (data.module_version_num)
				Data.version_num = data.module_version_num;
			var date;
			if (Data.version_num) {
				date = data.content.date;
			} else {
				date = data.date;
			}
			if (date) {
				if (Data.oldDate === 0) {
					Data.oldDate = Data.newDate = date;
				} else if (Data.newDate == date) {
					return;
				} else {
					Data.oldDate = Data.newDate;
					Data.newDate = date;
				}
			}
			var arr = [];
			if (Data.version_num) {
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
			// data -> Data.content
			arr.forEach (function (item) {
				var _obj = item;
				if (Data.newDate < Data.oldDate)
					return;
				if (Data.content[_obj.mac]) {
					var obj = Data.content[_obj.mac];
					// Old IP
					if (obj.ip == _obj.ip &&
						obj.download == _obj.download &&
						obj.upload == _obj.upload) {
						obj.sdown = "0.00 B/s";
						obj.sup = "0.00 B/s";
						return;
					}
					obj.ip = _obj.ip;
					obj.sdown = transfor((_obj.download - obj.download) / (Data.newDate - Data.oldDate)) + "/s";
					obj.download = _obj.download;
					obj.sup = transfor((_obj.upload - obj.upload) / (Data.newDate - Data.oldDate)) + "/s";
					obj.upload = _obj.upload;
				} else {
					// New IP
					_obj.sdown = _obj.sup = "Loading...";
					Data.content[_obj.mac] = _obj;
				}
			});
			// data -> Data.array
			Data.array = [];
			var item = null;
			for (var key in Data.content) {
				item = Data.content[key];
				Data.array[Data.array.length] = item;
			}
		};
	}]);

	app.controller("LoadCtrl", ["$scope", "$http", "$location" , "Data", "Fn",
		function ($scope, $http, $location, Data, Fn) {
		if (Data.DEBUG) console.info("LoadCtrl");
		var ipaddr = null;
		var checkPandorabox = function () {
			if (Data.DEBUG) console.info("checkPandorabox");
			_url = url.replace("%ip%", ipaddr);
			if (Data.DEBUG) console.log("checkPandorabox", _url);
			$http.get(_url)
				.success(function () {
					checkApiModule();
				})
				.error(function () {
					Fn.jump("login");
				});
		};
		var checkApiModule = function () {
			if (Data.DEBUG) console.info("checkApiModule");
			_url = url.replace("%ip%", ipaddr) + pathname_api;
			if (Data.DEBUG) console.log("checkApiModule", _url);
			$http.get(_url)
				.success(function (data) {
					Data.mode = "Api Mode";
					Data.url = _url;
					Data.ipaddr = ipaddr;
					Data.pathname = pathname_api;

					window.localStorage.setItem("routeIp", ipaddr);
					Fn.analysisData(data);
					Fn.jump("list");
				})
				.error(function () {
					checkOldModule();
				});
		};
		var checkOldModule = function () {
			if (Data.DEBUG) console.info("checkOldModule");
			_url = url.replace("%ip%", ipaddr) + pathname_old;
			if (Data.DEBUG) console.log("checkOldModule", _url);
			$http.get(_url)
				.success(function (data) {
					Data.mode = "Old Mode";
					Data.url = _url;
					Data.ipaddr = ipaddr;
					Data.pathname = pathname_old;

					window.localStorage.setItem("routeIp", ipaddr);
					Fn.analysisData(data);
					Fn.jump("list");
				})
				.error(function () {
					Fn.jump("login");
				});
		};
		if (Data.isStart) {
			if (window.localStorage.getItem("routeIp") &&
				Fn.checkIp(window.localStorage.getItem("routeIp")))
				ipaddr = window.localStorage.getItem("routeIp");
			else {
				Data.isStart = false;
				Fn.jump("login");
				return;
			}
		} else {
			ipaddr = Data._ipaddr;
		}
		if (ipaddr)
			checkPandorabox();
		else {
			Data.isStart = false;
			Fn.jump("login");
			return;
		}

		Data.isStart = false;
	}]);

	app.controller("InputCtrl", ["$scope", "$location", "Data", "Fn",
		function ($scope, $location, Data, Fn) {
		if (Data.DEBUG) console.info("InputCtrl");
		Data.isStart = false;
		$scope.login = function () {
			if (!Fn.checkIp($scope._ipaddr)) {
				// @TODO Warning
				return;
			}
			Data._ipaddr = $scope._ipaddr;
			Fn.jump("loading");
		};
	}]);

	app.controller("ShowCtrl", ["$scope", "$http", "$timeout", "Data", "Fn",
		function ($scope, $http, $timeout, Data, Fn) {
		if (Data.DEBUG) console.info("ShowCtrl");
		var content = $scope.content = Data.array;
		var timer = null;
		$scope.mode = Data.mode;
		$scope.exit = function () {
			Data.content = [];
			clearInterval(timer);
			window.localStorage.setItem("routeIp", null);
			Fn.jump("login");
		};

		var getData = function () {
			$http.get(Data.url)
				.success (function (data) {
					Fn.analysisData(data);
				})
				.error (function () {

				});
		};

		if (!Data.array || Data.array.length === 0) {
			getData();
		}
		timer = setInterval(function () {
			getData();
		}, Data.second * 1000);
	}]);
})();
