from bson import Code
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt, csrf_protect
import os
Debug=False
if not Debug:
    import allel
import numpy as np
import json
import multiprocessing
import pickle
from lockfile import LockFile
from pymongo import MongoClient
import re
import zipfile
from django.http import StreamingHttpResponse
from wsgiref.util import FileWrapper
from functools import partial
from mysite.transform_core import *


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32,
                              np.float64)):
            return float(obj)
        # elif isinstance(obj, np.ndarray):
        #     return list(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        else:
            return json.JSONEncoder.default(self, obj)

class Transform(TransformV2J):

    #Not applicable for clinvar
    def dotranform(self, filepath_vcf, mode, IsAddHead):
        TransformV2J.dotranform(self, filepath_vcf, mode, IsAddHead)

    #Not applicable for clinvar
    def dotransformWithOutPath(self, filepath_vcf, filepath_json, mode, IsAddHead):
        TransformV2J.dotransformWithOutPath(self, filepath_vcf, filepath_json, mode, IsAddHead)

    def preview(self, filepath_vcf, mode):
        return TransformV2J.preview(self, filepath_vcf, mode)

    #Applicable for all type of vcf files
    def dotransformMain(self, filepath_vcf, filepath_json):
        TransformV2J.TransformMain(self, filepath_vcf, filepath_json)

#UploadFilePath = "C:/Project/vcf2json_file/"
#UploadFilePath = '/home/qz/project/GeneSearch/'
UploadFilePath = 'E:/project/GeneSearch/'
MongodbAddrLocal = "mongodb://127.0.0.1:28019"
if Debug:
    MongodbAddrRemote = "mongodb://123.207.240.94:28019"
else:
    MongodbAddrRemote = "mongodb://127.0.0.1:28019"

MongoIndexField = ['CHROM', 'POS', 'ID', 'QUAL', 'ALT', 'FILTER', 'REF', 'INFO', 'SAMPLES', 'SEQNAME', 'FEATURE', 'START', 'END', 'ENTREZ_GENE_ID', 'ENTREZ_GENE_SYMBOL','HPO_TERM_NAME','HPO_TERM_ID']
OntoAnnotationPos = 'E:/project/GeneSearch/tools/OntoAnnotation.zip'

count = 0
def CountLoop(bulk=1000000):
    global count
    count += 1
    if count % bulk == 0:
        print("run data num: ", count)

def html_index(request):
    return render(request, "index.html")

def html_search(request):
    return render(request, "search.html")

def html_contact(request):
    return render(request, "contact.html")

def html_download(request):
    return render(request, "download.html")

#download file
@csrf_exempt
def DownloadFile(request):
    if request.method == 'GET':
        filemd5 = request.GET.get('fileMD5')
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({"filemd5": filemd5})
        target = result["filepath"] + result["filename_zip"]
        response = StreamingHttpResponse(FileWrapper(open(target, 'rb')), content_type="application/octet-stream")
        response['Content-Disposition'] = 'attachment;filename="{0}"'.format(result["filename_zip"])
        response['Content-Length'] = os.path.getsize(target)
        return response

@csrf_exempt
def DownloadOntoAnnotation(request):
    if request.method == 'GET':
        toolname=os.path.basename(OntoAnnotationPos)
        response = StreamingHttpResponse(FileWrapper(open(OntoAnnotationPos, 'rb')), content_type="application/octet-stream")
        response['Content-Disposition'] = 'attachment;filename="{0}"'.format(toolname)
        response['Content-Length'] = os.path.getsize(OntoAnnotationPos)
        return response


#get download file list
@csrf_exempt
def GetDownloadfileList(request):
    if request.method == 'POST':
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        results = collection.find({'iszipcomplete': True}, {"_id": 0, "collectionName": 1, "filemd5": 1, "filepath": 1, "filename_zip": 1, "filename_vcf": 1})
        response_data = []
        for result in results:
            response_data.append(result)
    return JsonResponse(response_data, safe=False)


#search data
@csrf_exempt
def dosearch(request):
    if request.method == 'POST':
        json_data = request.POST.get("json_data")
        condition = json.loads(json_data)
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        collectionNames = collection.distinct("collectionName")
        Allresults = []

        for collectionName in collectionNames:
            datacolletion = connection.mydb[collectionName]
            results = datacolletion.find(condition, {"_id": 0})
            if results.count():
                for result in results:
                    Allresults.append(result)
    return HttpResponse(json.dumps(Allresults), content_type="application/text")


