from multiprocessing.pool import Pool

from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os
import allel
import pandas as pd
import numpy as np
import json
import time
import threading
import multiprocessing
import pickle
from lockfile import LockFile
from pymongo import MongoClient
import re
import zipfile
import zlib


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

#get download file list
@csrf_exempt
def GetDownloadfileList(request):
    if request.method == 'POST':
        connection = MongoClient("mongodb://127.0.0.1:27017")
        collection = connection.mydb.genefile
    return


#search data
@csrf_exempt
def dosearch(request):
    if request.method == 'POST':
        json_data = request.POST.get("json_data")
        condition = json.loads(json_data)
        connection = MongoClient("mongodb://127.0.0.1:27017")

    #     collection = connection.mydb.test1
    #     results = collection.find(condition, {"_id": 0})
    #
    #     response_data = []
    #     for result in results:
    #         response_data.append(result)
    #
    # return HttpResponse(json.dumps(response_data), content_type="application/text")

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
        connection = MongoClient("mongodb://127.0.0.1:27017")
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
        connection = MongoClient("mongodb://127.0.0.1:27017")
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result["isuploadcomplete"]:
            pass
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
        connection = MongoClient("mongodb://127.0.0.1:27017")
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
        connection = MongoClient("mongodb://127.0.0.1:27017")
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
    filedir = 'F:/data/File/' + md5 + '/'
    return md5, chunk, filedir, targetfilename


#VCF2Json
@csrf_exempt
def uploadconvert(request):
    if request.method == 'POST':
        md5 = request.POST.get("fileMd5")
        connection = MongoClient("mongodb://127.0.0.1:27017")
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result['isconvertcomplete'] is False:
            vcfpath = result["filepath"]+result["filename_vcf"]
            jsonpath = result["filepath"]+result["filename_json"]
            filesize_vcf = int(result['size_vcf'])
            if os.path.splitext(vcfpath)[1] == ".gz" or filesize_vcf <= 100 * 1024 * 1024:
                #100M文件以下使用单进程
                #gzip压缩文件需要用单进程处理,原因未知
                vcf2json_Single(vcfpath, jsonpath)
            else:
                # 创建进程执行转换的原因, 可以并发处理请求.
                # 转换函数会创建进程池, 使用文件进行参数传递, 为了让并发请求不共享这个文件, 所以此处创建进程
                p = multiprocessing.Process(target=vcf2json_multi, args=(vcfpath, jsonpath))
                p.start()
                p.join()
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
        connection = MongoClient("mongodb://127.0.0.1:27017")
        collection = connection.mydb.genefile
        result = collection.find_one({'filemd5': md5})
        if result and result['isimportcomplete'] is False:
            jsonpath = result["filepath"] + result["filename_json"]
            datacollection = connection.mydb[result['collectionName']]
            ImportJson2Mongodb(jsonpath, datacollection)
            collection.update({'filemd5': md5}, {'$set': {'isimportcomplete': True}})
    return HttpResponse()



def vcf2json_Single(filepath_vcf, filepath_json):

    fields, samples, headers, chunks = allel.iter_vcf_chunks(filepath_vcf, fields=['*'])
    with open(filepath_json, 'a') as fp:
        for chunker in chunks:
            recordstring = str()
            li=[]
            for i in range(0, chunker[1]):
                if i % 10000 == 0 :
                    print("i: ", i)
                recorddict1={
                    k_field[9:]: [chunker[0][k_field][i][m] for m in range(chunker[0][k_field][i].size)] if type(chunker[0][k_field][i]) == np.ndarray else chunker[0][k_field][i] for k_field in fields if 'variants/' in k_field
                }
                recorddict2={
                    "Samples": {
                        k_sample: {
                        k_field: [chunker[0][k_field][i][j][n] for n in range(chunker[0][k_field][i][j].size)] if type(chunker[0][k_field][i][j]) == np.ndarray else chunker[0][k_field][i][j] for k_field in fields if "calldata/" in k_field} for k_sample, j in zip(samples, range(0, samples.size))
                    }
                }
                recorddict = dict(recorddict1, **recorddict2)
                li.append(recorddict)
            recordstring = json.dumps(li, cls=MyEncoder) + '\n'
            fp.write(recordstring)

    return


def IoOperat_multi(chunker):
    tmpfile = "value_" + str(os.getppid()) + ".dat"
    with open(tmpfile, "rb") as f:
        fields = pickle.load(f)
        samples = pickle.load(f)
        headers = pickle.load(f)
        filepath_json = pickle.load(f)

    recordstring = str()
    li = []
    for i in range(chunker[1]):
        recorddict1 = {
            k_field[9:]: [chunker[0][k_field][i][m] for m in range(chunker[0][k_field][i].size)] if type(chunker[0][k_field][i]) == np.ndarray else chunker[0][k_field][i] for k_field in fields if 'variants/' in k_field
        }
        recorddict2 = {
            "Samples": {
                k_sample: {k_field: [chunker[0][k_field][i][j][n] for n in range(chunker[0][k_field][i][j].size)] if type(chunker[0][k_field][i][j]) == np.ndarray else chunker[0][k_field][i][j] for k_field in fields if "calldata/" in k_field} for k_sample, j in zip(samples, range(0, samples.size))
            }
        }
        recorddict = dict(recorddict1, **recorddict2)
        li.append(recorddict)
    recordstring = json.dumps(li, cls=MyEncoder) + '\n'
    lock = LockFile(filepath_json)
    lock.acquire()
    with open(filepath_json, "a") as fp:
        fp.write(recordstring)
    lock.release()
    return


def vcf2json_multi(filepath_vcf, filepath_json):

    fields, samples, headers, chunks = allel.iter_vcf_chunks(filepath_vcf, fields=['variants/*', 'calldata/*'])
    tmpfile = "value_" + str(os.getpid()) + ".dat"
    with open(tmpfile, "wb") as f:
        pickle.dump(fields, f)
        pickle.dump(samples, f)
        pickle.dump(headers, f)
        pickle.dump(filepath_json, f)

    cores = multiprocessing.cpu_count()
    pool = multiprocessing.Pool(processes=max(cores-2, 2))

    pool.map(IoOperat_multi, chunks)
    pool.close()
    pool.join()  # 主进程阻塞等待子进程的退出
    os.remove(tmpfile)  # 删除该分片，节约空间
    # time_end = time.time()
    # print("total cost: ", time_end - time_start)
    return


#json文件导入mongodb的collection
def ImportJson2Mongodb(filepath_json, collection):
    #time_start = time.time()
    #connection = MongoClient("mongodb://127.0.0.1:27017")
    #collection = connection.mydb.test2
    file = open(filepath_json)
    while True:
        line = file.readline()
        if not line:
            break
        else:
            line = RenameJsonKey(line)
            buf = json.loads(line)
            collection.insert_many(buf)
    # time_end = time.time()
    # print("save done: ", time_end-time_start)
    return

def RenameJsonKey(strJson):
    if isinstance(strJson,dict):
        strJson = json.dumps(strJson)
    #先默认json的key中没有特殊符号
    pattern = re.compile(r"\"([\w.$:]+)\":")
    strJson = pattern.sub(lambda m: m.group(0).replace('.', "_").replace('$', "^"), strJson)
    return strJson