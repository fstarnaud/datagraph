/* look at examples in http://dojotoolkit.org/documentation/tutorials/1.9/modules/
for loadable module design and syntax  also ref
http://dojotoolkit.org/documentation/tutorials/1.9/declare/ and
http://dojotoolkit.org/reference-guide/1.9/dojo/_base/declare.html for class constructor syntax
http://dojotoolkit.org/documentation/tutorials/1.9/augmenting_objects/
				// ref http://stackoverflow.com/questions/13932225/dojo-and-dynamically-added-options-to-dijit-form-select
				// for closure http://stackoverflow.com/questions/4726611/function-used-from-within-javascript-dojo-closure-using-this-notation-is-undef
				// without 3rd argument for  forEach, scope is global
				// http://stackoverflow.com/questions/148901/is-there-a-better-way-to-do-optional-function-parameters-in-javascript
*/
define(["dojo/dom", "dojo/dom-construct", "dojo/_base/declare",
	"dojo/_base/lang", "dojo/dom-class", "dojo/date",
	"dojo/_base/array","dijit/registry", "dijit/MenuItem",
	"scheduler_front/divinfo", "scheduler_front/fieldinfo", "dojo/domReady!"],
	function(dom, domConstruct, declare, lang, domClass, date,
		arrayUtil,
		registry, MenuItem, DivInfo, FieldInfo){
		var tournCalendarMapObj = {1:'Oct 26', 2:'Oct 27', 3:'Nov 2', 4:'Nov 3', 5:'Nov 9', 6:'Nov 10'};
		//var status1_dom = dom.byId("dbstatus1_txt");
		return declare(null, {
			server_interface:null,
			rrdbmenureg_list:null, fielddbmenureg_list:null, tdbmenureg_list:null,
			nsdbmenureg_list:null, prefdbmenureg_list:null, teamdbmenureg_list:null,
			conflictdbmenureg_list:null,
			constructor: function(args) {
				//declare.safeMixin(this, args);
				// augmenting object tutorial referenced above says lang.mixin is a better choise
				// than declare.safeMixin
				lang.mixin(this, args);
				// round robin menu register list
				this.rrdbmenureg_list = new Array();
				// tournament menu register list
				this.tdbmenureg_list = new Array();
				// field menu register list
				this.fielddbmenureg_list = new Array();
				// new sched/generate menu list
				this.nsdbmenureg_list = new Array();
				// preference menu list
				this.prefdbmenureg_list = new Array();
				// team menu list
				this.teamdbmenureg_list = new Array();
				// conflict nmenu list
				this.conflictdbmenureg_list = new Array();
			},
			// following function is robust whether nodelist is a n Array
			// or a scalar dom node
			updateDBstatus_nodelist: function(dbstatus, nodelist) {
				// ref http://stackoverflow.com/questions/767486/how-do-you-check-if-a-variable-is-an-array-in-javascript
				if (nodelist instanceof Array) {
					arrayUtil.forEach(nodelist, function(item) {
						this.updateDBstatus_node(dbstatus, item);
					}, this)
				} else {
					this.updateDBstatus_node(dbstatus, nodelist);
				}
			},
			updateDBstatus_node: function(dbstatus, node) {
				if (dbstatus) {
					node.innerHTML = "Schedule in database, Ready.  See generated tabs above to see various views into schedule"
					node.style.color = 'green';
				} else {
					node.innerHTML = "Schedule Computing, Not Ready";
					node.style.color = 'red';
				}
			},
			// review usage of hitch to provide context to event handlers
			// http://dojotoolkit.org/reference-guide/1.9/dojo/_base/lang.html#dojo-base-lang
			generateDBCollection_smenu: function(submenu_reg, submenu_list, onclick_context, onclick_func, options_obj) {
				var options_obj = options_obj || {};
				arrayUtil.forEach(submenu_list, function(item, index) {
					// a new copy of options_obj needs to be created before
					// assigning a different item value for each menu entry
					// however lang.clone does not work as objects in options_obj
					// are initiated by calling constructors
					// http://dojotoolkit.org/documentation/tutorials/1.10/augmenting_objects/
					var dupoptions_obj = declare.safeMixin({}, options_obj);
					dupoptions_obj.item = item;
					var smenuitem = new MenuItem({label: item,
						onClick: lang.hitch(onclick_context, onclick_func,
							dupoptions_obj)
					});
    				submenu_reg.addChild(smenuitem);
				});  // context should be function
				// use itemclick on entire menu widget instead of onclicks on
				// individual menuitems
				// ref http://dojotoolkit.org/documentation/tutorials/1.10/menus/
				//submenu_reg.set("onItemClick", lang.hitch(onclick_context, onclick_func, options_obj));
				if (typeof options_obj.db_type !== 'undefined') {
					var dbmenureg_list = this.get_dbmenureg_list(options_obj.db_type);
					// note options_obj does not include item value
					dbmenureg_list.push({reg:submenu_reg,
						context:onclick_context, func:onclick_func,
						options_obj:options_obj});
				}
			},
			regenDelDBCollection_smenu: function(delindex, db_type) {
				var dbmenureg_list = this.get_dbmenureg_list(db_type);
				arrayUtil.forEach(dbmenureg_list, function(dbmenudata) {
					var dbmenureg = dbmenudata.reg;
					dbmenureg.removeChild(delindex);
				});
			},
			regenAddDBCollection_smenu: function(insertIndex, object, db_type) {
				var dbmenureg_list = this.get_dbmenureg_list(db_type);
				var item_name = object.name;
				//var divinfo_obj = new DivInfo({server_interface:this.server_interface, schedutil_obj:this});
				arrayUtil.forEach(dbmenureg_list, function(dbmenudata) {
					var dbmenureg = dbmenudata.reg;
					var options_obj = dbmenudata.options_obj;
					// use safemixin to prevent copying of objects to reinitialize
					// with constructors
					var dupoptions_obj = declare.safeMixin({}, options_obj);
					dupoptions_obj.item = item_name;
					var smenuitem = new MenuItem({label:item_name,
						onClick:lang.hitch(dbmenudata.context, dbmenudata.func,
							dupoptions_obj)});
    				dbmenureg.addChild(smenuitem, insertIndex);
				});
			},
			get_dbmenureg_list: function(db_type) {
				var dbmenureg_list = null;
				if (db_type == 'rrdb')
					dbmenureg_list = this.rrdbmenureg_list;
				else if (db_type == 'tourndb')
					dbmenureg_list = this.tdbmenureg_list;
				else if (db_type == 'fielddb')
					dbmenureg_list = this.fielddbmenureg_list;
				else if (db_type == 'newscheddb')
					dbmenureg_list = this.nsdbmenureg_list;
				else if (db_type == 'prefdb')
					dbmenureg_list = this.prefdbmenureg_list;
				else if (db_type == 'teamdb')
					dbmenureg_list = this.teamdbmenureg_list;
				else if (db_type == 'conflictdb')
					dbmenureg_list = this.conflictdbmenureg_list;
				else {
					dbmenureg_list = [];
					console.log("Error get_dbmenureg_list: Invalid db_type");
				}
				return dbmenureg_list;
			},
			detect_arrayduplicate: function(arry) {
				// detect duplicate elements in array
				// ref http://stackoverflow.com/questions/840781/easiest-way-to-find-duplicate-values-in-a-javascript-array
				var sorted_arry = arry.sort();
				var results = [];
				for (var i = 0; i < arry.length - 1; i++) {
					if (sorted_arry[i + 1] == sorted_arry[i]) {
						results.push(sorted_arry[i]);
					}
				}
				return results;
			},
			range: function(start, stop, step){
				// reference http://stackoverflow.com/questions/8273047/javascript-function-similar-to-python-range
				// similar to python range function
			    if (typeof stop==='undefined'){
			        // one param defined
			        stop = start;
			        start = 0;
			    };
			    if (typeof step==='undefined'){
			        step = 1;
			    };
			    if ((step>0 && start>=stop) || (step<0 && start<=stop)){
			        return [];
			    };
			    var result = [];
			    for (var i=start; step>0 ? i<stop : i>stop; i+=step){
			        result.push(i);
			    };
			    return result;
			},
			intersect: function(array1, array2) {
				//Intersection of two arrays to find common eleemnts
				//http://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript
				// make sure arrays are sorted, as intersection depends on it
				array1.sort(function(a, b){return a-b});
				array2.sort(function(a, b){return a-b});
				var result = [];
				// Don't destroy the original arrays
				var a = array1.slice(0);
				var b = array2.slice(0);
				var aLast = a.length - 1;
				var bLast = b.length - 1;
				while (aLast >= 0 && bLast >= 0) {
					if (a[aLast] > b[bLast] ) {
						a.pop();
						aLast--;
					} else if (a[aLast] < b[bLast] ){
						b.pop();
						bLast--;
					} else /* they're equal */ {
						result.push(a.pop());
						b.pop();
						aLast--;
						bLast--;
					}
				}
				return result;
			},
			getcalendarmap_list: function(args_obj) {
				// get list that maps fieldday_id to calendar date
				// note logic is similar to getcalendarmap_list used in py
				// but the input/output is different as this function combines some
				// of the functionality that is done in modifyserver_data with the
				// py getcalendarmap_list code
				// this function only intended to be called when a new grid is
				// created and not when data is retrieved from server
				var dayweek_list = args_obj.dayweek_list;
				var start_date = args_obj.start_date;
				var totalfielddays = args_obj.tfd;
				var start_time_str = args_obj.start_time_str;
				var end_time_str = args_obj.end_time_str;
				var start_day = start_date.getDay();
				var fielddaymapdate_list = new Array();
				var dayweek_len = dayweek_list.length;
        		var firststart_day = -1;
        		var firststart_dwindex = -1;
        		// find first actual start day by finding the first day from
        		// the dayweek_list that is past the start_date which is
        		// selected from the calendar drop-down.
        		if (!arrayUtil.some(dayweek_list, function(item, index) {
        			// for every iteration tentatively assign the first start
        			// date to the current iteration day of the dayweek_list
        			// if the iteration day is greater than start_day, .some
        			// loop will exit
        			firststart_day = item;
        			// firststart_index corresponds to index in dayweek_list that
        			// maps to first_date
        			firststart_dwindex = index;
        			return item >= start_day;
        		})) {
        			// if the .some exited with a false value, then the first
        			// start day is the first element in the dayweek_list
        			firststart_day = dayweek_list[0]
        			firststart_dwindex = 0;
        		}
        		var firststart_diff = firststart_day - start_day;
        		if (firststart_diff < 0) {
        			// do modulo addition if start_day (0-6 range) is larger than
        			// firststart_day
        			firststart_diff += 7;
        		}
        		var first_date = date.add(start_date, 'day', firststart_diff);
        		// create list that maps fieldday to actual calendar date
        		// Represented with list, with position in list corresponding to
        		// fieldday_id
        		// first create list whose elements are the # days gap with the
        		// previous dayweek element
        		var dwgap_list = new Array();
        		// get the last element, but offset it by 7 (length of week)
        		// do this as the gap calculation for the first element should
        		// be first_gap = first_elem +7 - last_elem
        		//              = first_elem - (last_elem - 7)
        		var prev_elem = dayweek_list[dayweek_len-1]-7;
        		arrayUtil.forEach(dayweek_list, function(item, index) {
        			dwgap_list[index] = item - prev_elem;
        			prev_elem = item;
        		})
        		var next_date = first_date;
        		var next_dwindex = firststart_dwindex;
        		// generate list that maps fieldday_id (represented as position in
        		// list) to calendar date string
        		for (var id = 1; id < totalfielddays+1; id++) {
        			var next_date_str = next_date.toLocaleDateString();
        			fielddaymapdate_list.push({
        				fieldday_id:id,
        				start_time:new Date(next_date_str+' '+start_time_str),
        				end_time: new Date(next_date_str+' '+end_time_str)
        				//date:next_date.toLocaleDateString()
        			});
        			// get the next index into the gap list
        			// if index is length of list, then roll over to 0
        			if (++next_dwindex == dayweek_len)
        				next_dwindex = 0
        			next_date = date.add(next_date, 'day',
        				dwgap_list[next_dwindex]);
        		}
        		return fielddaymapdate_list
			}
		})
	}
);