def ConvertKey(key, dic):
    GeneName = dic[key]
    connection = MongoClient(MongodbAddrRemote)
    collection_gtf = connection.vcf_hpo.gtf
    regx = re.compile(GeneName, re.IGNORECASE)
    results_gene = collection_gtf.find({"feature": "gene", "attribute.gene_name": regx})
    for result_gene in results_gene:
        seqname = result_gene["seqname"]
        chrom_start = result_gene["start"]
        chrom_end = result_gene["end"]
        dic["CHROM"] = seqname
        dic["POS"] = {"$gte": int(chrom_start), "$lte": int(chrom_end)}
        #pos = {"POS": {"$gte": int(chrom_start), "$lte": int(chrom_end)}}
        #dic.append(pos)
        break
    dic.pop(key)


def get_target_value(key, dic, tmp_list):
    """
    :param key: 目标key值
    :param dic: JSON数据
    :param tmp_list: 用于存储获取的数据
    :return: list
    """
    if not isinstance(dic, dict):  # 对传入数据进行格式校验
        return tmp_list
    if key in dic.keys():
        ConvertKey(key, dic)
        #tmp_list.append(dic[key])  # 传入数据存在则存入tmp_list
    else:
        for value in dic.values():  # 传入数据不符合则对其value值进行遍历
            if isinstance(value, dict):
                get_target_value(key, value, tmp_list)  # 传入数据的value值是字典，则直接调用自身
            elif isinstance(value, (list, tuple)):
                _get_value(key, value, tmp_list)  # 传入数据的value值是列表或者元组，则调用_get_value
    return tmp_list


def _get_value(key, val, tmp_list):
    for val_ in val:
        if isinstance(val_, dict):
            get_target_value(key, val_, tmp_list)  # 传入数据的value值是字典，则调用get_target_value
        elif isinstance(val_, (list, tuple)):
            _get_value(key, val_, tmp_list)   # 传入数据的value值是列表或者元组，则调用自身


#change genename --> chrom + pos
@csrf_exempt
def ConvertGeneName2cp(condition):
    get_target_value("GENENAME", condition, [])
    return condition


#search data
@csrf_exempt
def doexactSearch(request):
    def check_json_value(dic_json, k):
        if isinstance(dic_json, dict):
            for key in dic_json:
                if key.upper() == k.upper():
                    dic_json[key] = str(dic_json[key])
                elif isinstance(dic_json[key], dict) or isinstance(dic_json[key], list):
                    check_json_value(dic_json[key], k)
        elif isinstance(dic_json, list):
            for ele in dic_json:
                check_json_value(ele, k)


    if request.method == 'POST':
        condition = request.POST.get("condition")
        database = request.POST.get("database")
        condition = json.loads(condition)
        condition = ConvertGeneName2cp(condition)

        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        #collection_vcf = connection.vcf_hpo.autosomes
        Allresults=[]
        #转变chrom为字符串类型
        check_json_value(condition, 'chrom')
        results = collection_vcf.find(condition, {"_id": 0})
        for result in results:
            Allresults.append(result)
    return JsonResponse(Allresults, safe=False)


#gene information search
@csrf_exempt
def doGeneInfoSearch(request):
    if request.method == 'POST':
        GeneName = request.POST.get("json_data")
        connection = MongoClient(MongodbAddrRemote)
        collection_hpo = connection.vcf_hpo.hpo
        collection_gtf = connection.vcf_hpo.gtf
        Allresults =[]
        results_gene = collection_gtf.find({"feature": "gene", "attribute.gene_name": GeneName.upper()})
        # if results_gene.count() == 0:
        #     regx = re.compile(".*" + GeneName + ".*", re.IGNORECASE)
        #     results_gene = collection_gtf.find({"feature": "gene", "attribute.gene_name": regx})
        for result_gene in results_gene:
            seqname = result_gene["seqname"]
            chrom_start = result_gene["start"]
            chrom_end = result_gene["end"]
            gene_id = result_gene["attribute"]["gene_id"]
            strand = result_gene["strand"]
            result = {
                "GeneName": result_gene["attribute"]["gene_name"],
                "GeneID": gene_id,
                "Chr": seqname,
                "Start": chrom_start,
                "End": chrom_end,
                "Strand": strand
            }
            Allresults.append(result)
        return JsonResponse(Allresults, safe=False)


