def findvalue(key, datalist):
    for i in datalist:
        if i.split('=')[0] == key:
            return i.split('=')[1]
    return '.'

def real():
    annovar = open('/home/qz/Desktop/clinvar_20191007.vcf','r')
    database = open('/home/qz/Downloads/annovar/humandb/hg19_clinvar_20191007.txt','w')
    # database.write('#chrom  start   end ref alt ALLELEID    CLNDN   CLNDNINCL   CLNDISDB    CLNDISDBINCL    '
    #                'CLNHGVS CLNREVSTAT  CLNSIG  CLNSIGCONF  CLNSIGINCL  CLNVC   CLNVCSO    CLNVI    DBVARID '
    #                'GENEINFO    MC  ORIGIN  RS  SSR\n')
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


if __name__ == '__main__':
    real()
    print('done')