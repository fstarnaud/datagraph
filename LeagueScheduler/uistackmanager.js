/* manage UI content pane structure, especially switching stack container panes */
define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dijit/registry", "dojo/domReady!"],
	function(declare, lang, arrayUtil, registry) {
		var constant = {
			// param stack id's
			pstackcontainer_id:"paramStackContainer_id",
			nfcpane_id:"numfieldcpane_id",
			tcpane_id:"textbtncpane_id",
			ndcpane_id:"numdivcpane_id",
			sdcpane_id:"scheddivcpane_id",
			nscpane_id:"newschedcpane_id",
			sccpane_id:"seasoncalendar_input",
			// grid stack id's
			gstackcontainer_id:"gridContainer_id",
			divcpane_id:"divinfocpane_id",
			schedcpane_id:"schedinfocpane_id",
			fieldcpane_id:"fieldinfocpane_id",
			blankcpane_id:"blankcpane_id"
		};
		return declare(null, {
			pstackcontainer_reg:null, pstackmap_list:null,
			gstackcontainer_reg:null, gstackmap_list:null,
			cpanestate_list:null, updatebtn_widget:null,
			constructor: function(args) {
				lang.mixin(this, args);
				this.pstackcontainer_reg = registry.byId(constant.pstackcontainer_id);
				// define param stack mapping that maps tuple (id_property, config stage)->
				// param content pane
				this.pstackmap_list = new Array();
				this.pstackmap_list.push({id:'field_id', stage:'preconfig',
					pane_id:constant.nfcpane_id});
				this.pstackmap_list.push({id:'field_id', stage:'config',
					pane_id:constant.tcpane_id});
				this.pstackmap_list.push({id:'div_id', stage:'preconfig',
					pane_id:constant.ndcpane_id});
				this.pstackmap_list.push({id:'div_id', stage:'config',
					pane_id:constant.tcpane_id});
				this.pstackmap_list.push({id:'sched_id', stage:'preconfig',
					pane_id:constant.sdcpane_id})
				this.pstackmap_list.push({id:'sched_id', stage:'config',
					pane_id:constant.tcpane_id});
				this.pstackmap_list.push({id:'newsched_id', stage:'preconfig',
					pane_id:constant.nscpane_id});
				this.pstackmap_list.push({id:'newsched_id', stage:'config',
					pane_id:constant.sccpane_id});
				// define mapping object for the grid content pane
				this.gstackcontainer_reg = registry.byId(constant.gstackcontainer_id);
				var id_list = ['newsched_id', 'div_id', 'sched_id',
					'field_id'];
				var cpane_list = [constant.blankcpane_id,
					constant.divcpane_id,
					constant.schedcpane_id,
					constant.fieldcpane_id];
				// gstackmap_list maps from id to corresponding grid name
				this.gstackmap_list = new Array();
				this.cpanestate_list = new Array();
				arrayUtil.forEach(id_list, function(item, index) {
					this.gstackmap_list.push({id:item,
					pane_id:cpane_list[index]});
					this.cpanestate_list.push({id:item,
						p_pane:null, p_stage:null,
						g_pane:constant.blankcpane_id, g_pane_colname:"",
						text_str:"", btn_callback:null,
						active_flag:false})
				}, this);
			},
			switch_pstackcpane: function(id, stage, text_str, btn_callback) {
				var select_pane = this.getp_pane(id, stage);
				this.pstackcontainer_reg.selectChild(select_pane);
				// retrieve actual obj and find index
				var state_obj = this.get_cpanestate(id);
				var match_obj = state_obj.match_obj;
				var index = state_obj.index;
				// modify matched obj
				match_obj.p_pane = select_pane;
				match_obj.p_stage = stage;
				match_obj.text_str = text_str || "";
				match_obj.btn_callback = btn_callback;
				this.setreset_cpanestate_active(match_obj);
				this.cpanestate_list[index] = match_obj;
			},
			get_cpanestate: function(id) {
				var idmatch_list = arrayUtil.filter(this.cpanestate_list,
					function(item, index) {
						return item.id == id;
					})
				if (idmatch_list.length > 0) {
					// retrieve actual obj and find index
					var match_obj = idmatch_list[0];  // there should only be one elem
					var index = this.cpanestate_list.indexOf(match_obj);
					return {match_obj:match_obj, index:index};
				} else
					return null;
			},
			// find the cpanestate that was last active
			get_cpanestate_active: function() {
				var idmatch_list = arrayUtil.filter(this.cpanestate_list,
					function(item, index) {
						return item.active_flag == true;
					})
				if (idmatch_list.length > 0) {
					// retrieve actual obj and find index
					var match_obj = idmatch_list[0];  // there should only be one elem
					var index = this.cpanestate_list.indexOf(match_obj);
					return {match_obj:match_obj, index:index};
				} else
					return null;
			},
			getp_pane: function(id, stage) {
				// get parameter pane corresponding to id and stage
				// ('config' or 'preconfig')
				var idmatch_list = arrayUtil.filter(this.pstackmap_list,
					function(item, index) {
						return item.id == id && item.stage == stage;
					});
				return idmatch_list[0].pane_id;
			},
			setreset_cpanestate_active: function(match_obj) {
				var active_state = this.get_cpanestate_active();
				if (active_state) {
					var oldmatch_obj = active_state.match_obj;
					oldmatch_obj.active_flag = false;
				}
				match_obj.active_flag = true;
			},
			switch_gstackcpane: function(id, preconfig_flag, colname) {
				var preconfig_flag = (typeof preconfig_flag === "undefined") ? false:preconfig_flag;
				var colname = (typeof colname === "undefined") ? "":colname;
				var select_pane = "";
				if (preconfig_flag) {
					select_plane = constant.blankcpane_id;
				} else {
					var idmatch_list = arrayUtil.filter(this.gstackmap_list,
						function(item, index) {
							return item.id == id;
						});
					select_pane = idmatch_list[0].pane_id;
				}
				this.gstackcontainer_reg.selectChild(select_pane);
				// update cpane list state
				var state_obj = this.get_cpanestate(id);
				var match_obj = state_obj.match_obj;
				var index = state_obj.index;
				// modify matched obj
				match_obj.g_pane = select_pane;
				// assign db collection name to match_obj property
				match_obj.g_pane_colname = colname;
				this.setreset_cpanestate_active(match_obj);
				this.cpanestate_list[index] = match_obj;
			},
			check_initialize: function(info_obj, event) {
				/* initialization UI is selected; manage pane change to initialization UI
				Scenarios to consider:
				a) switch within same idproperty - grid to initialization/preconfig
				b) switch between different idproperty - grid to preconfig
				c) switch between different idproperty - preconfig to preconfig
				d) swith with same id - preconfig to preconfig - (do nothing)
				e) no switch - previous pane does not exist - init preconfig
				Note we don't need to get data from server for any scenario
				*/
				var new_idproperty = info_obj.idproperty;
				var state_obj = this.get_cpanestate(new_idproperty);
				var match_obj = state_obj.match_obj;
				var lastp_stage = match_obj.p_stage;
				if (match_obj.active_flag) {
					// this is going to be scenario a or d
					// get the last stage for idproperty
					if (lastp_stage) {
						if (lastp_stage == 'preconfig') {
							// scenario d), do nothing
							return;
						} else {
							// remaining pstage is 'config', switch to preconfig
							// get the preconfig pane
							info_obj.initialize();
						}
					} else {
						// this should not happen since active_flag was on
						console.log("check_initialize - logic error");
						alert("initialization logic error");
						return;
					}
				} else {
					// scenarios b, c, or e
					info_obj.initialize();
				}
			},
			check_getServerDBInfo: function(options_obj) {
				/* scenarios:
				a)switch within same idprop: one grid to another grid - grid doesn't exist
				b)switch within same idprop: incomplete preconfig to different grid that already exists
				c)switch within same idprop: incomplete preconfig to different grid
				that doesn't exist yet
				d)switch between different idprop: one grid to another grid
				e)switch between different idprop: one incomplete preconfig to
				different id grid
				f)switch within same idprop: one grid to same grid (do nothing)
				g)no switch - directly call new grid
				h)switch within same idprop: incomplete preconfig to different grid - grid exists for different data, needs to be swapped out
				i)switch within same idprop: one grid to another grid -
				grid exists but needs to be swapped out
				For each of the scenarios above, we need to decide if we need to get
				data from the server and/or switch content panes; we also need to
				determine if grid needs to be swapped or created*/
				var info_obj = options_obj.info_obj;
				// get incoming idproperty
				var new_idproperty = info_obj.idproperty;
				var state_obj = this.get_cpanestate(new_idproperty);
				var match_obj = state_obj.match_obj;
				var lastp_stage = match_obj.p_stage;
				var newgrid_flag = info_obj.is_newgrid_required();
				if (match_obj.active_flag) {
					// same idprop: scenarios a,b,c,h
					if (lastp_stage) {
						if (lastp_stage == 'preconfig') {
							// we need to swap cpane from preconfig to config
							// even though we are in the same idprop
							// scenarios b,c,h
							options_obj.swapcpane_flag = true;
							// find if idprop-specific logic requires a new grid to be generated.
							options_obj.newgrid_flag = newgrid_flag;
							if (newgrid_flag) {
								// if new grid is required, set flag  and get server data. this is scenario c)
								info_obj.getServerDBInfo(options_obj);
							} else {
								/* grid already exists; determine if grid name
								matches name of incoming g_pane_colname, or if we need to get server data to swap out grid contents */
								if (info_obj.is_serverdata_required(options_obj)) {
									// scenario h
									info_obj.getServerDBInfo(options_obj);
								} else {
									// scenario b
									options_obj.info_obj.reconfig_infobtn(options_obj, idproperty, colname);
								}
							}
						} else {
							/* p_stage is config
							scenarios a, f, i */
							options_obj.swapcpane_flag = false;
							options_obj.newgrid_flag = newgrid_flag;
							if (newgrid_flag) {
								// scenario a
								info_obj.getServerDBInfo(options_obj);
							} else {
								// scenario f and i.
								// don't need to do anything for scenario f
								if (info_obj.is_serverdata_required(options_obj)) {
									// scenario i
									info_obj.getServerDBInfo(options_obj);
								}
							}
						}
					} else {
						// this should not happen since active_flag was on
						console.log("Error code 2: check_getServerDBInfo - logic error");
						alert("Error Code 2");
						return;
					}
				} else {
					// idprop is switching
					options_obj.swapcpane_flag = true;
					options_obj.newgrid_flag = newgrid_flag;
					if (newgrid_flag) {
						// if new grid is required, set flag  and get server data.
						info_obj.getServerDBInfo(options_obj);
					} else {
						/* grid already exists; determine if grid name
						matches name of incoming g_pane_colname, or if we need to get server data to swap out grid contents */
						if (info_obj.is_serverdata_required(options_obj)) {
							info_obj.getServerDBInfo(options_obj);
						} else {
							options_obj.info_obj.reconfig_infobtn(options_obj, idproperty, colname);
						}
					}
				}
			}
		});
	}
);