#gff3 search
@csrf_exempt
def doGFF3Search(request):
    if request.method == 'POST':
        input = request.POST.get("key")
        connection = MongoClient(MongodbAddrRemote)
        # collection_hpo = connection.vcf_hpo.hpo
        # collection_gtf = connection.vcf_hpo.gtf
        collection_gff3 = connection.vcf_hpo.gff3
        results = collection_gff3.find({"$text": {"$search": input}}, {"_id": 0}).sort("seqid", 1)
        Allresults = []
        for result in results:
            Allresults.append(result)
        return JsonResponse(Allresults, safe=False)



#gene-disease search
@csrf_exempt
def doGeneDiseaseSearch(request):
    if request.method == 'POST':
        GeneName = request.POST.get("json_data")
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        collection_hpo = connection.vcf_hpo.hpo
        collection_gtf = connection.vcf_hpo.gtf
        regx = re.compile(".*"+ GeneName +".*", re.IGNORECASE)
        results_genedisease = collection_hpo.find({"entrez_gene_symbol": regx},{"_id":0}).sort("entrz_gene_symbol",1)
        Allresults = []
        for result in results_genedisease:
            Allresults.append(result)
        return JsonResponse(Allresults, safe=False)


#DiseaseSearch
@csrf_exempt
def DiseaseSearch(request):
    if request.method == 'POST':
        disease = request.POST.get("json_data")
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)

        collection_hpo = connection.vcf_hpo.hpo
        collection_gtf = connection.vcf_hpo.gtf
        #collection_vcf = connection.vcf_hpo.autosomes
        #results_disease = collection_hpo.find({"$or":[{"HPO_Term_Name": 'Fever'},{"HPO_Term_Name": 'Episodic fever'},{"HPO_Term_Name": 'Unexplained fevers'}]})
        regx = re.compile(".*"+ disease +".*", re.IGNORECASE)
        results_disease = collection_hpo.find({"HPO_Term_Name": regx}).sort("HPO_Term_Name", 1)
        Allresults = []
        for result_disease in results_disease:
            #result = {}
            genesymbol = result_disease["entrez_gene_symbol"]
            result1 = {
                "Disease": result_disease["HPO_Term_Name"],
                "GeneName": genesymbol
            }
            results_gene = collection_gtf.find({"feature" : "gene", "attribute.gene_name" : genesymbol})
            for result_gene in results_gene:
                result2 = {
                    "seqname": result_gene["seqname"],
                    "start": result_gene["start"],
                    "end": result_gene["end"]
                }
                Allresults.append(dict(result1, **result2))
        return JsonResponse(Allresults, safe=False)


#VCF Search by Gene Name
@csrf_exempt
def doVCFSearch(request):
    if request.method == 'POST':
        GeneName = request.POST.get("GeneName")
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        #collection_hpo = connection.vcf_hpo.hpo
        collection_gtf = connection.vcf_hpo.gtf
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        #collection_vcf = connection.vcf_hpo.autosomes
        Allresults =[]
        results_gene = collection_gtf.find({"feature": "gene", "attribute.gene_name": GeneName.upper()})
        if results_gene.count() == 0:
            regx = re.compile('^'+GeneName+'$', re.IGNORECASE)
            results_gene = collection_gtf.find({"feature": "gene", "attribute.gene_name": regx})

        for result_gene in results_gene:
            seqname = result_gene["seqname"]
            chrom_start = result_gene["start"]
            chrom_end = result_gene["end"]
            results_vcf = collection_vcf.find({"CHROM": seqname, "POS": {"$gte": int(chrom_start), "$lte": int(chrom_end)}}, {"_id":0})
            for result_vcf in results_vcf:
                Allresults.append(result_vcf)
            #     Allresults.append(dict(result1, **result_vcf))
            # Allresults.append(dict(result1, **result2))
        return JsonResponse(Allresults, safe=False)

