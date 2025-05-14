import { useEffect, useMemo, useState } from 'react'

const LayerLegend = ({
  topFactorData = null,
  data = null,
  hover = null,
  selected = null,
  show = true,
  onShow = () => { },
  handleFactorClick,
  searchByFactorInds,
  maxNumFactors = 25,
} = {}) => {
  const [factorsToShow, setFactorsToShow] = useState([]);
  const [factorsToHighlight, setFactorsToHighlight] = useState([]);
  const [SBFFactors, setSBFFactors] = useState([]);
  const [SBFFactorNames, setSBFFactorNames] = useState([]);
  const [SBFFactorInds, setSBFFactorInds] = useState([]);

  useEffect(() => {
    let fullFactorList = [];
    let SBFFactors = null;

    if (SBFFactors) {
      setSBFFactors(SBFFactors);
      setSBFFactorNames(SBFFactors.map(f => f.fullName));
      setSBFFactorInds(SBFFactors.map(f => f.ind));
    }

    if (topFactorData) {
      fullFactorList = topFactorData?.layer?.fieldColor?.domain();
    } else if (data) {
      let meta = data.meta;
      if (meta) {
        fullFactorList = (
          (meta.fields.length === 2) && (meta.fields[0] === "max_field") && (meta.fields[1] === "max_value")
        ) ? meta['full_fields'] : meta['fields'];
      }
    }

    if (fullFactorList && (fullFactorList.length <= maxNumFactors)) {
      setFactorsToShow(fullFactorList);
    } else {
      let dataToShow = selected?.data || hover?.data;
      if (dataToShow) {
        let dataToShowFactors = Object.keys(dataToShow);
        let dataToShowValues = Object.values(dataToShow);

        if ((dataToShowFactors.length === 2) && (dataToShowFactors[0] === "max_field") && (dataToShowFactors[1] === "max_value") && fullFactorList) {
          dataToShow = Object.fromEntries(
            fullFactorList.map((f, i) => {
              return [f, (fullFactorList[dataToShowValues[0]] === f) ? dataToShowValues[1] : 0]
            })
          );
          dataToShowFactors = Object.keys(dataToShow);
          dataToShowValues = Object.values(dataToShow);
        }

        if (
          (dataToShowFactors.length > 0) &&
          (dataToShowFactors.filter(f => fullFactorList?.includes(f)).length === dataToShowFactors.length)
        ) {
          let factorValues = dataToShowValues.map((v, i) => {
            return { value: v, index: i, factor: dataToShowFactors[i] }
          }).sort((f1, f2) => f2.value - f1.value);

          let factorValuesFiltered = factorValues.filter((f, i) => (f.value > 0) && (i < maxNumFactors));
          setFactorsToShow(factorValuesFiltered.map(f => f.factor));
        }
      } else if (topFactorData?.field) {
        setFactorsToShow([topFactorData?.field]);
      } else {
        setFactorsToShow([]);
      }
    }

    if (hover?.data) {
      let hoverData = hover.data;
      let hoverKeys = Object.keys(hoverData);
      if ((hoverKeys.length === 2) && (hoverKeys[0] === "max_field") && (hoverKeys[1] === "max_value") && fullFactorList) {
        let factorName = fullFactorList[hover.data?.max_field];
        hoverData = { [factorName]: hover.data.max_value };
      }
      setFactorsToHighlight(fullFactorList?.filter((f) => hoverData[f] > 0));
    }
  }, [topFactorData, data, hover, selected, maxNumFactors]);

  const handleClick = (factor) => {
    if (SBFFactors) {
      const factorInd = SBFFactorNames.indexOf(factor);
      const SBFFactorInd = SBFFactors[factorInd].ind;
      let newSBFIndices = searchByFactorInds;
      if (newSBFIndices.includes(SBFFactorInd)) {
        newSBFIndices = newSBFIndices.filter((ind) => ind !== SBFFactorInd);
      } else {
        newSBFIndices.push(SBFFactorInd);
      }
      const currentMetricFactorInds = SBFFactors.map(d => d.ind);
      newSBFIndices = newSBFIndices.filter(i => currentMetricFactorInds.includes(i));
      handleFactorClick(newSBFIndices);
    }
  }

  if (!show || factorsToShow.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-10 left-2.5 bottom-2.5 bg-white border border-primary rounded-lg flex flex-col justify-center p-2.5">
      <div>
        <strong>Factor Legend</strong>
      </div>
      <ul className="[&>li]:mt-0">
        {factorsToShow.map((f) => (
          <li key={f}
            className="relative grid grid-cols-[max-content_minmax(0,max-content)] gap-y-3.5 gap-x-2 items-center"
            onClick={() => handleClick(f)}
          >
            <span
              className="inline-block size-3 border"
              style={{
                backgroundColor: topFactorData?.layer?.fieldColor(f) || data?.layer?.fieldColor(f)
              }}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LayerLegend