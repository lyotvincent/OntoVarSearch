# OGS

**A web platform to search ontology and genetic data**  


Ontology and Genetic data Search (OGS) is an open web platform to search ontology and genetic variation. It could help researchers identify genetic variants by uploading their own VCF files as database. Meanwhile, it is not limited to genetic variants, but could also be comprised ontology like human phenotype ontology (HPO). Currently, OGS contains 130,000 records of ontology annotations, about 2,700,000 records of genes and more than 79 million variants data.

+ Upload: OGS accepts uncompressed or gzip-compatible compressed (*.gz) VCF files at this section
+ Download: Compressed (*.json) files which are derived from VCF files are available downloading at this section
+ Search: There are two
 
 93522;[ltypes of search function in “search” section, one is gene and disease search in which human disease and gene name are mandatory. After input a disease word or gene name, the result table will show diseases name, gene name, etc. When choosing a database (VCF files) and clicking the gene name at result table, the corresponding variations are shown in below. Another is custom search for variants, flexible query is support for filtering variants.


#OGS annotation tool
**a workflow for vcf annotation with ontology**
## introduce
annotate vcf file with ontology
## How to use
1. download annovar
2. download _othercode's AnnoTool_ in this project
3. move makeAnnovarIndex.pl into annovar dir
4. download redis, and run redis-server
5. download ontology database for annovar and then add them into annovar' humandb
6. modify MainAnnotation.conf
7. pip install -r requirment_othercode.txt
8. python MainAnnotation.py
9. wait and the final file named "myAnno.hgxx_mutianno.vcf" will be accessed in annovar' out dir