#search variant with ontology
@csrf_exempt
def doVCFSearchWithOntology(request):
    def AddOntology(results_vcf):
        hasOntology = False
        Allresults = []
        connection = MongoClient(MongodbAddrRemote)
        Goterm=[]
        IsGetGo = False
        for result_vcf in results_vcf:
            if IsGetGo== False and 'GENEINFO' in result_vcf['INFO']:
                hasOntology = True
                IsGetGo = True
                genesymbal = result_vcf['INFO']['GENEINFO'].split(':')[0]
                results_GO = connection.vcf_hpo.goa.find({"DB_Object_Symbol": genesymbal})
                Goterm = []
                for result_GO in results_GO:
                    Goterm.append(result_GO["GO_ID"])
            if "CLNDISDB" in result_vcf['INFO']:
                hasOntology = True
                CLNISDB = result_vcf['INFO']["CLNDISDB"]
                if CLNISDB:
                    if '|' in CLNISDB:
                        CLNISDBList = CLNISDB.split('|')[0].split(',')
                    else:
                        CLNISDBList = CLNISDB.split(',')
                    for ele in CLNISDBList:
                        if ele.split(':')[0] == "Human_Phenotype_Ontology":
                            result_vcf["HP"] = ele.split(':')[2]
                            break
                        elif ele.split(':')[0].upper() == "OMIM":
                            results_DO = connection.vcf_hpo.obo.find({"oboInOwlu003AhasDbXref.value": ele})
                            tmplist=[]
                            for result_DO in results_DO:
                                tmplist.append(result_DO["oboInOwlu003Aid"]["value"])
                            result_vcf["DO"] = ','.join(tmplist)

                            results_HPO = connection.vcf_hpo.hpoteam.find({"DB": "OMIM", "DB_Object_ID": ele.split(':')[1]})
                            tmplist = []
                            for result_HPO in results_HPO:
                                tmplist.append(result_HPO["HPO_ID"])
                            result_vcf["HP"] = ','.join(tmplist)
                            break
            if IsGetGo == True and Goterm:
                result_vcf["GO"] = ','.join(Goterm)

            Allresults.append(result_vcf)
        if hasOntology == False:
            return []
        return Allresults

    if request.method == 'POST':
        chr = request.POST.get("chr")
        start = request.POST.get("start")
        end = request.POST.get("end")
        ontology = request.POST.get("ontology")
        database = request.POST.get("database")
        if database == "autosomes_phase3":
            return JsonResponse([], safe=False)
        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        if ontology == "SO":
            results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)},
                                           '$or':[{"INFO.CLNVCSO": {'$exists': 'true'}},{"INFO.MC": {'$exists': 'true'}},{"INFO.SO": {'$exists': 'true'}},{"INFO.SOID": {'$exists': 'true'}}]},
                                          {"_id": 0})
        elif ontology == "GO":
            results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)},
                                           '$or':[{"INFO.GENEINFO": {'$exists': 'true'}},{"INFO.GO": {'$exists': 'true'}},{"INFO.GOID": {'$exists': 'true'}}]},
                                          {"_id": 0})
        elif ontology == "OMIM":
            results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)},
                                           '$or':[{"INFO.CLNDISDB": {'$exists': 'true'}},{"INFO.OMIM": {'$exists': 'true'}},{"INFO.OMIMID": {'$exists': 'true'}}]},
                                          {"_id": 0})
        elif ontology == "DO":
            results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)},
                                           '$or':[{"INFO.DO": {'$exists': 'true'}},{"INFO.DOID": {'$exists': 'true'}}]},
                                          {"_id": 0})
        elif ontology == "ALL":
            results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)}}, {"_id": 0})
        else:
            results_vcf=[]
        Allresults = AddOntology(results_vcf)
        # for result_vcf in results_vcf:
        #     Allresults.append(result_vcf)
        return JsonResponse(Allresults, safe=False)

