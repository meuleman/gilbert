export const annotationScheme = "https";
export const annotationHost = "annotations.altius.org";
export const annotationPort = "8443"; // SSL over 8443

export const mapIndexDHSScheme = "https";
export const mapIndexDHSHost = "meuleman-map-index-dhs.altius.org";
export const mapIndexDHSPort = "443";
export const mapIndexDHSSetName = "Index_DHS";

export const appDefaultIndexDHSPadding = 250;
export const appDefaultRegionUpstreamPadding = 5000;
export const appDefaultRegionDownstreamPadding = 5000;

export const appDefaultAutocompleteInputPlaceholder = "Specify an interval or gene";

export const appDefaultAssembly = 'hg38';

export const assemblyChromosomes = {
    'hg19':[
      'chr1', 'chr2', 'chr3', 'chr4', 'chr5', 'chr6', 'chr7', 'chr8', 'chr9', 'chr10', 'chr11', 'chr12', 'chr13', 'chr14', 'chr15', 'chr16', 'chr17', 'chr18', 'chr19', 'chr20', 'chr21', 'chr22', 'chrX', 'chrY'
    ],
    'hg38':[
      'chr1', 'chr2', 'chr3', 'chr4', 'chr5', 'chr6', 'chr7', 'chr8', 'chr9', 'chr10', 'chr11', 'chr12', 'chr13', 'chr14', 'chr15', 'chr16', 'chr17', 'chr18', 'chr19', 'chr20', 'chr21', 'chr22', 'chrX', 'chrY'
    ],
    'mm10':[
      'chr1', 'chr2', 'chr3', 'chr4', 'chr5', 'chr6', 'chr7', 'chr8', 'chr9', 'chr10', 'chr11', 'chr12', 'chr13', 'chr14', 'chr15', 'chr16', 'chr17', 'chr18', 'chr19', 'chrX', 'chrY'
    ]
  };
  
  export const assemblyBounds = {
    'hg19':{
      'chr1':{'ub':249250621},
      'chr2':{'ub':243199373},
      'chr3':{'ub':198022430},
      'chr4':{'ub':191154276},
      'chr5':{'ub':180915260},
      'chr6':{'ub':171115067},
      'chr7':{'ub':159138663},
      'chr8':{'ub':146364022},
      'chr9':{'ub':141213431},
      'chr10':{'ub':135534747},
      'chr11':{'ub':135006516},
      'chr12':{'ub':133851895},
      'chr13':{'ub':115169878},
      'chr14':{'ub':107349540},
      'chr15':{'ub':102531392},
      'chr16':{'ub':90354753},
      'chr17':{'ub':81195210},
      'chr18':{'ub':78077248},
      'chr19':{'ub':59128983},
      'chr20':{'ub':63025520},
      'chr22':{'ub':51304566},
      'chr21':{'ub':48129895},
      'chrX':{'ub':155270560},
      'chrY':{'ub':59373566},
    },
    'hg38':{
      'chr1':{'ub':248956422},
      'chr10':{'ub':133797422},
      'chr11':{'ub':135086622},
      'chr12':{'ub':133275309},
      'chr13':{'ub':114364328},
      'chr14':{'ub':107043718},
      'chr15':{'ub':101991189}, 
      'chr16':{'ub':90338345},
      'chr17':{'ub':83257441},
      'chr18':{'ub':80373285},
      'chr19':{'ub':58617616},
      'chr2':{'ub':242193529},
      'chr20':{'ub':64444167},
      'chr21':{'ub':46709983},
      'chr22':{'ub':50818468},
      'chr3':{'ub':198295559},
      'chr4':{'ub':190214555},
      'chr5':{'ub':181538259},
      'chr6':{'ub':170805979},
      'chr7':{'ub':159345973},
      'chr8':{'ub':145138636},
      'chr9':{'ub':138394717},
      'chrX':{'ub':156040895},
      'chrY':{'ub':57227415},
    },
    'mm10':{
      'chr1':{'ub':195471971},
      'chr10':{'ub':130694993},
      'chr11':{'ub':122082543},
      'chr12':{'ub':120129022},
      'chr13':{'ub':120421639},
      'chr14':{'ub':124902244},
      'chr15':{'ub':104043685},
      'chr16':{'ub':98207768},
      'chr17':{'ub':94987271},
      'chr18':{'ub':90702639},
      'chr19':{'ub':61431566},
      'chr2':{'ub':182113224},
      'chr3':{'ub':160039680},
      'chr4':{'ub':156508116},
      'chr5':{'ub':151834684},
      'chr6':{'ub':149736546},
      'chr7':{'ub':145441459},
      'chr8':{'ub':129401213},
      'chr9':{'ub':124595110},
      'chrX':{'ub':171031299},
      'chrY':{'ub':91744698},
    },
  };