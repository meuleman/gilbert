import React, { Component, Fragment } from "react";
import { DebounceInput } from "react-debounce-input";
import PropTypes from 'prop-types';
import axios from "axios";

import * as Helpers from "./Helpers.js";
import * as Constants from "./Constants.js";

import './Autocomplete.css';

class Autocomplete extends Component {

  constructor(props) {
    super(props);

    this.state = {
      inputKey: 'autocomplete-key-0',
      inputKeyIdx: 1,
      // The active selection's index
      activeSuggestion: -1,
      // The suggestions that match the user's input
      filteredSuggestions: [],
      // Whether or not the suggestion list is shown
      showSuggestions: false,
      // What the user has entered
      userInput: "",
      // Selected annotation location
      selectedSuggestionLocation: "",
      // Debounce timeout interval (ms)
      debounceTimeout: 15,
      minimumLength: 0,
      // Minimum length before lookup
      queryMinimumLength: 2,
      // Maintain flag for focus state
      isInFocus: false,
    };

    this.inputRef = React.createRef();

    this.inFocusStyle = {
      borderColor: 'rgba(255, 255, 255, 0.75)',
      borderWidth: 'thin',
      borderStyle: 'solid',
      boxSizing: 'border-box',
      // backgroundPosition: '9px 7px',
      // transition: 'all 0.5s ease-in, background-position 0s',
    };

    this.inBlurStyle = {
      borderColor: 'rgba(0, 0, 0, 0)',
      borderWidth: 'unset',
      borderStyle: 'unset',
      boxSizing: 'border-box',
      // backgroundPosition: '9px 8px',
      // transition: 'all 0.5s ease-in, background-position 0s',
    };

    this.applyFocusTimeoutMs = 250;
    this.applyBlurTimeoutMs = 250;
  }
  
  componentDidMount() {}
  
  clearUserInput = () => {
    this.setState({
      userInput: '',
      activeSuggestion: -1,
    }, () => {
      this.inputRef.value = '';
      this.props.onChangeInput && this.props.onChangeInput(this.state.userInput);
    });
  }

  isValidChromosome = (assembly, chr) => Constants.assemblyChromosomes[assembly].includes(chr) !== -1;