#接收分片
@csrf_exempt
def doupload(request):
    if request.method == 'POST':
        md5, chunk, filedir, targetfilename = GetInfo(request)
        #保存分片
        upload_file = request.FILES['file']
        chunkfilename = '%s%s' % (md5, chunk)  # 构成该分片唯一标识符
        destination = filedir + chunkfilename
        if not os.path.exists(filedir):
            os.makedirs(filedir)
        with open(destination, 'wb') as fp:
            fp.write(upload_file.read())
        #更新mongodb
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result:
            #之前有记录, 更新
            collection.update({'filemd5': md5}, {'$push': {'chunklist': chunk}})
        else:
            collection.insert({'filemd5': md5,
                               'chunklist': [chunk],
                               'isuploadcomplete': False,
                               'filepath': filedir,
                               'filename_vcf': targetfilename,
                               'collectionName': os.path.splitext(targetfilename)[0],
                               'filename_json': os.path.splitext(targetfilename)[0] + ".json",
                               'filename_zip': os.path.splitext(targetfilename)[0] + ".zip",
                               'isconvertcomplete': False,
                               'isimportcomplete': False,
                               'iszipcomplete': False,
                               'size_vcf': request.POST.get('size')
                               })

    return HttpResponse()

#合并分片
@csrf_exempt
def uploadcomplete(request):
    if request.method == 'POST':
        md5, _, filedir, targetfilename = GetInfo(request)
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result["isuploadcomplete"]:
            return JsonResponse({"IsFirstUpdate": False, "IsImportComplete": result["isimportcomplete"]})
        else:
            chunk = 0  # 分片序号
            with open(filedir+targetfilename, 'wb') as target_file:  # 创建新文件
                while True:
                    try:
                        chunkfilename = '%s%s' % (md5, chunk)
                        with open(filedir+chunkfilename, 'rb') as fp_chunk:  # 按序打开每个分片
                            target_file.write(fp_chunk.read())  # 读取分片内容写入新文件
                    except IOError:
                        break
                    chunk += 1
                    os.remove(filedir+chunkfilename)  # 删除该分片，节约空间
            # 更新mongodb
            if result:
                collection.update({'filemd5': md5}, {'$set': {'isuploadcomplete': True}})
    return HttpResponse()


# 文件md5校验
@csrf_exempt
def uploadcheckfile(request):
    if request.method == 'POST':
        md5 = request.POST.get("fileMd5")
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        isExist = False
        if result and result['isuploadcomplete']:
            isExist = True
        response_data = {'isExist': isExist}
    return JsonResponse(response_data)



#分片校验
@csrf_exempt
def uploadcheckchunk(request):
    if request.method == 'POST':
        md5 = request.POST.get("fileMd5")
        chunk = request.POST.get('chunk', 0)
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        isExist = False
        if result and result['chunklist'] and chunk in result['chunklist']:
            isExist = True
        response_data = {'isExist': isExist}
    return JsonResponse(response_data)



def GetInfo(request):
    #task = request.POST.get('task_id')  # 获取文件的唯一标识符
    targetfilename = request.POST.get("name")
    md5 = request.POST.get('fileMd5')
    chunk = request.POST.get('chunk', 0)  # 获取该分片在所有分片中的序号
    filedir = UploadFilePath + md5 + '/'
    return md5, chunk, filedir, targetfilename


#VCF2Json
@csrf_exempt
def uploadconvert(request):
    if request.method == 'POST':
        md5 = request.POST.get("fileMd5")
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result['isconvertcomplete'] is False:
            vcfpath = result["filepath"]+result["filename_vcf"]
            jsonpath = result["filepath"]+result["filename_json"]
            filesize_vcf = int(result['size_vcf'])
            V2J = Transform()
            print("Begin transform vcf to json...")
            V2J.dotransformMain(vcfpath, jsonpath)
            # if os.path.splitext(vcfpath)[1] == ".gz" or filesize_vcf <= 100 * 1024 * 1024:
            #     vcf2json_Single(vcfpath, jsonpath)
            # else:
            #     vcf2json_multi(vcfpath, jsonpath, md5)

            collection.update({'filemd5': md5}, {'$set': {'isconvertcomplete': True}})
            zipjsonfile(collection, md5, result["filepath"], result["filename_json"])
    return HttpResponse()


#压缩json文件
def zipjsonfile(collection, md5, filepath, filename_json):
    zipfilename = filepath + os.path.splitext(filename_json)[0] + '.zip'
    with zipfile.ZipFile(zipfilename, mode='w', allowZip64=True) as zipf:
        zipf.write(filepath + filename_json, filename_json, compress_type=zipfile.ZIP_DEFLATED)
        collection.update({'filemd5': md5}, {'$set': {'iszipcomplete': True}})
    return

