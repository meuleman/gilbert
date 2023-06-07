import * as Constants from "./Constants.js";

export const isValidChromosome = (assembly, chromosomeName) => {
  // console.log(`isValidChromosome | ${assembly} | ${chromosomeName}`);
  const chromosomeBounds = Constants.assemblyBounds[assembly];
  if (!chromosomeBounds) {
    // console.log("isValidChromosome: bad or unknown assembly");
    return false; // bad or unknown assembly
  }
  const chromosomeNames = Object.keys(chromosomeBounds).map((n) => n.toLowerCase());
  if (!chromosomeNames) {
    // console.log("isValidChromosome: no chromosomes");
    return false; // no chromosomes? that would be weird
  }
  const chromosomeNamesContainsNameOfInterest = (chromosomeNames.indexOf(chromosomeName.toLowerCase()) > -1);
  return chromosomeNamesContainsNameOfInterest;
}

export const getRangeFromString = (str, applyPadding, applyApplicationBinShift, assembly) => {
  console.log(`Helpers.getRangeFromString ${str} ${applyPadding} ${applyApplicationBinShift} ${assembly}`);
  if (!applyApplicationBinShift) applyApplicationBinShift = false;
  /*
    Test if the new location passes as a chrN:X-Y pattern, 
    where "chrN" is an allowed chromosome name, and X and Y 
    are integers, and X < Y. 
    
    We allow chromosome positions X and Y to contain commas, 
    to allow cut-and-paste from the UCSC genome browser.
  */
  let matches = str.replace(/,/g, '').split(/[:-\s]+/g).filter( i => i );
  let chrom = "";
  let start = -1;
  let stop = -1;
  console.log("matches", matches);
  if (matches.length === 3) {
    chrom = matches[0];
    if (!isValidChromosome(assembly, chrom)) {
      return null;
    }
    chrom = getTrueChromosomeName(assembly, chrom);
    start = parseInt(matches[1].replace(',',''));
    stop = parseInt(matches[2].replace(',',''));
    if (applyPadding) {
      start -= parseInt(Constants.appDefaultRegionUpstreamPadding);
      stop += parseInt(Constants.appDefaultRegionDownstreamPadding);
    }
  }
  else if (matches.length === 2) {
    chrom = matches[0];
    if (!isValidChromosome(assembly, chrom)) {
      return null;
    }
    chrom = getTrueChromosomeName(assembly, chrom);
    let midpoint = parseInt(matches[1].replace(',',''));
    start = midpoint - parseInt(Constants.appDefaultRegionUpstreamPadding);
    stop = midpoint + parseInt(Constants.appDefaultRegionDownstreamPadding);
  }
  else if (matches.length === 1) {
    chrom = matches[0];
    if (!isValidChromosome(assembly, chrom)) {
      return null;
    }
    chrom = getTrueChromosomeName(assembly, chrom);
    if (Constants.assemblyChromosomes[assembly].includes(chrom)) {
      start = 1
      stop = Constants.assemblyBounds[assembly][chrom]['ub'] - 1;
    }
  }
  else {
    return null;
  }
  // console.log("chrom, start, stop", chrom, start, stop);
  // let padding = (applyPadding) ? parseInt(Constants.defaultGenePaddingFraction * (stop - start)) : 0;
  // let assembly = this.state.hgViewParams.genome;
  // let chrLimit = parseInt(Constants.assemblyBounds[assembly][chrom].ub) - 10;
  //
  // Constants.applicationBinShift applies a single-bin correction to the padding 
  // applied to the specified range (exemplar, etc.). It is not perfect but helps 
  // when applying a vertical line on selected exemplars.
  //
  // start = ((start - padding + (applyApplicationBinShift ? Constants.applicationBinShift : 0)) > 0) ? (start - padding + (applyApplicationBinShift ? Constants.applicationBinShift : 0)) : 0;
  // stop = ((stop + padding + (applyApplicationBinShift ? Constants.applicationBinShift : 0)) < chrLimit) ? (stop + padding + (applyApplicationBinShift ? Constants.applicationBinShift : 0)) : stop;
  if (start < 0) {
    start = 0;
  }
  if (stop >= Constants.assemblyBounds[assembly][chrom]['ub']) {
    stop = Constants.assemblyBounds[assembly][chrom]['ub'];
  }
  // const range = [chrom, start, stop];
  const range = {
    'chrom': chrom,
    'start': start,
    'stop': stop,
  };
  // console.log("range", range);
  return range;
}

