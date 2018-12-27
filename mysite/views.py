from bson import Code
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt, csrf_protect
import os
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

    def dotranform(self, filepath_vcf, mode, IsAddHead):
        TransformV2J.dotranform(self, filepath_vcf, mode, IsAddHead)

    # with output path
    def dotransformWithOutPath(self, filepath_vcf, filepath_json, mode, IsAddHead):
        TransformV2J.dotransformWithOutPath(self, filepath_vcf, filepath_json, mode, IsAddHead)

    def preview(self, filepath_vcf, mode):
        return TransformV2J.preview(self, filepath_vcf, mode)

UploadFilePath = "C:/Project/vcf2json_file/"
#UploadFilePath = 'E:\\project\\GeneSearch'
MongodbAddrLocal = "mongodb://127.0.0.1:27017"
MongodbAddrRemote = "mongodb://123.207.240.94:27017"
MongoIndexField = ['CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'SEQNAME', 'FEATURE', 'START', 'END', 'ENTREZ_GENE_ID', 'ENTREZ_GENE_SYMBOL','HPO_TERM_NAME','HPO_TERM_ID']


def html_index(request):
    return render(request, "index.html")

def html_upload(request):
    return render(request, "upload.html")

def html_search(request):
    return render(request, "search.html")

def html_about(request):
    return render(request, "about.html")

def html_browse(request):
    return render(request, "browse.html")

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


#search data
@csrf_exempt
def doexactSearch(request):
    if request.method == 'POST':
        json_data = request.POST.get("condition")
        database = request.POST.get("database")
        condition = json.loads(json_data)
        connection = MongoClient(MongodbAddrRemote)
        if database in connection.mydb.collection_names():
            collection_vcf = connection.mydb[database]
        else:
            collection_vcf = connection.vcf_hpo[database]
        #collection_vcf = connection.vcf_hpo.autosomes
        Allresults=[]
        results = collection_vcf.find(condition, {"_id": 0})
        for result in results:
            Allresults.append(result)
    return JsonResponse(Allresults, safe=False)


#DiseaseSearch
@csrf_exempt
def DiseaseSearch(request):
    if request.method == 'POST':
        disease = request.POST.get("json_data")
        database = request.POST.get("database")
        connection = MongoClient(MongodbAddrRemote)
        # if database in connection.mydb.collection_names():
        #     collection_vcf = connection.mydb[database]
        # else
        #     collection_vcf = connection.vcf_hpo[database]

        collection_hpo = connection.vcf_hpo.hpo
        collection_gtf = connection.vcf_hpo.gtf
        #collection_vcf = connection.vcf_hpo.autosomes

        regx = re.compile(".*"+ disease +".*", re.IGNORECASE)
        results_disease = collection_hpo.find({"HPO_Term_Name": regx}).sort("HPO_Term_Name",1)
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


#GeneSearch
@csrf_exempt
def GeneSearch(request):
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
        results_gene = collection_gtf.find({"feature" : "gene", "attribute.gene_name" : GeneName})
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
        result = collection.find_one({'filem0d5': md5})
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
            V2J.dotransformWithOutPath(vcfpath,jsonpath, mode='MergeAll', IsAddHead=False)
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
            ImportJson2Mongodb(jsonpath, datacollection)
            updatekeyfield(datacollection)
            CreatIndex(datacollection)
            collection.update({'filemd5': md5}, {'$set': {'isimportcomplete': True}})
    return HttpResponse()

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
            collection.create_index([(key['value'], 1)], background=True)
    return

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