#Json2mongodb
@csrf_exempt
def uploadimportDB(request):
    if request.method == 'POST':
        md5 = request.POST.get("fileMd5")
        connection = MongoClient(MongodbAddrRemote)
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result['isimportcomplete'] is False:
            jsonpath = result["filepath"] + result["filename_json"]
            datacollection = connection.mydb[result['collectionName']]
            print("Begin import json file into mongo db ...")
            ImportJson2Mongodb(jsonpath, datacollection)
            print("Import json file into mongo db complete! Begin to create db index ...")
            #updatekeyfield(datacollection)
            CreatIndex(datacollection)
            print("Create db index complete!")
            addHeader2DB(md5, result["filepath"] + result["filename_vcf"], collection)
            collection.update({'filemd5': md5}, {'$set': {'isimportcomplete': True}})
            print("Upload function complete!")
    return HttpResponse()

def addHeader2DB(md5, vcfpath, collection):
    V2J = Transform()
    infofields = V2J.GetVCFHeader(vcfpath)
    collection.update({'filemd5': md5}, {'$set': {'InfoFields': ','.join(infofields)}})

#每个字段都创建索引
def CreatIndex(collection):
    map = Code("""
    function(){
        for (var key in this) { 
          emit(key, null);
        }
    }
    """)
    reduce=Code("""
        function (key, values) {
            return key;
        }
    """)
    keys = collection.map_reduce(map, reduce, out = {'inline' : 1} , full_response = True)
    for key in keys['results']:
        if key['value'].upper() in MongoIndexField:
            try:
                collection.create_index([(key['value'], 1)], background=True)
            except:
                continue
    #建立INFO字段的全文索引，暂时不用，内存消耗严重
    # collection.create_index({"INFO":'text'})
    #ontology字段创建索引
    collection.create_index(
        [('INFO.HPO', "text"), ('INFO.DO', "text"), ('INFO.SO', "text"), ('INFO.MC', "text"), ('INFO.GO', "text")],
        background=True)
    # ontologyFields = ['HPO','DO','SO','MC','GO']
    # for field in ontologyFields:
    #     #collection.create_index([('INFO.' + field, 'hashed')], background=True)
    #     collection.create_index([('INFO.' + field, "text")], background=True)
    # return

#获取表的key, 用于查询时的字段提示
def updatekeyfield(collection):
    map = Code("""
    function(){
        for (var key in this) { 
          emit(key, null);
        }
    }
    """)
    reduce=Code("""
        function (key, values) {
            return key;
        }
    """)
    collection.map_reduce(map, reduce, out="tempkey")
    connection = MongoClient(MongodbAddrRemote)
    keycollection = connection.mydb.keyfield
    # updatekeyfield_Operator(keycollection)

    results = connection.mydb.tempkey.distinct("value")
    for result in results:
        if result != "Samples" and result != "_id":
            existdata = keycollection.find_one({"value": result})
            if not existdata:
                keycollection.insert({"value": result, "category": "field"})
    #清除临时数据表数据
    connection.mydb.tempkey.remove()

    return


def updatekeyfield_Operator(collection):
    data = [
        {"value": "$ne", "category": "operator", "desc": "doesn't equal"},
        {"value": "$gt", "category": "operator", "desc": ">"},
        {"value": "$gte", "category": "operator", "desc": ">="},
        {"value": "$lt", "category": "operator", "desc": "<"},
        {"value": "$lte", "category": "operator", "desc": "<="},
        {"value": "$or", "category": "operator", "desc": "match any of"},
        {"value": "$nor", "category": "operator", "desc": "match none of"}
    ]
    for line in data:
        collection.insert(line)
    return


#获取所有表的key
@csrf_exempt
def GetKeyField(request):
    if request.method == 'POST':
        connection = MongoClient(MongodbAddrRemote)
        keycollection = connection.mydb.keyfield
        results = keycollection.find({}, {"_id": 0})
        keyfield = []
        for result in results:
            keyfield.append(result)

    return JsonResponse(keyfield, safe=False)

def ImportJson2Mongodb(filepath_json, collection):
    with open(filepath_json) as file:
        while True:
            line = file.readline()
            if not line:
                break
            else:
                #delete space and \r\n
                CountLoop(20000)
                line = '[' + line[:-2] + ']'
                line = RenameJsonKey(line)
                buf = json.loads(line)
                collection.insert_many(buf)
    return