export const getTrueChromosomeName = (assembly, chromosomeName) => {
  let chromosomeBounds = Constants.assemblyBounds[assembly];
  if (!chromosomeBounds) {
    // console.log("fixChromosomeName: bad or unknown assembly");
    return null; // bad or unknown assembly
  }
  const chromosomeNamesOriginal = Object.keys(chromosomeBounds);
  const chromosomeNamesLC = chromosomeNamesOriginal.map((n) => n.toLowerCase());
  if (!chromosomeNamesOriginal) {
    // console.log("fixChromosomeName: no chromosomes");
    return null; // no chromosomes? that would be weird
  }
  let indexOfChromosomeNameOfInterest = chromosomeNamesLC.indexOf(chromosomeName.toLowerCase());
  // console.log(`chromosomeNamesLC.indexOf(chromosomeName.toLowerCase()) ${chromosomeNamesLC.indexOf(chromosomeName.toLowerCase())}`);
  return chromosomeNamesOriginal[indexOfChromosomeNameOfInterest];
}

export const log10 = (val) => Math.log(val) / Math.LN10;

export const calculateScale = (leftChr, rightChr, start, stop, self, includeAssembly) => {
  //
  // get current scale difference
  //
  let diff = 0;
  let log10Diff = 0;
  let scaleAsStr = "";
  const chromsAreIdentical = (leftChr === rightChr);
  if (chromsAreIdentical) {
    diff = parseInt(stop) - parseInt(start);
  }
  else {
    //console.log(`updateScale > chromosomes are different`);
    const leftDiff = parseInt(Constants.assemblyBounds[self.state.assembly][leftChr]['ub']) - parseInt(start);
    const rightDiff = parseInt(stop);
    const allChrs = Object.keys(Constants.assemblyBounds[self.state.assembly]).sort((a, b) => { return parseInt(a.replace("chr", "")) - parseInt(b.replace("chr", "")); });
    //console.log(`leftChr ${leftChr} | rightChr ${rightChr} | start ${start} | stop ${stop} | leftDiff ${leftDiff} | rightDiff ${rightDiff} | allChrs ${allChrs}`);
    let log10DiffFlag = false;
    for (let i = 0; i < allChrs.length; i++) {
      const currentChr = allChrs[i];
      if (currentChr === leftChr) {
        //console.log(`adding ${leftDiff} for chromosome ${currentChr}`);
        diff += (leftDiff > 0) ? leftDiff : 1;
        log10DiffFlag = true;
      }
      else if (currentChr === rightChr) {
        //console.log(`adding ${rightDiff} for chromosome ${currentChr}`);
        diff += (rightDiff > 0) ? rightDiff : 1;
        log10DiffFlag = false;
        break;
      }
      else if (log10DiffFlag) {
        //console.log(`adding ${Constants.assemblyBounds[self.state.assembly][currentChr]['ub']} for chromosome ${currentChr}`);
        diff += Constants.assemblyBounds[self.state.assembly][currentChr]['ub'];
      }
    }
  }
  //console.log(`calculateScale ${diff}`);
  log10Diff = log10(diff);
  scaleAsStr = (log10Diff < 3) ? `${Math.ceil(diff/100)*100}nt` :
               (log10Diff < 4) ? `${Math.floor(diff/1000)}kb` :
               (log10Diff < 5) ? `${Math.floor(diff/1000)}kb` :
               (log10Diff < 6) ? `${Math.floor(diff/1000)}kb` :
               (log10Diff < 7) ? `${Math.floor(diff/1000000)}Mb` :
               (log10Diff < 8) ? `${Math.floor(diff/1000000)}Mb` :
               (log10Diff < 9) ? `${Math.floor(diff/1000000)}Mb` :
                                 `${Math.floor(diff/1000000000)}Gb`;
  // scaleAsStr = `(~${scaleAsStr})`;
  scaleAsStr = (includeAssembly) ? `(~${scaleAsStr} | ${self.state.assembly})` : `(~${scaleAsStr})`;
  return { 
    diff: diff, 
    scaleAsStr: scaleAsStr,
    chromsAreIdentical: chromsAreIdentical
  };
}