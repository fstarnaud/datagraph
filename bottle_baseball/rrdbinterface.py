#!/usr/bin/python
''' Copyright YukonTR 2013 '''
from dbinterface import MongoDBInterface, DB_Col_Type
import simplejson as json
from collections import namedtuple
import logging
gameday_id_CONST = 'GAMEDAY_ID'
start_time_CONST = 'START_TIME'
# global for namedtuple
_List_Indexer = namedtuple('_List_Indexer', 'dict_list indexerGet')
_List_Status = namedtuple('_List_Status', 'list config_status')

''' class to convert process new tournament schedule.  All namespace conversion between
js object keys and db document keys happen here '''
class RRDBInterface:
    def __init__(self, mongoClient, newcol_name):
        self.dbInterface = MongoDBInterface(mongoClient, collection_name=newcol_name, db_col_type=DB_Col_Type.RoundRobin)

    def writeDB(self, divinfo_str, config_status):
        divinfo_list = json.loads(divinfo_str)
        document_list = [{k.upper():v for k,v in x.items()} for x in divinfo_list]
        self.dbInterface.updateInfoDocument(document_list, config_status)

    def readDB(self):
        liststatus_tuple = self.dbInterface.getInfoDocument()
        divlist = liststatus_tuple.list
        config_status = liststatus_tuple.config_status
        # ref http://stackoverflow.com/questions/17933168/replace-dictionary-keys-strings-in-python
        # switch key to lower case for transfer to client
        divinfo_list = [{k.lower():v for k,v in x.items()} for x in divlist]
        #d_indexerGet = lambda x: dict((p['div_id'],i) for i,p in enumerate(divinfo_list)).get(x)
        #return _List_Indexer(divinfo_list, d_indexerGet)
        return _List_Status(divinfo_list, config_status)

    def readDBraw(self):
        return self.readDB()

    def insertGameData(self, age, gen, gameday_id, start_time_str, venue, home, away):
        document = {age_CONST:age, gen_CONST:gen, gameday_id_CONST:gameday_id,
                    start_time_CONST:start_time_str,
                    venue_CONST:venue, home_CONST:home, away_CONST:away}
        docID = self.games_col.insert(document))

    def readSchedDB(self, age, gender):
        dbgame_list = self.dbInterface.findElimTournDivisionSchedule(age, gender, min_game_id=3)
        game_list = []
        for dbgame in dbgame_list:
            print dbgame
            game_list.append({'gameday_id':dbgame[gameday_id_CONST],
                             'start_time':dbgame[start_time_CONST]})
        return dbgame_list