def RenameJsonKey(strJson):
    if isinstance(strJson,dict):
        strJson = json.dumps(strJson)
    #先默认json的key中没有特殊符号
    pattern = re.compile(r"\"([\w.$:]+)\":")
    strJson = pattern.sub(lambda m: m.group(0).replace('.', "_").replace('$', "^"), strJson)
    return strJson


@csrf_exempt
def doSOInfoSearch(request):
    if request.method == 'POST':
        soinfo = request.POST.get("json_data").upper()
        connection = MongoClient(MongodbAddrRemote)
        collection_so = connection.vcf_hpo.obo
        result_ontology=[]
        if 'SO:' in soinfo or 'SOID' in soinfo:
            SOstr = 'SO_' + soinfo.split(':')[1]
            result_ontology = collection_so.find_one({"url": "http://purl.obolibrary.org/obo/" + SOstr}, {"_id":0})
        elif 'DO:' in soinfo or 'DOID' in soinfo:
            DOstr = 'DOID_' + soinfo.split(':')[1]
            result_ontology = collection_so.find_one({"url": "http://purl.obolibrary.org/obo/" + DOstr}, {"_id":0})
        elif 'HPO:' in soinfo or 'HP' in soinfo:
            HPstr = 'HP_' + soinfo.split(':')[1]
            result_ontology = collection_so.find_one({"url": "http://purl.obolibrary.org/obo/" + HPstr}, {"_id":0})
        elif 'GO:' in soinfo or 'GOID' in soinfo:
            GOstr = 'GO_' + soinfo.split(':')[1]
            result_ontology = collection_so.find_one({"url": "http://purl.obolibrary.org/obo/" + GOstr}, {"_id":0})
        return JsonResponse(result_ontology, safe=False)


@csrf_exempt
def doVariantIDSearch(request):
    if request.method == 'POST':
        variantID = request.POST.get("json_data").upper()
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        regx = re.compile(variantID, re.IGNORECASE)
        results_vcf = collection_vcf.find({"ID": regx},{"_id": 0})
        Allresults=[]
        for result_vcf in results_vcf:
            Allresults.append(result_vcf)
        return JsonResponse(Allresults, safe=False)

@csrf_exempt
def doRegionSearch(request):
    if request.method == 'POST':
        chr = request.POST.get("chr")
        start = request.POST.get("start")
        end = request.POST.get("end")
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]

        results_vcf = collection_vcf.find({"CHROM": chr, "POS": {"$gte": int(start), "$lte": int(end)}}, {"_id":0})
        Allresults=[]
        for result_vcf in results_vcf:
            Allresults.append(result_vcf)
        return JsonResponse(Allresults, safe=False)

@csrf_exempt
def doOntologySearch(request):
    if request.method == 'POST':
        ontology = request.POST.get("json_data").strip()
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        if ' ' in ontology:
            # xxx yyy ---> xxx_yyy
            newontology = ontology.replace(' ', '_')
            regx = re.compile(".*" + ontology + '.*|.*' +newontology+'.*', re.IGNORECASE)
        else:
            regx = re.compile(".*" + ontology + ".*", re.IGNORECASE)
        results_vcf = collection_vcf.find({'$or':[{"INFO.SO":regx},{"INFO.MC":regx},{"INFO.HPO":regx},{"INFO.DO":regx},{"INFO.GO":regx}]}, {"_id":0})
        #results_vcf = collection_vcf.find({"$or":[{"INFO.SO":ontology},{"INFO.MC":ontology}]},{"_id": 0})
        Allresults=[]
        for result_vcf in results_vcf:
            Allresults.append(result_vcf)
        return JsonResponse(Allresults, safe=False)

@csrf_exempt
def doGetInfoFields(request):
    if request.method == 'GET':
        database = request.GET.get("database")
        connection = MongoClient(MongodbAddrRemote)
        result_file = connection.mydb.genefile.find_one({'collectionName':database})
        Allresults = []
        if result_file and 'InfoFields' in result_file:
            Allresults.extend(result_file['InfoFields'].split(','))
        return JsonResponse(Allresults, safe=False)

