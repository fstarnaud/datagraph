#!/usr/bin/python
import simplejson as json
import time
import networkx as nx
from networkx import connected_components
from networkx.readwrite import json_graph
# ref http://stackoverflow.com/questions/2970608/what-are-named-tuples-in-python for namedtuples
from collections import namedtuple
from datetime import timedelta
from dateutil import parser

league_div = [
{ 'div_id':1, 'agediv':'U6', 'gender':'B', 'totalteams':25,
  'gamedaysperweek':1, 'gameinterval':50, 'gamesperseason':11},
{ 'div_id':2, 'agediv':'U6', 'gender':'G', 'totalteams':20,
  'gamedaysperweek':1, 'gameinterval':50, 'gamesperseason':11},
{ 'div_id':3, 'agediv':'U8', 'gender':'B', 'totalteams':35,
  'gamedaysperweek':1, 'gameinterval':60, 'gamesperseason':10},
{ 'div_id':4, 'agediv':'U8', 'gender':'G', 'totalteams':30,
  'gamedaysperweek':1, 'gameinterval':60, 'gamesperseason':10},
{ 'div_id':5, 'agediv':'U10', 'gender':'B', 'totalteams':34,
  'gamedaysperweek':2, 'gameinterval':75, 'gamesperseason':12},
{ 'div_id':6, 'agediv':'U10', 'gender':'G', 'totalteams':38,
  'gamedaysperweek':2, 'gameinterval':75, 'gamesperseason':12},
{ 'div_id':7, 'agediv':'U12', 'gender':'B', 'totalteams':9,
  'gamedaysperweek':2, 'gameinterval':90, 'gamesperseason':14},
{ 'div_id':8, 'agediv':'U12', 'gender':'G', 'totalteams':4,
  'gamedaysperweek':2, 'gameinterval':90, 'gamesperseason':14}
]
#assign team numbers
team_id_start = 1
for div in league_div:
    next_team_id_start = team_id_start + div['totalteams']
    div['team_id_range'] = (team_id_start, next_team_id_start-1)
    team_id_start = next_team_id_start

# primary key identifies age groups that have priority for the fields.
# identified by _id from league_div dictionary elements
_field_info = [
    {'field_id':1, 'primary':[1,2], 'secondary':[3,4], 'name':'Sequoia Elementary',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':2, 'primary':[1,2], 'secondary':[3,4], 'name':'Rodgers Smith Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':3, 'primary':[3,4], 'secondary':[1,2], 'name':'Pleasant Hill Elementary',
     'start_time':'08:00', 'end_time':'17:00' },
    {'field_id':4, 'primary':[3,4], 'secondary':[1,2], 'name':'Mountain View Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':5, 'primary':[3,4], 'secondary':[1,2], 'name':'Hidden Valley Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':6, 'primary':[5,6], 'secondary':[7,8], 'name':'Pleasant Oaks Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':7, 'primary':[5,6], 'secondary':[7,8], 'name':'Golden Hills Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':8, 'primary':[5,6], 'secondary':[7,8], 'name':'Nancy Boyd Park',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':9, 'primary':[7,8], 'secondary':None, 'name':'Gregory Gardens Elementary',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':10, 'primary':[7,8], 'secondary':None, 'name':'Strandwood Elementary',
     'start_time':'08:00', 'end_time':'17:00'},
    {'field_id':11, 'primary':[7,8], 'secondary':None, 'name':'Las Juntas Elementary',
     'start_time':'08:00', 'end_time':'17:00',
     'unavailable':[{'start':'10/28/13','end':'10/28/13'}]}
]
# assigned fields attribute for each division
# ref http://stackoverflow.com/questions/4573875/python-get-index-of-dictionary-item-in-list
# for finding index of dictionary key in array of dictionaries
# use indexer so that we don't depend on order of divisions in league_div list
div_indexer = dict((p['div_id'],i) for i,p in enumerate(league_div))
for field in _field_info:
    f_id = field['field_id']
    for d_id in field['primary']:
        index = div_indexer.get(d_id)
        division = league_div[index]
        # check existence of key 'fields' - if it exists, append to list of fields, if not create
        if 'fields' in division:
            division['fields'].append(f_id)
        else:
            division['fields'] = [f_id]

def getFieldSeasonStatus_list():
    # routine to return initialized list of field status slots -
    # which are all initially set to False
    # each entry of list is a dictionary with two elemnts - (1)field_id
    # (2) - two dimensional matrix of True/False status (outer dimension is
    # round_id, inner dimenstion is time slot)
    fieldseason_status_list = []
    for f in _field_info:
        f_id = f['field_id']
        interval_list = []
        numgames_list = []
        for p in f['primary']:
            divinfo = league_div[div_indexer.get(p)]
            interval_list.append(divinfo['gameinterval'])
            numgames_list.append(divinfo['gamesperseason'])
        #  if the field has multiple primary divisions, take max of gameinterval and gamesperseason
        interval = max(interval_list)
        gameinterval = timedelta(0,0,0,0,interval)  # convert to datetime compatible obj
        numgames = max(numgames_list)
        FieldTimeStatus = namedtuple('FieldTimeStatus', 'start_time isgame')
        gamestart = parser.parse(f['start_time'])
        end_time = parser.parse(f['end_time'])
        # slotstatus_list has a list of statuses, one for each gameslot
        # each status is a namedtuple - (starttime, true/false filled flag)
        slotstatus_list = []
        while gamestart <= end_time:
            slotstatus_list.append(FieldTimeStatus(gamestart, False))
            gamestart += gameinterval

        fieldseason_status_list.append({'field_id':f['field_id'],
                                        'slotstatus_list':numgames*[slotstatus_list]})
    return fieldseason_status_list

