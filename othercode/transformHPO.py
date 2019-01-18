import json
import numpy as np


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32,
                              np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return list(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        else:
            return json.JSONEncoder.default(self, obj)

if __name__ == '__main__':
    filename = "F:\data\hpoterm.txt"
    outputfile = "F:\data\hpoterm.json"
    Fields = ['entrez_gene_id', 'entrez_gene_symbol', 'HPO_Term_Name', 'HPO_Term_ID']
    with open(outputfile, 'a') as outfp:
        with open(filename, 'r') as fp:
            for line in fp:
                if line[0] == '#':
                    continue
                tabstr = line.strip('\n').split('\t')
                record = {
                    item : tabstr[i] for item,i in zip(Fields,range(len(Fields)))
                }
                recordstring = json.dumps(record, cls=MyEncoder) + '\n'
                outfp.write(recordstring)

