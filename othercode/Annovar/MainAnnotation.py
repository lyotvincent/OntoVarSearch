import sys
import subprocess
import os
from AnnoFile import CreateDB
import configparser

refVersion = ''
annovarAddr = ''
InputVCFPath = ''
InputVCFName = ''
InputVCFPureName = ''

def PreProcess():
    #read conf
    cf = configparser.ConfigParser()
    cf.read('./MainAnnotation.conf')
    global refVersion, annovarAddr, InputVCFPath, InputVCFName, InputVCFPureName
    refVersion = cf.get("MainAnnotation", 'RefVersion').strip()
    annovarAddr = cf.get("MainAnnotation", 'AnnovarAddr').strip()
    InputVCFPath = cf.get("MainAnnotation", 'InputVCFPath').strip()
    InputVCFName = os.path.basename(InputVCFPath)
    InputVCFPureName, _ = os.path.splitext(InputVCFName)
    #create out dir
    if not os.path.exists(annovarAddr+'/out'):
        os.makedirs(annovarAddr+'/out')


#input: InputVCFPath
#output: fav.avinput
def Covert2Annovarinput():
    #./convert2annovar.pl -format vcf4old example/ex2.vcf -outfile out/ex2.avinput
    cmdlist = ['perl',  annovarAddr+'/convert2annovar.pl', '-format', 'vcf4old', InputVCFPath, '-outfile', annovarAddr + '/out/firav.avinput']
    return subprocess.check_call(cmdlist)


#input:firav.avinput
#output: firAnno.hg19_multianno.txt
def FirstAnnotate():
    #./table_annovar.pl example/ex2.avinput humandb/ -buildver hg19 -out
    # wgsanno -remove -protocol refGene,clinvar_20191007_ontology -operation g,f -nastring .
    cmdlist = ['perl',annovarAddr+'/table_annovar.pl',annovarAddr + '/out/firav.avinput',annovarAddr+'/humandb/',
               '-buildver',refVersion,'-outfile',annovarAddr+'/out/firAnno','-remove','-protocol','refGene,clinvar_ontology',
               '-operation', 'g,f', '-nastring','.']
    return subprocess.check_call(cmdlist)


#input: firAnno.hg19_multianno.txt
#output: hgxx_InputVCFName.txt
def CreateRealOntologyDB():
    input = annovarAddr+'/out/firAnno.hg19_multianno.txt'
    output = annovarAddr+ '/humandb/'+refVersion+'_'+InputVCFPureName+'_tmpdb.txt'
    return CreateDB(input, output)


#input: hgxx_InputVCFName.txt
def CreateDBindex():
    #perl makeAnnovarIndex.pl hg19_xxx.txt 1000
    cmdlist= ['perl', annovarAddr+'/makeAnnovarIndex.pl',annovarAddr+'/humandb/'+refVersion+'_'+InputVCFPureName+'_tmpdb.txt','1000']
    return subprocess.check_call(cmdlist)


#input: InputVCFPath
#output myAnno.xxx.vcf
def AnnotateVCF():
    # perl ./table_annovar.pl /out/input.vcf humandb/ -buildver hg19 -out wgs2 -remove
    # -protocol wgsanno.tmpdb -operation f -nastring . -vcfinput -polish
    cmdlist=['perl',annovarAddr+'/table_annovar.pl',InputVCFPath,annovarAddr+'/humandb/','-buildver',refVersion,
             '-outfile',annovarAddr+'/out/myAnno','-remove','-protocol',InputVCFPureName+'_tmpdb',
             '-operation','f','-nastring','.','-vcfinput','-polish']
    return subprocess.check_call(cmdlist)

if __name__ == '__main__':
    #dir exist
    PreProcess()

    try:
        # convert available input
        if Covert2Annovarinput() != 0:
            os._exit()
        print('convert complete')
        #use refgene and clinvar_ontology for annotation
        if FirstAnnotate() != 0:
            os._exit()
        print('first annotation complete')
        #create ontology database
        if CreateRealOntologyDB() != True:
            os._exit()
        print('create ontology db complete')
        #create db index
        if CreateDBindex() != 0:
            os._exit()
        print('Create db index complete')
        #use ontology database for annotation
        if AnnotateVCF() != 0:
            os._exit()
        print('All done, annotated vcf has been saved in '+annovarAddr+'/out/')

    except Exception as e:
        print(str(e))