coach_conflict_info = [
    {'coach_id':1, 'conflict':({'agediv':'U6','gender':'B', 'team_id':1},{'agediv':'U8','gender':'B', 'team_id':3})},
    {'coach_id':2, 'conflict':({'agediv':'U8','gender':'G', 'team_id':5},{'agediv':'U10','gender':'G', 'team_id':2})},
    {'coach_id':3, 'conflict':({'agediv':'U8','gender':'G', 'team_id':7},{'agediv':'U8','gender':'B', 'team_id':9})}

]

def getDivID(agediv, gender):
    if agediv == 'U6':
        if gender == 'B':
            div_id = 1
        else:
            div_id = 2
    elif agediv == 'U8':
        if gender == 'B':
            div_id = 3
        else:
            div_id = 4
    elif agediv == 'U10':
        if gender == 'B':
            div_id = 5
        else:
            div_id = 6
    elif agediv == 'U12':
        if gender == 'B':
            div_id = 7
        else:
            div_id = 8
    elif agediv == 'U14':
        if gender == 'B':
            div_id = 9
        else:
            div_id = 10
    else:
        div_id = 0
    return div_id

def getTeamID(agediv, gender, team_id):
    div_id = getDivID(agediv, gender)
    for div in league_div:
        if div[_id] == div_id:
            id_range = div['team_id_range']
            overall_id = id_range[0]+team_id-1
            break
    else:
        overall_id = False
    return overall_id

def getAgeGenderDivision(div_id):
    Division = namedtuple('Division', 'age gender')
    if div_id == 1:
        Division.age = 'U6'
        Division.gender = 'B'
    elif div_id == 2:
        Division.age = 'U6'
        Division.gender = 'G'
    elif div_id == 3:
        Division.age = 'U8'
        Division.gender = 'B'
    elif div_id == 4:
        Division.age = 'U8'
        Division.gender = 'G'
    elif div_id == 5:
        Division.age = 'U10'
        Division.gender = 'B'
    elif div_id == 6:
        Division.age = 'U10'
        Division.gender = 'G'
    elif div_id == 7:
        Division.age = 'U12'
        Division.gender = 'B'
    elif div_id == 8:
        Division.age = 'U12'
        Division.gender = 'G'
    elif div_id == 9:
        Division.age = 'U14'
        Division.gender = 'B'
    elif div_id == 10:
        Division.age = 'U14'
        Division.gender = 'G'
    else:
        Division.age = 'NA'
        Division.gender = 'NA'
    return Division

def getDivisionData(div_id):
    div_indexer = dict((p['div_id'],i) for i,p in enumerate(league_div))
    index = div_indexer.get(div_id)
    division = league_div[index]
    return division

#find inter-related divisions through the field_info list
# this should be simplier than the method below whith utilize the division info list
G = nx.Graph()
for field in _field_info:
    prev_node = None
    for div_id in field['primary']:
        if not G.has_node(div_id):
            G.add_node(div_id)
        if prev_node is not None and not G.has_edge(prev_node, div_id):
            G.add_edge(prev_node, div_id)
        prev_node = div_id

#serialize field-connected divisions as graph and save it (instead of saving list of connected components)
#used by leaguediv_process to determine schedule allocation of connected divisions
connected_graph = json_graph.node_link_data(G)

# create coach conflict graph to find conflict metrics
conflictG = nx.Graph()
for coach in coach_conflict_info:
    prev_node = None
    for team in coach['conflict']:
        a = team['agediv']
        g = team['gender']
        div_id = getDivID(a,g)
        if not conflictG.has_node(div_id):
            conflictG.add_node(div_id)
        if prev_node is not None:
            if not conflictG.has_edge(prev_node, div_id):
                conflictG.add_edge(prev_node, div_id, weight=1.0)
            else:
                # if edge already exists, increase weight
                conflictG.edge[prev_node][div_id]['weight'] += 1
        prev_node = div_id
# for printing edge attributes
# http://networkx.github.io/documentation/latest/reference/classes.graph.html#overview
a = [ (u,v,edata['weight']) for u,v,edata in conflictG.edges(data=True) if 'weight' in edata ]
print a

jsonstr = json.dumps({"creation_time":time.asctime(),
                      "leaguedivinfo":league_div,
                      "conflict_info":coach_conflict_info,
                      "connected_graph":connected_graph,
                      "field_info":_field_info})
f = open('leaguediv_json.txt','w')
f.write(jsonstr)

f.close()
