# OntoVarSearch
## introduce
Ontology and Variants Search (OntoVarSearch) is an open web platform, in which filtering genetic data based on ontologies and
 the basic queries on user-provided VCF content are supported. In order to take advantage of several ontologies for leveraging
  knowledge across multiple biomedical fields (such as genes, diseases and phenotypes), we also develop a workflow to annotate
   user-provided VCF files with ontologies. By this way, the OntoVarSearch platform could integrate both ontologies and genetic
    data to accelerate clinical diagnosis by filtering variants effectively. This web application is developed with Python and
     can be deployed on a personal computer or server.
## features
+ Upload: OntoVarSearch accepts uncompressed or gzip-compatible compressed (*.gz) VCF files at this section
+ Download: Compressed (*.json) files which are derived from VCF files are available downloading at this section
+ Search: There are two types of search function in “search” section, one is main search in which We not only provide gene, 
location and variant search similar to other search platforms, but we also provide phenotype and ontology search methods. 
Another is custom search on variants, flexible query is support for filtering variants.
## How to use
1. pip install -r requirment.txt
2. python manage.py runserver host+port

# OntoAnnotation
**a command line tool for vcf annotation with ontology**

## How to use
1. download ANNOVAR
2. download _othercode's AnnotationTool_ in this project
3. move makeAnnovarIndex.pl into annovar dir
4. uncompress **hg38_clinvar_ontology.zip and hg19_clinvar_ontology.zip** and move to **annovar/humandb**
5. download redis, and run redis-server
6. modify MainAnnotation.conf 
7. pip install -r requirment_othercode.txt
8. python MainAnnotation.py
9. wait and the final file named "myAnno.hgxx_mutianno.vcf" will be accessed in annovar/out dir

## TIP: How to create file hgxx_clinvar_ontology.zip
hgxx_clinvar_ontology.zip contains many ontologies information from ClinVar, OBO foundry etc. 
The createion steps are as follows.
1. download ClinVar file that you want to use
2. import several files into mongodb, including GO Annotation, GO terms, HPO Annotation, HPOteam, OBO foundry etc. 
if you want create this file by yourself, pls contact us for detail.
3. run command: python createAnnovarDatabase.py clinvar_xxxx.txt hg19/hg38