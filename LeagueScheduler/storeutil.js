// define observable store-related utility functions
define(["dojo/dom", "dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array",
	"dojo/store/Observable","dojo/store/Memory","dijit/registry",
	"dijit/DropDownMenu", "dijit/PopupMenuItem", "dijit/MenuItem",
	"LeagueScheduler/baseinfoSingleton","put-selector/put",
	"dojo/domReady!"],
	function(dom, declare, lang, arrayUtil, Observable, Memory, registry, DropDownMenu, PopupMenuItem, MenuItem,
		baseinfoSingleton, put) {
		var constant = {
			idtopmenu_list:[
				{id:'div_id', label_str:"Round Robin Parameters"},
				{id:'tourndiv_id', label_str:"Tournament Parameters"},
				{id:'field_id', label_str:"Specify Fields"},
				{id:'newsched_id', label_str:"Generate Schedule"},
				{id:'pref_id', label_str:"Scheduling Preferences"}
			],
			initmenu_list:[
				{id:'div_id', label_str:"Create Division Info"},
				{id:'tourndiv_id', label_str:"Create Division Info"},
				{id:'field_id', label_str:"Create Field List"},
				{id:'newsched_id', label_str:"Create Schedule Parameters"},
				{id:'pref_id', label_str:"Create Preference List"}
			],
			editmenu_list:[
				{id:'div_id', db_type:'rrdb', label_str:"Edit Division Info"},
				{id:'tourndiv_id', db_type:'tourndb',
					label_str:"Edit Division Info"},
				{id:'field_id', db_type:'fielddb', label_str:"Edit Field List"},
				{id:'newsched_id', db_type:'newscheddb',
					label_str:"Edit Schedule Parameters"},
				{id:'pref_id', db_type:'prefdb', label_str:"Edit Preference List"}
			],
			delmenu_list:[
				{id:'div_id', db_type:'rrdb', label_str:"Delete Division Info"},
				{id:'tourndiv_id', db_type:'tourndb',
					label_str:"Delete Division Info"},
				{id:'field_id', db_type:'fielddb',
					label_str:"Delete Field List"},
				{id:'newsched_id', db_type:'newscheddb',
					label_str:"Delete Schedule Parameters"},
				{id:'pref_id', db_type:'prefdb', label_str:"Delete Preference List"}
			],
			delserver_path:"delete_dbcol/"
		};
		return declare(null, {
			dbselect_store:null, schedutil_obj:null, uistackmgr:null,
			server_interface:null, dbstore_list:null,
			constructor: function(args) {
				lang.mixin(this, args);
				this.dbstore_list = new Array();
				// idProperty not assigned as we are using an 'id' field
				//this.dbselect_store = new Observable(new Memory({data:new Array(),
				//	idProperty:'name'}));
			},
			createdb_store: function(db_list, db_type) {
				/* create store for db name labels which are used for select dropdowns
				follow observable store model followed by
				https://www.sitepen.com/blog/2011/02/15/dojo-object-stores/
				http://dojotoolkit.org/reference-guide/1.9/dojo/store/Observable.html#dojo-store-observable
				Note we can't tie the store directly to select since we are
				using dropdown->menuitem instead of select
				Assume db_list is a list of objects {name:, config_status:}
				that is returned from server
				Note instead of having one large store that handles all db_types,
				create a list of stores, where each store is specific to a db_type */
				var dbselect_store = new Observable(new Memory({data:new Array(),
					idProperty:'name'}));
				// add initial entry
				arrayUtil.forEach(db_list, function(item, index) {
					dbselect_store.add({name:item.name,
						config_status:item.config_status});
				});
				this.dbstore_list.push({db_type:db_type,
					dbselect_store:dbselect_store});
				// ref http://dojotoolkit.org/reference-guide/1.9/dojo/store/Observable.html
				// http://www.sitepen.com/blog/2011/02/15/dojo-object-stores/
				var dbtype_result = dbselect_store.query();
				dbtype_result.observe(lang.hitch(this, function(object, removeIndex, insertIndex) {
					var newsched_obj = baseinfoSingleton.get_obj('newsched_id');
					if (removeIndex > -1) {
						// note removing by index only may not be reliable
						// other option is to pass in the object and then search
						// the reg children to find a math on the label
						this.schedutil_obj.regenDelDBCollection_smenu(removeIndex, db_type);
						if (newsched_obj && newsched_obj.selectexists_flag) {
							newsched_obj.removefrom_select(db_type, removeIndex);
						}
					}
					if (insertIndex > -1) {
						this.schedutil_obj.regenAddDBCollection_smenu(insertIndex,
							object, db_type);
						if (newsched_obj && newsched_obj.selectexists_flag) {
							newsched_obj.addto_select(db_type, object.name, insertIndex);
						}
					}
				}));
			},
			nodupdb_validate: function(colname, id) {
				var match_obj = this.getmatch_obj(constant.editmenu_list, 'id', id);
				var db_type = match_obj.db_type;
				var dbselect_store = this.getselect_store(db_type);
				if (dbselect_store) {
					return dbselect_store.query({name:colname,
						config_status:1}).total == 0;
				} else
					return null;
			},
			// get store that matches db_type from the list of stores
			getselect_store: function(db_type) {
				var match_list = arrayUtil.filter(this.dbstore_list,
					function(item) {
						return item.db_type == db_type;
					}
				);
				if (match_list.length > 0) {
					return match_list[0].dbselect_store;
				} else
					return null;
			},
			// add entry to dbselect store
			addtodb_store: function(colname, id, config_status) {
				var match_obj = this.getmatch_obj(constant.editmenu_list, 'id', id);
				var db_type = match_obj.db_type;
				var dbselect_store = this.getselect_store(db_type);
				var query_obj = {name:colname};
				var result_list = dbselect_store.query(query_obj);
				if (result_list.total == 0) {
					query_obj.config_status = config_status; // add status field
					dbselect_store.add(query_obj);
				} else {
					var match_obj = result_list[0];
					match_obj.config_status = config_status;
					dbselect_store.put(match_obj);
				}
			},
			getfromdb_store_value:function(db_type, key, config_status) {
				var dbselect_store = this.getselect_store(db_type);
				var query_obj = (typeof config_status === "undefined") ?
					{}:{config_status:config_status};
				var dbtype_result = dbselect_store.query(query_obj)
					.map(function(item){
						return item[key];
					});
				return dbtype_result;
			},
			removefromdb_store: function(item, db_type) {
				// confirm format of id field
				var dbselect_store = this.getselect_store(db_type);
				dbselect_store.remove(item);
			},
			create_divmenu: function(args_obj) {
				// programmatic instantiation of submenus for divinfo and
				// tourndivinfo menu info
				var parent_ddown_reg = args_obj.parent_ddown_reg;
				var args_list = args_obj.args_list;
				var div_ddown_reg = new DropDownMenu();
				var div_popup_reg = new PopupMenuItem({
					label:"Division Info",
					popup:div_ddown_reg
				})
				parent_ddown_reg.addChild(div_popup_reg);
				arrayUtil.forEach(args_list, function(item) {
					this.create_menu(item.id, item.info_obj, true, div_ddown_reg)
				}, this)
			},
			create_menu: function(id, info_obj, delflag, ddown_reg) {
				var match_obj = this.getmatch_obj(constant.idtopmenu_list,
					'id', id);
				var idtop_ddown_reg = new DropDownMenu();
				var idtop_popup_reg = new PopupMenuItem({
					label:match_obj.label_str,
					popup:idtop_ddown_reg
				})
				ddown_reg.addChild(idtop_popup_reg);
				// get create new info menu items
				match_obj = this.getmatch_obj(constant.initmenu_list,
					'id', id);
				var menu_reg = new MenuItem({
					label:match_obj.label_str,
					onClick:lang.hitch(this.uistackmgr, this.uistackmgr.check_initialize, info_obj)
				})
				idtop_ddown_reg.addChild(menu_reg);
				// get submenu names based on db_type
				match_obj = this.getmatch_obj(constant.editmenu_list,
					'id', id);
				var ddownmenu_reg = new DropDownMenu();
				var popup_reg = new PopupMenuItem({
					label:match_obj.label_str,
					popup:ddownmenu_reg
				})
				idtop_ddown_reg.addChild(popup_reg);
				var db_type = match_obj.db_type;
				// create respective db menu
				var db_list = this.getfromdb_store_value(db_type, 'name');
				this.schedutil_obj.generateDB_smenu(db_list, ddownmenu_reg,
					this.uistackmgr, this.uistackmgr.check_getServerDBInfo,
					{db_type:db_type, info_obj:info_obj, storeutil_obj:this});
				if (delflag) {
					match_obj = this.getmatch_obj(constant.delmenu_list,
						'id', id);
					// set up menus for delete if required
					// ref http://dojotoolkit.org/reference-guide/1.9/dijit/form/DropDownButton.html#dijit-form-dropdownbutton
					// http://dojotoolkit.org/reference-guide/1.9/dijit/Menu.html
					// NOTE: example in ref above shows a 'popup' property, but the
					// API spec for dijit/popupmenuitem does NOT have that property
					//idtop_ddown_reg = registry.byId(match_obj.parent_id)
					ddownmenu_reg = new DropDownMenu();
					popup_reg = new PopupMenuItem({
						label:match_obj.label_str,
						popup:ddownmenu_reg
					})
					idtop_ddown_reg.addChild(popup_reg);
					db_type = match_obj.db_type;
					// create respective del db menu
					this.schedutil_obj.generateDBCollection_smenu(ddownmenu_reg,
						db_list, this, this.delete_dbcollection,
						{db_type:db_type, storeutil_obj:this});
				}
			},
			getmatch_obj: function(list, key, value) {
				var match_list = arrayUtil.filter(list,
					function(item) {
						return item[key] == value;
					});
				return match_list[0];
			},
			getLabelDropDown_list: function(args_obj) {
				var db_type = args_obj.db_type;
				var label_str = args_obj.label_str;
				var config_status = args_obj.config_status;
				var init_colname = args_obj.init_colname;
				// get list of db's from store that have been completed
				var label_list = this.getfromdb_store_value(db_type,
					'name', config_status);
				var select_flag = init_colname?false:true;
				// select_flag for the first entry is false if there is an init_colname
				var option_list = [{label:label_str, value:"",
					selected:select_flag}];
				arrayUtil.forEach(label_list, function(item, index) {
					select_flag = (init_colname && init_colname == item)
						? true:false;
					option_list.push({label:item, value:item, selected:select_flag});
				});
				return option_list;
			},
			delete_dbcollection: function(options_obj) {
				var item = options_obj.item;
				var server_path = constant.delserver_path;
				var db_type = options_obj.db_type
				this.removefromdb_store(item, db_type);
				var match_obj = this.getmatch_obj(constant.delmenu_list,
					'db_type', db_type);
				var idproperty = match_obj.id;
				this.uistackmgr.reset_cpane(idproperty);
				/*
				this.uistackmgr.switch_pstackcpane(
					{idproperty:idproperty, p_stage:"preconfig",
					entry_pt:"fromddel"});
				this.uistackmgr.switch_gstackcpane(idproperty, true, null) */
				this.server_interface.getServerData(server_path+db_type+'/'+item,
					this.server_interface.server_ack);
			},
		})
	}
);
