#!/usr/bin/python
import simplejson as json
from pprint import pprint
from bottle import route, request
from scheduler import (ScheduleGenerator,
                       start_time_CONST, venue_game_list_CONST, gameday_id_CONST,
                       gameday_data_CONST, venue_CONST,
                       game_team_CONST, home_CONST, away_CONST)
import networkx as nx
from networkx.readwrite import json_graph
from networkx import connected_components

# http://api.mongodb.org/python/current/tutorial.html
from pymongo import  *

# prep for connecting to db
client = MongoClient()
testschedule_db = client.testschedule_db
div_schedule_col = testschedule_db.div_schedule
# create collection in db for storing metrics
metrics_collect = testschedule_db.metrics

def get_leaguedata():
    fname = 'leaguediv_json.txt'
    json_file = open(fname)
    ldata = json.load(json_file)
    #pprint(ldata)
    json_file.close()
    return ldata

'''
references
http://www.tutorial.useiis7.net/dojodoc/001/
http://myadventuresincoding.wordpress.com/2011/01/02/creating-a-rest-api-in-python-using-bottle-and-mongodb/
http://gotofritz.net/blog/weekly-challenge/restful-python-api-bottle/
http://bottlepy.org/docs/dev/tutorial.html#request-routing
'''
@route('/leaguedivinfo')
def leaguedivinfo_all():
    callback_name = request.query.callback
    ldata = get_leaguedata()
    a = json.dumps(ldata)
    return callback_name+'('+a+')'

@route('/leaguedivinfo/<tid:int>', method='GET')
def leaguedivinfo(tid):
    callback_name = request.query.callback
    ldata = get_leaguedata()
    ldata_divinfo = ldata['leaguedivinfo']
    for div in ldata_divinfo:
        if div['_id'] == tid:
            nt = div['totalteams']
            interval = div['gameinterval']
            age = div['agediv']
            gender = div['gender']
            division_data = div_schedule_col.find_one({'age':age, 'gender':gender})
            game_list = division_data['game_list']

            metrics_data = metrics_collect.find_one({'age':age, 'gender':gender})
            metrics_list = metrics_data['metrics_list']
            print metrics_list
            #scheduler = ScheduleGenerator(nt, nv, interval)
            #game_list = scheduler.generateRRSchedule()
            #ha_counter = getattr(scheduler, 'metrics_list')
            a = json.dumps({"game_list":game_list, "fields":div['fields']})
            return callback_name+'('+a+')'
    else:
        return False

@route('/getalldivschedule')
def get_alldivSchedule():
    # http://docs.mongodb.org/manual/tutorial/create-a-unique-index/
    # and pymango doc http://api.mongodb.org/python/current/api/pymongo/collection.html#pymongo.collection.Collection.ensure_index
    # http://api.mongodb.org/python/current/api/pymongo/collection.html#pymongo.collection.Collection.create_index
    # apparently the need to create a unique index is not needed if an upsert (see below) call is made.
    # div_schedule_col.create_index([('age', ASCENDING),('gender',ASCENDING)], unique=True, dropDups=True)
    callback_name = request.query.callback
    ldata = get_leaguedata()
    ldata_divinfo = ldata['leaguedivinfo']
    # get list of connected divisions through field constraints
    connectedG = json_graph.node_link_graph(ldata['connected_graph'])
    connected_divisions = connected_components(connectedG)
    for connecteddiv_list in connected_divisions:
        # conflict_num are field conflicts - number of div's sharing field
        conflict_num = len(connecteddiv_list)

        for (connecteddiv,conflict_ind) in zip(connecteddiv_list, range(conflict_num)):
            print 'connecteddiv=',connecteddiv
            div = ldata_divinfo[connecteddiv-1]  # array is 0-index based, connecteddiv is 1-index
            nt = div['totalteams']
            fields = div['fields']
            interval = div['gameinterval']
            scheduler = ScheduleGenerator(nt, fields, interval, conflict_num)
            # first generate list of matches for the particular division
            game_list = scheduler.generateRRSchedule(conflict_ind)
            age = div['agediv']
            gender = div['gender']
            # use upsert with upsert flag enabled so that first call will create insert, but subsequent calls will over-write
            # ref http://docs.mongodb.org/manual/core/create/
            # also ref 'common mongodb and python patterns' in O'reilly mongodb and python
            sched_id = div_schedule_col.update({'age':age, 'gender':gender},
                                                   {"$set":{'game_list':game_list}}, safe=True, upsert=True)

            metrics_list = getattr(scheduler, 'metrics_list')
            metrics_id = metrics_collect.update({'age':age, 'gender':gender}, {'age':age, 'gender':gender, 'metrics_list':metrics_list}, safe=True, upsert=True)
    coach_conflict_list = ldata['conflict_info']
    a = ""
    #a = json.dumps({"game_list":game_list, "numFields":nv})
    return callback_name+'('+a+')'

