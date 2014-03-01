// define observable store-related utility functions
define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array",
	"dojo/store/Observable","dojo/store/Memory","dijit/registry",
	"LeagueScheduler/baseinfoSingleton",
	"dojo/domReady!"],
	function(declare, lang, arrayUtil, Observable, Memory, registry, baseinfoSingleton) {
		var constant = {
			submenu_list:[{id:'div_id', db_type:'rrdb', name:"dbcollection_submenu"},
				{id:'tourndiv_id', db_type:'tourndb',
					name:"tourndbcollection_submenu"},
				{id:'field_id', db_type:'fielddb', name:"fielddb_submenu"},
				{id:'sched_id', db_type:'rrdb', name:"scheddbcollection_submenu"},
				{id:'newsched_id', db_type:'rrdb', name:""}],
			delsubmenu_list:[{id:'div_id',
				db_type:'rrdb', name:"deldbcollection_submenu",
				server_path:"delete_dbcol/"},
				{id:'tourndiv_id',
				db_type:'tourndb', name:"deltourndbcollection_submenu",
				server_path:"delete_tourndbcol/"},
				{id:'field_id', db_type:'fielddb', name:"delfielddb_submenu",
				server_path:"delete_fieldcol/"}]
		};
		return declare(null, {
			dbselect_store:null, schedutil_obj:null, uistackmgr:null,
			server_interface:null,
			constructor: function(args) {
				lang.mixin(this, args);
				// idProperty not assigned as we are using an 'id' field
				this.dbselect_store = new Observable(new Memory({data:new Array(),
					idProperty:'name'}));
			},
			createdb_store: function(db_list, db_type) {
				/* create store for db name labels which are used for select dropdowns
				follow observable store model followed by
				https://www.sitepen.com/blog/2011/02/15/dojo-object-stores/
				http://dojotoolkit.org/reference-guide/1.9/dojo/store/Observable.html#dojo-store-observable
				Note we can't tie the store directly to select since we are
				using dropdown->menuitem instead of select
				Assume db_list is a list of objects {name:, config_status:}
				that is returned from server */
				arrayUtil.forEach(db_list, function(item, index) {
					this.dbselect_store.add({name:item.name+'_'+db_type, label:item.name, db_type:db_type, config_status:item.config_status});
				}, this);
				// ref http://dojotoolkit.org/reference-guide/1.9/dojo/store/Observable.html
				// http://www.sitepen.com/blog/2011/02/15/dojo-object-stores/
				var dbtype_result = this.dbselect_store.query({db_type:db_type});
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
							object);
						if (newsched_obj && newsched_obj.selectexists_flag) {
							newsched_obj.addto_select(db_type, object.label, insertIndex);
						}
					}
				}));
			},
			nodupdb_validate: function(colname, id) {
				var match_obj = this.getmatch_obj(constant.submenu_list, 'id', id);
				var db_type = match_obj.db_type;
				return this.dbselect_store.query({label:colname,
					db_type:db_type}).total == 0;
			},
			addtodb_store: function(colname, id, status_flag) {
				var match_obj = this.getmatch_obj(constant.submenu_list, 'id', id);
				var db_type = match_obj.db_type;
				var query_obj = {name:colname+'_'+db_type, label:colname, db_type:db_type};
				result_list = this.dbselect_store.query(query_obj);
				if (result_list.total == 0) {
					query_obj.config_status = status_flag; // add status field
					this.dbselect_store.add(query_obj);
				} else {
					var match_obj = result_list[0];
					match_obj.config_status = status_flag;
					this.dbselect_store.put(match_obj);
				}
			},
			getfromdb_store_value:function(db_type, key, config_status) {
				var query_obj = (typeof config_status === "undefined") ?
					{db_type:db_type}:{db_type:db_type,config_status:config_status}
				var dbtype_result = this.dbselect_store.query(query_obj)
					.map(function(item){
						return item[key];
					});
				return dbtype_result;
			},
			removefromdb_store: function(item, db_type) {
				// confirm format of id field
				this.dbselect_store.remove(item+'_'+db_type);
			},
			create_menu: function(id, info_obj, delflag) {
				// get submenu names based on db_type
				var match_obj = this.getmatch_obj(constant.submenu_list,
					'id', id);
				var submenu_name = match_obj.name;
				var db_type = match_obj.db_type;
				// create respective db menu
				var db_list = this.getfromdb_store_value(db_type, 'label');
				this.schedutil_obj.generateDB_smenu(db_list,
					submenu_name, this.uistackmgr,
					this.uistackmgr.check_getServerDBInfo,
					{db_type:db_type, info_obj:info_obj, storeutil_obj:this});
				if (delflag) {
					match_obj = this.getmatch_obj(constant.delsubmenu_list,
						'id', id);
					// set up menus for delete if required
					submenu_name = match_obj.name;
					db_type = match_obj.db_type;
					var server_path = match_obj.server_path;
					// create respective del db menu
					var delsmenu_reg = registry.byId(submenu_name);
					this.schedutil_obj.generateDBCollection_smenu(delsmenu_reg,
						db_list, this, this.delete_dbcollection,
						{db_type:db_type, server_path:server_path,
							storeutil_obj:this});
				}
			},
			getmatch_obj: function(list, key, value) {
				var match_list = arrayUtil.filter(list,
					function(item) {
						return item[key] == value;
					});
				return match_list[0];
			},
			delete_dbcollection: function(options_obj) {
				var item = options_obj.item;
				var server_path = options_obj.server_path;
				this.removefromdb_store(item, options_obj.db_type);
				var match_obj = this.getmatch_obj(constant.delsubmenu_list, 'db_type',
					options_obj.db_type);
				var idproperty = match_obj.id;
				this.uistackmgr.reset_cpane(idproperty);
				/*
				this.uistackmgr.switch_pstackcpane(
					{idproperty:idproperty, p_stage:"preconfig",
					entry_pt:"fromddel"});
				this.uistackmgr.switch_gstackcpane(idproperty, true, null) */
				this.server_interface.getServerData(server_path+item,
					this.server_interface.server_ack);
			},
		})
	}
);
