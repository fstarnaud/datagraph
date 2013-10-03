define(["dojo/dom", "dojo/_base/declare", "dojo/_base/lang", "dojo/request/script", "dojo/domReady!"],
function(dom, declare, lang, script) {
	return declare(null, {
		hostURL : null,
		constructor: function(args) {
			lang.mixin(this, args);
		},
		getServerData: function(rest_path, then_function, query_obj) {
			var data = null;
			wholeURL = this.hostURL + rest_path;
			script.get(wholeURL, {
				jsonp:"callback",
				query:query_obj
			}).then(function(data) {
				console.log("request to "+wholeURL+" returned");
				then_function(data);
			});
			return data;
		}
	})
})