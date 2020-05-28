import py2neo
import csv
from pymongo import MongoClient
from py2neo import Graph, Node, Relationship

MongodbAddrRemote="mongodb://123.207.240.94:28019"
Datatype={"Other": 0, "Phenotype": 1, "Gene": 2, "Ontology": 3, "Region": 4, "variantID": 5}
def ExtractOntology():
    Dgraph = Graph("http://localhost:7474")
    nodecount = 0
    connection = MongoClient(MongodbAddrRemote)
    collection = connection.website.KeyDataLabel
    for node in ["DO","GO","SO"]:
        resultTerms = Dgraph.run('MATCH (n:' + node + ') RETURN n').data()
        for termDict in resultTerms:
            term = termDict["n"]
            if "name" in term:
                # 更新mongodb
                collection.insert_one({"KeyWord": term["name"], "Label": Datatype["Ontology"]})

                nodecount += 1
                if nodecount % 1000 == 0:
                    print(nodecount)

    for node in ["HPO"]:
        resultTerms = Dgraph.run('MATCH (n:' + node + ') RETURN n').data()
        for termDict in resultTerms:
            term = termDict["n"]
            if "name" in term:
                # 更新mongodb
                collection.insert_many([{"KeyWord": term["name"], "Label": Datatype["Ontology"]},
                                       {"KeyWord": term["name"], "Label": Datatype["Phenotype"]}])

                nodecount += 1
                if nodecount % 1000 == 0:
                    print(nodecount)

def ExtractGene():
    Dgraph = Graph("http://localhost:7474")
    nodecount = 0
    connection = MongoClient(MongodbAddrRemote)
    collection = connection.website.KeyDataLabel
    tmpGenelist=[]
    for node in ["GENE"]:
        resultTerms = Dgraph.run('MATCH (n:' + node + ') RETURN n').data()
        for termDict in resultTerms:
            term = termDict["n"]
            if "attribute_gene_name" in term:
                # 更新mongodb
                tmpGenelist.append({"KeyWord": term["attribute_gene_name"], "Label": Datatype["Gene"]})
                nodecount += 1
                if nodecount % 1000 == 0:
                    print(nodecount)
                    collection.insert_many(tmpGenelist)
                    tmpGenelist=[]

    collection.insert_many(tmpGenelist)

def ExtractVariantID():
    nodecount = 0
    connection = MongoClient(MongodbAddrRemote)
    collection = connection.mydb.NA12878_HG001
    tmpLinelist=[]
    AllData=collection.find({})
    for line in AllData:
        if "ID" in line:
            # 更新mongodb
            tmpLinelist.append({"KeyWord": line["ID"], "Label": Datatype["variantID"]})
            nodecount += 1
            if nodecount % 1000 == 0:
                print(nodecount)
                collection.insert_many(tmpLinelist)
                tmpLinelist=[]

    collection.insert_many(tmpLinelist)

if __name__ == '__main__':
    #ExtractOntology()
    #ExtractGene()
    ExtractVariantID()
    print("ALL done")