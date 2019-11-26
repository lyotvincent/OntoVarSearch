import re
from pymongo import *
import os
import time
import sys

def findvalue(key, datalist):
    for i in datalist:
        if i.split('=')[0] == key:
            return i.split('=')[1]
    return '.'

def CreateDB(inFile, outFile):
    annovar = open(inFile, 'r')
    database = open(outFile, 'w')
    #annovar = open('/home/qz/Desktop/clinvar_20191007.vcf','r')
    #database = open('/home/qz/Downloads/annovar/humandb/hg19_clinvar_20191007.txt','w')

    wlist= ['#chrom','start','end','ref','alt','ALLELEID','CLNDN', 'CLNDNINCL','CLNDISDB', 'CLNDISDBINCL','CLNHGVS','CLNREVSTAT',  'CLNSIG',  'CLNSIGCONF',  'CLNSIGINCL',  'CLNVC',   'CLNVCSO', 'CLNVI', 'DBVARID ', 'GENEINFO', 'MC', 'ORIGIN', 'RS', 'SSR\n']
    bw = '\t'.join(wlist)
    database.write(bw)
    listinfo = ['ALLELEID','CLNDN', 'CLNDNINCL','CLNDISDB', 'CLNDISDBINCL','CLNHGVS','CLNREVSTAT',  'CLNSIG',  'CLNSIGCONF',  'CLNSIGINCL',  'CLNVC',   'CLNVCSO', 'CLNVI', 'DBVARID ', 'GENEINFO', 'MC', 'ORIGIN', 'RS', 'SSR']
    for line in annovar:
        if line.startswith('#'):
            continue
        else:
            lines = line.strip('\n').split('\t')
            chrom = lines[0]
            start = lines[1]
            ref = lines[3]
            alt = lines[4]
            end = str(int(start) + len(ref) - 1)
            clinvar = lines[7]

            clins = clinvar.split(';')

            linfo = []
            for idx, ele in enumerate(listinfo):
                linfo.append(findvalue(ele, clins))

            l = [chrom, start, end, ref, alt]
            l.extend(linfo)
            s = '\t'.join(l) + '\n'
            database.write(s)

    annovar.close()
    database.close()

def AddOntology2DB(inFile, outFile):
    con = MongoClient('localhost', 27017)
    inlist = ['#chrom', 'start', 'end', 'ref', 'alt', 'ALLELEID', 'CLNDN', 'CLNDNINCL', 'CLNDISDB', 'CLNDISDBINCL',
             'CLNHGVS', 'CLNREVSTAT', 'CLNSIG', 'CLNSIGCONF', 'CLNSIGINCL', 'CLNVC', 'CLNVCSO', 'CLNVI', 'DBVARID',
             'GENEINFO', 'MC', 'ORIGIN', 'RS', 'SSR']
    #SO=CLNVCSO|CLNVC,MC GO=GENEINFO->goa->goa_terms HPO=OMIM->Hpoteam.hpo->hpoanno.termname DO=OMIM->obo.DO->obo.DO.termname
    outlist =['#chrom', 'start', 'end', 'ref', 'alt', 'ALLELEID', 'CLNDN', 'CLNDNINCL', 'CLNDISDB', 'CLNDISDBINCL',
             'CLNHGVS', 'CLNREVSTAT', 'CLNSIG', 'CLNSIGCONF', 'CLNSIGINCL', 'CLNVI', 'DBVARID',
             'GENEINFO', 'ORIGIN', 'RS', 'SSR']
    filds =['#chrom', 'start', 'end', 'ref', 'alt', 'ALLELEID', 'CLNDN', 'CLNDNINCL', 'CLNDISDB', 'CLNDISDBINCL',
             'CLNHGVS', 'CLNREVSTAT', 'CLNSIG', 'CLNSIGCONF', 'CLNSIGINCL', 'CLNVI', 'DBVARID',
             'GENEINFO', 'ORIGIN', 'RS', 'SSR', 'SO', 'MC', 'HPO', 'DO', 'GO']
    linecount = 0
    with open(inFile, 'r') as inputf:
        with open(outFile, 'w') as outputf:
            outputf.write('\t'.join(filds) + '\n')
            for line in inputf:
                if line.startswith('#'):
                    continue
                #elif line.startswith('16\t50'):
                else:
                    lines = line.strip('\n').split('\t')
                    tmp_dict = dict(zip(inlist, lines))
                    #debug
                    linecount+=1
                    if linecount % 2000 == 0:
                        print(tmp_dict['#chrom']+'\t'+ tmp_dict['start'])

                    OMIM_IDs = []
                    for group_db in tmp_dict['CLNDISDB'].split('|'):
                        for ele_db in group_db.split(','):
                            if ele_db.split(':')[0] == 'OMIM':
                                OMIM_IDs.append(ele_db.split(':')[1])

                    #so
                    SO = tmp_dict["CLNVCSO"]+'|'+tmp_dict['CLNVC']
                    MC = tmp_dict["MC"]
                    tmp_dict['SO'] = SO
                    tmp_dict['MC'] = MC

                    #go
                    genesymbal = tmp_dict['GENEINFO'].split(':')[0]
                    results_GO = con.goa.goa.find({"DB_Object_Symbol": genesymbal})
                    go_list = []
                    for result_GO in results_GO:
                        go_id = result_GO["GO_ID"]
                        go_term = con.goa.goa_terms.find_one({"GO_ID":go_id})
                        if go_term and 'GO Term' in go_term:
                            go_list.append(go_id+'|'+go_term['GO Term'])
                        else:
                            go_list.append(go_id)
                    if go_list:
                        GO = ','.join(go_list)
                        tmp_dict['GO'] = GO

                    if OMIM_IDs:
                        hpo_list = []
                        do_list = []
                        for omimID in OMIM_IDs:
                            #HPO
                            results_HPO = con.hpo.hpoteam.find({"DB": "OMIM", "DB_Object_ID": omimID})
                            for result_HPO in results_HPO:
                                hpo_term = con.hpo.hpo.find_one({"HPO_Term_ID":result_HPO["HPO_ID"]})
                                if hpo_term and "HPO_Term_Name" in hpo_term:
                                    hpo_list.append(result_HPO["HPO_ID"]+'|' + hpo_term["HPO_Term_Name"])

                            #DO
                            result_OMIM = con.owl.obo.find_one({"oboInOwlu003AhasDbXref.value": "OMIM:"+omimID})
                            if result_OMIM:
                                DOID = result_OMIM["oboInOwlu003Aid"]["value"]
                                DOterm = result_OMIM["rdfsu003Alabel"]["value"]
                                do_list.append(DOID + '|' + DOterm)
                        if hpo_list:
                            tmp_dict['HPO'] = ','.join(hpo_list)
                        if do_list:
                            tmp_dict['DO'] = ','.join(do_list)

                    l=[]
                    for key in filds:
                        if key in tmp_dict:
                            l.append(tmp_dict[key])
                        else:
                            l.append('.')
                    str = '\t'.join(l) + '\n'
                    outputf.write(str)


if __name__ == '__main__':
    # CreateDB('/home/qz/Desktop/clinvar/clinvar_20191105_GRCh38.vcf',
    #          '/home/qz/Desktop/clinvar/hg38_clinvar_20191105.txt')
    AddOntology2DB('/home/qz/Desktop/clinvar/hg38_clinvar_20191105.txt',
                   '/home/qz/Desktop/clinvar/hg38_clinvar_20191105_ontology.txt')
    print('done')