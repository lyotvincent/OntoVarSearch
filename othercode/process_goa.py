import json
#from rdflib import *
import re
from pymongo import *
import os
import time
import sys
import os
import csv

def create_goa_db(filepath):
    con = MongoClient('localhost', 27017)
    my_db = con.goa
    i = 0
    with open(filepath, 'r', encoding='UTF-8') as f:
        #line = f.readline()
        head = ['DB', 'DB_Object_ID', 'DB_Object_Symbol', 'Qualifier', 'GO_ID', 'DB_Reference', 'Evidence_Code', 'With/From', 'Aspect', 'DB_Object_Name', 'DB_Object_Synonym', 'DB_Object_Type', 'Taxon', 'Date', 'Assigned_By', 'Annotation_Extension', 'Gene_Product_Form_ID']
        # print(len(head))
        line = f.readline()
        # line_list = line.split('\t')
        # print(len(line_list))

        while line:
            if line[0] == '!':
                line = f.readline()
            else:
                line_list = line[:-1].split('\t')
                tmp_dict = dict(zip(head, line_list))
                my_db.goa_tmp.insert_one(tmp_dict)
                line = f.readline()
                i = i+1
    return i

def process_goa():
    goapath = '/home/qz/Desktop/XMLdata/goa/'
    f = open('/home/qz/Desktop/XMLdata/goa_time.txt', 'a')
    for file in os.listdir(goapath):
        print(file)
        file_path = os.path.join(goapath, file)
        start = time.clock()
        s = create_goa_db(file_path)
        end = time.clock()
        total_time = (end - start)
        f.write(file+'\t'+str(s)+'\t'+str(total_time)+'\n')
        print(total_time)
    f.close()

#input: goaAll.csv
#output: create mongodb collection goa_terms
def csv2db():
    goaAllpath = './AnnotationTool/data/goaALL.csv'
    #con = MongoClient('localhost', 27017)
    con = MongoClient('123.207.240.94', 28019)
    with open(goaAllpath, 'r') as fgoa:
        reader = csv.DictReader(fgoa)
        for line in reader:
            ele={}
            ele['DB_Object_Symbol']=line['DB_Object_Symbol'].strip()
            ele['GO_ID']=line['GO_ID'].strip()
            ele['GO Term'] = line['GO Term'].strip()
            con.vcf_hpo.goa_terms.insert_one(ele)
            #rcon1.lpush(line['DB_Object_Symbol'].strip(), line['GO_ID'] + '|' + line['GO Term'])


if __name__ == "__main__":
    csv2db()
    print("ALL done!")