'''
    for div in ldata_divinfo:
        nt = div['totalteams']
        fields = div['fields']
        interval = div['gameinterval']
        scheduler = ScheduleGenerator(nt, fields, interval)
        game_list = scheduler.generateRRSchedule()

        age = div['agediv']
        gender = div['gender']
        # use upsert with upsert flag enabled so that first call will create insert, but subsequent calls will over-write
        # ref http://docs.mongodb.org/manual/core/create/
        sched_id = div_schedule_col.update({'age':age, 'gender':gender}, {'age':age, 'gender':gender, 'game_list':game_list}, safe=True, upsert=True)

        metrics_list = getattr(scheduler, 'metrics_list')
        metrics_id = metrics_collect.update({'age':age, 'gender':gender}, {'age':age, 'gender':gender, 'metrics_list':metrics_list}, safe=True, upsert=True)
        #print 'sched_id=', sched_id
'''
@route('/divisiondata/<did:int>', method='GET')
def divisiondata(did):
    callback_name = request.query.callback
    ldata = get_leaguedata()
    numTeams = ldata['leaguedivinfo'][did]['totalteams']
    a = json.dumps({'totalteams':numTeams})
    return callback_name+'('+a+')'

@route('/teamdata/<tid:int>', method='GET')
def teamdata(tid):
    callback_name = request.query.callback
    divcode = int(request.query.division_code)
    ldata = get_leaguedata()
    divdata = ldata['leaguedivinfo'][divcode]
    age = divdata['agediv']
    gender = divdata['gender']
    # http://stackoverflow.com/questions/13708857/mongodb-aggregation-framework-nested-arrays-subtract-expression
    # http://docs.mongodb.org/manual/reference/aggregation/
    #col.aggregate({$match:{age:'U12',gender:'G'}},{$project:{game_list:1}},{$unwind:"$game_list"},{$unwind:"$game_list.GAMEDAY_DATA"},{$unwind:"$game_list.GAMEDAY_DATA.VENUE_GAME_LIST"},{$match:{$or:[{'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.GAME_LIST.HOME':1},{'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.GAME_LIST.AWAY':1}]}})
    result_list = div_schedule_col.aggregate([{"$match":{'age':age,'gender':gender}},
                                            {"$project":{'game_list':1}},
                                            {"$unwind":"$game_list"},
                                            {"$unwind":"$game_list.GAMEDAY_DATA"},
                                            {"$unwind":"$game_list.GAMEDAY_DATA.VENUE_GAME_LIST"},
                                            {"$match":{"$or":[{'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.GAME_TEAM.HOME':tid},
                                                              {'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.GAME_TEAM.AWAY':tid}]}}])

    print 'age,gender=',age,gender,result_list
    teamdata_list = []
    for result in result_list['result']:
        game_list = result['game_list']
        # look at structure of game_list in scheduler.py
        gameday_data = game_list[gameday_data_CONST]
        venue_game_list = gameday_data[venue_game_list_CONST]
        game_team = venue_game_list[game_team_CONST]
        teamdata_list.append({gameday_id_CONST:game_list[gameday_id_CONST],
                              start_time_CONST:gameday_data[start_time_CONST],
                              venue_CONST:venue_game_list[venue_CONST],
                              home_CONST:game_team[home_CONST],
                              away_CONST:game_team[away_CONST]})

    a = json.dumps({'teamdata_list':teamdata_list})
    return callback_name+'('+a+')'

@route('/fieldschedule/<fid:int>', method='GET')
def fieldschedule(fid):
    callback_name = request.query.callback
    # mongo shell aggregate command
    # col.aggregate({$unwind:"$game_list"},{$unwind:"$game_list.GAMEDAY_DATA"},{$unwind:"$game_list.GAMEDAY_DATA.VENUE_GAME_LIST"}, {$match:{'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.VENUE':8}})
    result_list = div_schedule_col.aggregate([{"$unwind":"$game_list"},
                                              {"$unwind":"$game_list.GAMEDAY_DATA"},
                                              {"$unwind":"$game_list.GAMEDAY_DATA.VENUE_GAME_LIST"},
                                              {"$match":{'game_list.GAMEDAY_DATA.VENUE_GAME_LIST.VENUE':fid}},
                                              {"$sort":{'game_list.GAMEDAY_ID':1,'game_list.GAMEDAY_DATA.START_TIME':1}}])
    print result_list
    fieldschedule_list = []
    for result in result_list['result']:
        gender = result['gender']
        age = result['age']
        game_list = result['game_list']
        gameday_data = game_list[gameday_data_CONST]
        game_team = gameday_data[venue_game_list_CONST][game_team_CONST]
        fieldschedule_list.append({gameday_id_CONST:game_list[gameday_id_CONST],
                                   start_time_CONST:gameday_data[start_time_CONST],
                                   'age':age,
                                   'gender':gender,
                                   home_CONST:game_team[home_CONST],
                                   away_CONST:game_team[away_CONST]})
    #print fieldschedule_list
    a = json.dumps({'fieldschedule_list':fieldschedule_list})
    return callback_name+'('+a+')'
