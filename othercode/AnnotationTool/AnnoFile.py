import re
from pymongo import *
import os
import time
import sys
import csv
import redis

DatabaaseFilds = ['#chrom', 'start', 'end', 'ref', 'alt', 'Func.refGene', 'Gene.refGene', 'GeneDetail.refGene',
                  'ExonicFunc.refGene', 'AAChange.refGene', 'ALLELEID', 'CLNDN', 'CLNDNINCL', 'CLNDISDB',
                  'CLNDISDBINCL', 'CLNHGVS', 'CLNREVSTAT', 'CLNSIG', 'CLNSIGCONF', 'CLNSIGINCL', 'CLNVI', 'DBVARID',
                  'GENEINFO', 'ORIGIN', 'RS', 'SSR', 'SO', 'MC', 'HPO', 'DO', 'GO']

GoaData = []
SoaData = []
count = 0

def CountLoop(bulk=1000000):
    global count
    count += 1
    if count % bulk == 0:
        print("run data num: ", count)


def PreprocessData():
    #trim space
    with open('data/soaALL.csv', 'r') as fgoa:
        with open('data/tmp', 'w') as wf:
            reader = csv.DictReader(fgoa)
            for line in reader:
                str = line['Value'].strip()+','+line['SO Term'].strip()+','+line['SO ID'].strip()
                wf.write(str + '\n')


def LoadData():
    rcon1 = redis.Redis(host='127.0.0.1', port=6379, db=1)
    rcon1.flushdb()
    with open('data/goaALL.csv', 'r') as fgoa:
        reader = csv.DictReader(fgoa)
        for line in reader:
            rcon1.lpush(line['DB_Object_Symbol'].strip(), line['GO_ID'] + '|' + line['GO Term'])


    rcon2 = redis.Redis(host='127.0.0.1', port=6379, db=2)
    rcon2.flushdb()
    with open('data/soaALL.csv', 'r') as fsoa:
        reader = csv.DictReader(fsoa)
        for line in reader:
            rcon2.lpush(line['Value'].strip(), line['SO ID']+'|'+ line['SO Term'])



def ConvertAnnovaroutfile2Database(input,output):
    linecount = 0
    rgo = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True, db=1)
    rso = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True, db=2)
    if not (rgo and rso):
        print("db load error")
        return False
    with open(input, 'r') as inf:
        with open(output, 'w') as outf:
            outf.write('\t'.join(DatabaaseFilds) + '\n')
            for line in inf:
                if line.startswith('Chr\t'):
                    continue
                else:
                    CountLoop()
                    lines = line.strip('\n').split('\t')
                    tmp_dict = dict(zip(DatabaaseFilds, lines))

                    #SO
                    freflist = rso.lrange(tmp_dict['Func.refGene'],0,-1)
                    for ele in freflist:
                        if ele.split('|')[0] not in tmp_dict['SO'] and ele.split('|')[0] not in tmp_dict['MC']:
                            if tmp_dict['SO'] == '.':
                                tmp_dict['SO'] = ele
                            else:
                                tmp_dict['SO']+=','+ele
                    exfreflist = rso.lrange(tmp_dict['ExonicFunc.refGene'],0,-1)
                    for ele in exfreflist:
                        if ele.split('|')[0] not in tmp_dict['SO'] and ele.split('|')[0] not in tmp_dict['MC']:
                            if tmp_dict['MC'] == '.':
                                tmp_dict['MC'] = ele
                            else:
                                tmp_dict['MC'] += ',' + ele


                    #GO
                    if ';' not in tmp_dict['Gene.refGene']:
                        golist = rgo.lrange(tmp_dict['Gene.refGene'], 0, -1)
                        for ele in golist:
                            if ele.split('|')[0] not in tmp_dict['GO']:
                                if tmp_dict['GO'] == '.':
                                    tmp_dict['GO'] = ele
                                else:
                                    tmp_dict['GO'] += ',' + ele


                    l = []
                    for key in DatabaaseFilds:
                        if key in tmp_dict:
                            l.append(tmp_dict[key])
                        else:
                            l.append('.')
                    str = '\t'.join(l) + '\n'
                    outf.write(str)
    return True



def CreateGOA_ALL():
    con = MongoClient('localhost', 27017)
    goaID = con.goa.goa
    goaTerm = con.goa.goa_terms
    goaALL = con.goa.goaALL
    results = goaID.find({})
    for result in results:
        if 'DB_Object_Symbol' in result and 'GO_ID' in result:
            geneName = result['DB_Object_Symbol']
            GOID = result['GO_ID']
            go_term = goaTerm.find_one({"GO_ID": GOID})
            if go_term and 'GO Term' in go_term:
                goaALL.insert({'DB_Object_Symbol':geneName,'GO_ID':GOID,'GO Term':go_term['GO Term']})
            else:
                goaALL.insert({'DB_Object_Symbol':geneName,'GO_ID':GOID})


def CreateDB(input, output):
    LoadData()
    print("load db complete!")
    return ConvertAnnovaroutfile2Database(input, output)

#if __name__ == '__main__':
    # LoadData()
    # print("load db complete")
    # input = '/home/qz/Desktop/clinvar/wgsanno.hg19_multianno.txt'
    # out = '/home/qz/Desktop/clinvar/wgsanno.tmpdb.txt'
    # ConvertAnnovaroutfile2Database(input, out)
    #print('done')