  applyFocus = () => {
    let newUserInput = this.inputRef.value.replace(/\//g, '');
    this.setState({
      userInput: newUserInput,
      isInFocus: true,
    }, () => {
      this.inputRef.value = newUserInput;
      setTimeout(() => { 
        this.inputRef.focus();
      }, this.applyFocusTimeoutMs);
    });
  }

  // eslint-disable-next-line no-unused-vars
  onFocus = (e) => {
    if (this.state.isInFocus) return;
    let newUserInput = this.inputRef.value.replace(/\//g, '');
    this.setState({
      userInput: newUserInput,
      isInFocus: true,
    }, () => {
      this.props.onPostFocus && this.props.onPostFocus(); // close drawer or do any other post-focus work
    });
  }

  // eslint-disable-next-line no-unused-vars
  onBlur = (e) => {
    if (!this.inputRef) return;
    setTimeout(() => {
      this.setState({
        userInput: '',
        isInFocus: false
      }, () => {
        this.inputRef.value = '';
      });
    }, 500);
  }

  // eslint-disable-next-line no-unused-vars
  onPaste = (e) => {
    setTimeout(() => {
      try {
        this.props.onChangeInput && this.props.onChangeInput(this.inputRef.value);
        const pastedRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
          true, 
          null,
          this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
        );
        if (pastedRegion) {
          this.props.onChangeLocation && this.props.onChangeLocation({
            ...pastedRegion, 
            type: 'interval',
          });
        }
      }
      catch(err) {
        console.log(`${this.inputRef} | ${err}`);
      };
    }, 500);
  }

  onChange = (e) => {    
    if (!e.target) return;

    if (e.target.value.length === 0) {
      this.setState({
        showSuggestions: false
      });
    }

    if ((Helpers.isValidChromosome((this.props.annotationAssemblyRaw || Constants.appDefaultAssembly), e.target.value)) || ((e.target.value.startsWith("chr")) && ((e.target.value.indexOf(":") !== -1) || (e.target.value.indexOf('\t') !== -1) || (e.target.value.indexOf(" ") !== -1)))) {
      this.setState({
        showSuggestions: false,
        userInput: e.target.value
      }, () => {});
      return;
    }

    const queryAnnotationHost = () => {
      const annotationUrl = (this.props.annotationScheme || Constants.annotationScheme) 
        + "://" 
        + (this.props.annotationHost || Constants.annotationHost)
        + ":" 
        + (this.props.annotationPort || Constants.annotationPort)
        + "/sets?q=" 
        + this.state.userInput.trim() 
        + "&assembly=" 
        + (this.props.annotationAssembly || `${Constants.appDefaultAssembly}_GENCODE_v38`);
      axios.get(annotationUrl)
        .then((res) => {
          if (res.data.hits) {
            let hitNames = Object.keys(res.data.hits);
            let hitObjects = [];
            hitNames.forEach((hitName) => {
              let hitArray = res.data.hits[hitName];
              hitArray.forEach((withinHitObj) => {
                withinHitObj['location'] = withinHitObj['chrom'] + ":" + withinHitObj['start'] + "-" + withinHitObj['stop'];
                hitObjects.push(withinHitObj);
              });
            });
            const filteredSuggestions = hitObjects;
            this.setState({
              activeSuggestion: -1,
              filteredSuggestions,
              showSuggestions: true
            });
          }
        })
        // eslint-disable-next-line no-unused-vars
        .catch((err) => {
          // this could be the name of a valid chromosome
          if (this.isValidChromosome((this.props.annotationAssemblyRaw || Constants.appDefaultAssembly), this.state.userInput.trim())) {
            this.props.onChangeInput && this.props.onChangeInput(this.state.userInput);
          }
        });
    }

    if (!e.target.value.startsWith('/')) {
      this.setState({ 
        userInput: e.target.value 
      }, () => { 
        if (this.state.userInput.length >= this.state.queryMinimumLength) {
          if (!/^([XY0-9]{1,2}.[0-9]{1,})$/.test(this.state.userInput)) {
            queryAnnotationHost();
          }
        }
        this.props.onChangeInput && this.props.onChangeInput(this.state.userInput);
      });
    }
    else {
      let newUserInput = e.target.value.replace(/\//g, '');
      this.setState({
        userInput: newUserInput
      }, () => {
        this.inputRef.value = newUserInput;
      });
    }
  }

  onClick = (e) => {
    const selectedSuggestionName = e.currentTarget.getElementsByClassName("suggestion-name")[0].innerText;
    const selectedSuggestionLocation = e.currentTarget.getElementsByClassName("suggestion-location")[0].innerText;
    this.setState({
      activeSuggestion: -1,
      filteredSuggestions: [],
      showSuggestions: false,
      userInput: selectedSuggestionName,
      selectedSuggestionLocation: selectedSuggestionLocation
    }, 
    () => {
      const clickedSuggestionRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
        true, 
        null,
        this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
      );
      if (clickedSuggestionRegion) {
        this.props.onChangeLocation && this.props.onChangeLocation({
          ...clickedSuggestionRegion, 
          type: 'gene', 
          name: selectedSuggestionName, 
          location: selectedSuggestionLocation
        });
      }
      this.clearUserInput();
    });
  };

  onKeyDown = e => {
    const { activeSuggestion } = this.state;
    
    // console.log("e.keyCode", e.keyCode);

    const ESCAPE_KEY = 27;
    const RETURN_KEY = 13;
    const LEFT_ARROW_KEY = 37;
    const UP_ARROW_KEY = 38;
    const RIGHT_ARROW_KEY = 39;
    const DOWN_ARROW_KEY = 40;
    const FORWARD_SLASH_KEY = 191;
    const DELETE_KEY = 8;

    // console.log(`Autocomplete - onKeyDown() - e.keyCode ${e.keyCode}`);
    switch (e.keyCode) {
      case DELETE_KEY: {
        // console.log(`Autocomplete - onKeyDown() - DELETE_KEY - this.state.userInput - ${this.state.userInput}`);
        if (this.state.userInput.length === 1) {
          this.clearUserInput();
        }
        break;
      }
      case FORWARD_SLASH_KEY: {
        // console.log(`Autocomplete - onKeyDown() - FORWARD_SLASH_KEY - this.state.userInput - ${this.state.userInput}`);
        let newUserInput = this.state.userInput.replace(/\//g, '');
        // console.log(`Autocomplete - onKeyDown() - FORWARD_SLASH_KEY - newUserInput - ${newUserInput}`);
        this.setState({
          userInput: newUserInput
        }, () => {
          this.inputRef.value = newUserInput;
        });
        break;
      }
      case ESCAPE_KEY: {
        this.clearUserInput();
        setTimeout(() => {
          this.inputRef.blur();
        }, this.applyBlurTimeoutMs);
        break;
      }
      case RETURN_KEY: {
        // if (this.state.activeSuggestion === -1 && !this.state.userInput.startsWith("chr")) {
        //   return;
        // }
        setTimeout(() => {
          // console.log(`this.state.userInput ${this.state.userInput}`);
          let colonDashTest = this.state.userInput.startsWith("chr") && (this.state.userInput.indexOf(":") !== -1);
          let whitespaceOnlyTest = this.state.userInput.startsWith("chr") && (/^[\S]+(\s+[\S]+)+$/.test(this.state.userInput));
          let chromosomeOnlyTest = (/^chr([a-zA-Z0-9]+)$/.test(this.state.userInput)) && this.isValidChromosome((this.props.annotationAssemblyRaw || Constants.appDefaultAssembly), this.state.userInput);
          let indexDHSIdentifierTest = /^([XY0-9]{1,2}.[0-9]{1,})$/.test(this.state.userInput);
          // console.log(`colonDashTest ${colonDashTest}`);
          // console.log(`whitespaceOnlyTest ${whitespaceOnlyTest}`);
          // console.log(`chromosomeOnlyTest ${chromosomeOnlyTest}`);
          // console.log(`indexDHSIdentifierTest ${indexDHSIdentifierTest}`);
          if (indexDHSIdentifierTest) {
            const mapUrl = (this.props.mapIndexDHSScheme || Constants.mapIndexDHSScheme) 
              + "://" 
              + (this.props.mapIndexDHSHost || Constants.mapIndexDHSHost) 
              + ":" 
              + (this.props.mapIndexDHSPort || Constants.mapIndexDHSPort) 
              + "/annotation?set=" 
              + (this.props.mapIndexDHSSetName || Constants.mapIndexDHSSetName)
              + "&identifier=" 
              + this.state.userInput.trim();
            axios.get(mapUrl)
              .then((res) => {
                if (res.data.data) {
                  const hit = res.data.data;
                  const indexDHSLocation = `${hit.seqname}:${parseInt(hit.start) - Constants.appDefaultIndexDHSPadding}-${parseInt(hit.end) + Constants.appDefaultIndexDHSPadding}`;
                  this.setState({
                    activeSuggestion: -1,
                    filteredSuggestions: [],
                    showSuggestions: false,
                    selectedSuggestionLocation: indexDHSLocation
                  }, 
                  () => { 
                    const indexDHSRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
                      false, 
                      null,
                      this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
                    );
                    if (indexDHSRegion) {
                      this.props.onChangeLocation && this.props.onChangeLocation({
                        ...indexDHSRegion, 
                        type: 'Index_DHS', 
                        name: this.state.userInput.trim(), 
                        location: indexDHSLocation
                      });
                    }
                    this.clearUserInput();
                  });
                }
              })
              // eslint-disable-next-line no-unused-vars
              .catch((err) => {
                if (err && err.response && err.response.status && err.response.status === 404) {
                  this.setState({
                    activeSuggestion: -1,
                    filteredSuggestions: [],
                    showSuggestions: false,
                  }, 
                  () => { 
                    this.clearUserInput();
                  });
                }
              });
            return;
          }
          else if (Helpers.isValidChromosome((this.props.annotationAssemblyRaw || Constants.appDefaultAssembly), this.state.userInput)) {
            const chromosomeRange = Helpers.getRangeFromString(this.state.userInput, false, false, (this.props.annotationAssemblyRaw || Constants.appDefaultAssembly));
            if (chromosomeRange) {
              const chromosomeRangeLocation = `${chromosomeRange.chrom}:${chromosomeRange.start}-${chromosomeRange.stop}`;
              this.setState({
                activeSuggestion: -1,
                filteredSuggestions: [],
                showSuggestions: false,
                selectedSuggestionLocation: chromosomeRangeLocation,
              });
            }
          }
          else if ((colonDashTest || whitespaceOnlyTest || chromosomeOnlyTest) && (this.state.activeSuggestion === -1)) {
            let newUserInput = "";
            let newLocation = this.state.userInput;
            this.setState({
              activeSuggestion: 0,
              showSuggestions: false,
              userInput: newUserInput,
              selectedSuggestionLocation: newLocation,
            }, () => { 
              const arbitraryRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
                false, 
                null,
                this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
              );
              if (arbitraryRegion) {
                this.props.onChangeLocation && this.props.onChangeLocation({
                  ...arbitraryRegion,
                  type: 'interval',
                });
              }
              this.clearUserInput();
            });
            return;
          }
          else {
            const interval = Helpers.getRangeFromString(this.state.userInput, false, false, (this.props.annotationAssemblyRaw || Constants.appDefaultAssembly));
            if (interval) {
              const intervalRangeLocation = `${interval.chrom}:${interval.start}-${interval.stop}`;
              this.setState({
                activeSuggestion: -1,
                filteredSuggestions: [],
                showSuggestions: false,
                selectedSuggestionLocation: intervalRangeLocation
              }, () => {
                const arbitraryGenomicRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
                  false, 
                  null,
                  this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
                );
                if (arbitraryGenomicRegion) {
                  this.props.onChangeLocation && this.props.onChangeLocation({
                    ...arbitraryGenomicRegion,
                    type: 'interval',
                  });
                }
                this.clearUserInput();
              });
              return;
            }
          }
          let newUserInput = "";
          let newLocation = "";
          if (typeof this.state.filteredSuggestions[this.state.activeSuggestion] !== "undefined") {
            newUserInput = this.state.filteredSuggestions[this.state.activeSuggestion].name;
            newLocation = this.state.filteredSuggestions[this.state.activeSuggestion].location
          }
          else {
            newUserInput = this.state.userInput;
            newLocation = this.state.userInput;
          }
          this.setState({
            activeSuggestion: 0,
            showSuggestions: false,
            userInput: newUserInput,
            selectedSuggestionLocation: newLocation
          }, () => { 
            const queriedAnnotationRegion = Helpers.getRangeFromString(this.state.selectedSuggestionLocation, 
              true, 
              null,
              this.props.annotationAssemblyRaw || Constants.appDefaultAssembly
            );
            if (queriedAnnotationRegion) {
              this.props.onChangeLocation && this.props.onChangeLocation({
                ...queriedAnnotationRegion,
                type: 'annotation',
                name: newUserInput,
              });
            }
            this.clearUserInput();
            this.inputRef.blur();
          });
        }, this.state.debounceTimeout);
        break;
      }
      case LEFT_ARROW_KEY:
      case RIGHT_ARROW_KEY:
        break;
      case UP_ARROW_KEY: {
        if (this.state.activeSuggestion === 0) {
          return;
        }
        this.setState({ activeSuggestion: activeSuggestion - 1 }, () => { 
          // console.log("scrolling to suggestion:", this.state.activeSuggestion);
          this.scrollToActiveSuggestion() 
        });
        break;
      }
      case DOWN_ARROW_KEY: {
        if ((this.state.activeSuggestion + 1) === this.state.filteredSuggestions.length) {
          return;
        }
        else {
          this.setState({ activeSuggestion: this.state.activeSuggestion + 1 }, () => { 
            // console.log("scrolling to suggestion:", this.state.activeSuggestion); 
            this.scrollToActiveSuggestion() 
          });
        }
        break;
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
  onMouseEnter = (e) => {
    // console.log(`onMouseEnter`);
  }

  // eslint-disable-next-line no-unused-vars
  onMouseLeave = (e) => {
    // console.log(`onMouseLeave`);
  }
  
  scrollToActiveSuggestion = () => {
    let element = document.getElementById("suggestion-" + this.state.activeSuggestion);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end', 
        inline: 'nearest'
      });
    }
  }

  render() {
    const {
      onKeyDown,
      state: {
        activeSuggestion,
        filteredSuggestions,
        showSuggestions,
      }
    } = this;

    let suggestionsListComponent;

    if (showSuggestions && this.state.userInput) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <div className="suggestions">
          <ul style={(this.props.maxSuggestionHeight)?{maxHeight:`${this.props.maxSuggestionHeight}px`}:{}}>
            {filteredSuggestions.map((suggestion, index) => {
              let className;

              // Flag the active suggestion with a class
              if (index === activeSuggestion) {
                className = "suggestion-active";
              }

              return (!(this.props.isMobile || false)) ? (
                  <li className={className} onMouseEnter={(e) => this.onMouseEnter(e)} onMouseLeave={(e) => this.onMouseLeave(e)} onClick={(e) => this.onClick(e) } key={index} id={"suggestion-" + index}>
                    <span className="suggestion-name">{suggestion.name}</span><br />
                    <span className="suggestion-description">{suggestion.description}</span><br />
                    <span className="suggestion-location">{suggestion.location}</span> <span className="suggestion-strand">({suggestion.strand})</span>
                  </li>
              ) : (
                  <li className={className} onClick={(e) => this.onClick(e)} key={index} id={"suggestion-" + index}>
                    <span className="suggestion-name">{suggestion.name}</span><br />
                    <span className="suggestion-location">{suggestion.location}</span> <span className="suggestion-strand">({suggestion.strand})</span>
                  </li>
              );
            })}
          </ul>
          </div>
        );
      } else {
        suggestionsListComponent = (
          <div className="no-suggestions"></div>
        );
      }
    }

    return (
      <Fragment>
        <div className="autocomplete">
        <DebounceInput
          id="autocomplete-input"
          key={this.state.inputKey}
          type="text"
          inputRef={(ref) => { this.inputRef = ref; }}
          minLength={this.state.minimumLength}
          debounceTimeout={this.state.debounceTimeout}
          className={this.props.className || 'autocomplete-input'}
          onChange={e => this.onChange(e)}
          onPaste={e => this.onPaste(e)}
          onKeyDown={onKeyDown}
          onFocus={e => this.onFocus(e)}
          onBlur={e => this.onBlur(e)}
          value={this.state.userInput.replace('/', '')}
          placeholder={(this.props.placeholder) && this.props.placeholder || Constants.appDefaultAutocompleteInputPlaceholder}
          autoComplete="off"
          title={this.props.title || Constants.appDefaultAutocompleteInputLabel}
          style={(this.state.isInFocus) ? this.inFocusStyle : this.inBlurStyle}
          disabled={(this.props.isDisabled) ? this.props.isDisabled : false}
        />
        {suggestionsListComponent}
        </div>
      </Fragment>
    );
  }
}

export default Autocomplete;

Autocomplete.propTypes = {
  annotationAssembly: PropTypes.string,
  annotationHost: PropTypes.string,
  annotationPort: PropTypes.string,
  annotationScheme: PropTypes.string,
  className: PropTypes.string,
  maxSuggestionHeight: PropTypes.number,
  onChangeLocation: PropTypes.func,
  onChangeInput: PropTypes.func,
  placeholder: PropTypes.string, 
  suggestionsClassName: PropTypes.string,
  title: PropTypes.string,
  isMobile: PropTypes.bool,
  isDisabled: PropTypes.bool,
};