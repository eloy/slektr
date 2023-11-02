export default class Slektr {
  constructor(el, config={}) {
    if (el.dataset.slektr) {
      throw("Slektr is already initialized");
    }

    this.config = Object.assign({}, buildConfigFromElement(el), config);

    el.dataset.slektr = true;

    this.originalEl = el;

    this.toggleOptions = this.toggleOptions.bind(this);
    this.onClickOnOption = this.onClickOnOption.bind(this);
    this.onMouseEnterOption = this.onMouseEnterOption.bind(this);

    this.removeValueFromMultiple = this.removeValueFromMultiple.bind(this);
    this.resetValue = this.resetValue.bind(this);
    this.filterInputChanged = this.filterInputChanged.bind(this);
    this.fetchFilteredRemoteOptions = this.fetchFilteredRemoteOptions.bind(this);
    this.onClickOutside = this.onClickOutside.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);

    // hide the main element
    el.style.display = 'none';


    // Set the initial value for the element
    this.setInitialValue();

    // Set the options
    this.initOptions();

    // Create the new element and insert it after the original select
    this.buildElement();

    if (!window.slektr) window.slektr = {};
    window.slektr[el.name] = this;
  }

  initOptions() {
    this.options = [];

    this.domOptions = extractOptions(this.originalEl);

    if (this.domOptions) {
      this.options = this.options.concat(this.domOptions);
    }

    if (this.config.options) {
      this.options = this.options.concat(this.config.options);
    }

    this.initRemoteOptions();

    if (this.config.searchOptionsCallback) {
      this.config.remoteOptions = true;
    }
  }


  initRemoteOptions() {
    // Run the callback to get the initial options
    if (!this.config.initOptionsCallback) return;
    this.config.initOptionsCallback(this).then(options => {
      if (options && Array.isArray(options) && options.length > 0) {
        this.options = this.options.concat(options);
        this.renderValue(this.value);
      }
    });
  }

  setInitialValue() {
    let value;

    if (this.config.value) {
      return this.value = this.config.value;
    }

    if (this.originalEl.hasAttribute('value')) {
      value = this.originalEl.getAttribute('value');
      if (this.config.multiple) {
        value = value.split(',').filter(item => item && item.length > 0);
      }
      return this.value = value;
    }

    let selected_options = filterOptions(this.originalEl, o => o.selected);
    if (selected_options.length > 0) {
      if (this.config.multiple) {
        return this.value = selected_options.map(o => o.value);
      } else {
        return this.value = selected_options[0].value;
      }
    }

    return this.value = this.config.multiple ? [] : '';
  }

  toggleOptions(e) {
    if (e.target.tagName.toUpperCase() === 'A') return;

    if (this.optionsDisplayed) {
      this.hideOptions();
    } else {
      this.showOptions();
    }
  }

  getCurrentOptions() {
    if (this.filter) {
      return this.filteredOptions;
    } else {
      return this.options;
    }
  }

  filterLocalOptions(filter) {
    let regexp = new RegExp(this.filter, 'i');
    this.filteredOptions = filterOptions(this.options, o => regexp.test(o.label));
    this.resetOptions();
  }

  filterRemoteOptions(filter) {
    if (filter.length < 2) return;

    if (this.filterRemoteOptionsPid) {
      clearTimeout(this.filterRemoteOptionsPid);
    }

    this.filterRemoteOptionsPid = setTimeout(this.fetchFilteredRemoteOptions, FETCH_REMOTE_OPTIONS_TIMEOUT, filter)
  }

  fetchFilteredRemoteOptions(filter) {
    this.showFetchingRemoteOptionsLoader();
    this.config.searchOptionsCallback(this.filter, this).then(options => {
      let optionsEl = this.buildOptions(options);
      this.optionsContainerListEl.replaceChildren(...optionsEl);
    });
  }


  showOptions() {
    this.buildOptionsContainer();
    window.addEventListener('click', this.onClickOutside);
    this.optionsContainerListEl.addEventListener("click", this.onClickOnOption);
    this.optionsContainerListEl.addEventListener("mouseenter", this.onMouseEnterOption, true);

    window.addEventListener('keydown', this.onKeyPress, true);
    this.optionsDisplayed = true;

    // Don't show local options if remote options enabled;
    if (this.config.remoteOptions) return;

    // Render local options
    let optionsEl = this.buildOptions(this.getCurrentOptions());
    this.optionsContainerListEl.replaceChildren(...optionsEl);

    this.scrollToSelectedOption(this.value);
  }

  hideOptions() {
    window.removeEventListener('click', this.onClickOutside);
    this.optionsContainerListEl.removeEventListener("click", this.onClickOnOption);
    this.optionsContainerListEl.removeEventListener("mouseenter", this.onMouseEnterOption, true);

    window.removeEventListener('keydown', this.onKeyPress, true);

    if (this.filterInput) {
      this.filterInput.addEventListener('input', this.filterInputChanged);
    }

    this.filter = undefined;
    this.filteredOptions = undefined;
    this.currentSelection = undefined;

    this.optionsContainerListEl.remove();
    this.optionsContainerEl.remove();
    this.optionsDisplayed = false;
  }


  onClickOutside(e) {
    if (!this.slektrEl.contains(e.target)) {
      this.hideOptions();
    }
  }

  onKeyPress(e) {
    if (e.keyCode === KEY_ARROW_UP) {
      this.selectPrevOption();
    } else if (e.keyCode === KEY_ARROW_DOWN) {
      this.selectNextOption();
    } else if (e.keyCode === KEY_ENTER && this.currentSelection) {
      e.preventDefault();
      this.selectOption(this.currentSelection.slektr_option);
    }
  }

  onMouseEnterOption(e) {
    // Ignore Groups
    if (e.target.slektrGroup) return;

    // Remove the current_selection class from the last selection, if any
    if (this.currentSelection) {
      this.currentSelection.className = Array.from(this.currentSelection.classList).filter(c => c != 'current_selection').join(' ');
    }

    this.currentSelection = e.target;
    this.currentSelection.className = this.currentSelection.className + ' current_selection';
  }

  selectNextOption() {
    this.selectCurrentSelection(1);
  }

  selectPrevOption() {
    this.selectCurrentSelection(-1);
  }


  selectCurrentSelection(offset) {
    let index = 0;
    let validOptions = Array.from(this.optionsContainerListEl.children).filter(o => !o.slektrGroup);

    if (this.currentSelection) {
      index = validOptions.findIndex(o => o.slektr_option.value === this.currentSelection.slektr_option.value)
      index = index + offset;
      if (index < 0 || index == validOptions.length) return;

      this.currentSelection.className = Array.from(this.currentSelection.classList).filter(c => c != 'current_selection').join(' ');
    }

    this.currentSelection = validOptions[index]
    this.currentSelection.className = this.currentSelection.className + ' current_selection';


    // Scroll to the option
    let elOffset = findOffset(this.optionsContainerListEl, el => el.slektr_option && el.slektr_option.value === this.currentSelection.slektr_option.value);
    let elHeight = this.currentSelection.clientHeight;
    let elementHeight = this.optionsContainerListEl.clientHeight;
    let currentOffset = this.optionsContainerListEl.offsetTop;

    if ((elOffset + elementHeight) > (elHeight + currentOffset)) {
      let yPosition = (elOffset + elHeight) - elHeight;
      this.optionsContainerListEl.scrollTo(0, yPosition);
    }
  }

  showFetchingRemoteOptionsLoader() {
    let spinner = document.createElement('div');
    spinner.className = "slektr-fetch-options-spinner";

    this.optionsContainerListEl.replaceChildren(spinner);
  }

  resetOptions() {
    let optionsEl = this.buildOptions(this.getCurrentOptions());
    this.optionsContainerListEl.replaceChildren(...optionsEl);
  }

  resetValue(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.config.multiple) {
      this.value = [];
      this.originalEl.value = '';
    } else {
      this.value = undefined;
      this.originalEl.value = this.value;
    }

    this.onValueChanged();
  }

  removeValueFromMultiple(e) {
    e.preventDefault();
    e.stopPropagation();
    let value = e.target.slektr_value;
    let index = this.value.indexOf(value);
    this.value.splice(index, 1);
    this.onValueChanged();
  }

  onClickOnOption(e) {
    let option = e.target.slektr_option;
    this.selectOption(option);
  }

  selectOption(option) {
    let value = option.hasOwnProperty('value') ? option.value : option.label;
    if (this.config.multiple) {
      if (this.value.indexOf(value) === -1) {
        this.value.push(value);
      }
    } else {
      this.value = value;
    }

    // If remote options is elabled, we should push the selected
    // option to show the value and add the option to the original el
    if (this.config.remoteOptions) {
      this.selectRemoteOption(option);
    }

    this.hideOptions();
    this.onValueChanged();
  }


  selectRemoteOption(option) {
    let optionEl =  document.createElement('option');
    optionEl.value = option.value;
    optionEl.innerHTML = option.label;

    if (this.config.multiple) {
      this.options.push(option);
      this.originalEl.appendChild(optionEl);
    } else {
      this.options = [option];
      this.originalEl.replaceChildren(optionEl);
    }
  }


  onValueChanged(ignoreCallback=false) {
    this.renderValue(this.value);

    if (this.config.multiple) {
      setOptionsForMultiple(this.originalEl, this.value);
    } else {
      this.originalEl.value = this.value;
    }

    // Run the callback
    if (!ignoreCallback) {
      this.config.onChangeCallback && this.config.onChangeCallback({value: this.value, name: this.config.name});
    }
  }

  /**
   * Set the new value
   */
  setValue(value) {
    this.value = value;
    this.initRemoteOptions();
    this.onValueChanged();
  }



  isOptionSelected(value) {
    if (this.config.multiple) {
      return this.value.indexOf(value) !== -1;
    } else {
      return value == ''+ this.value;
    }
  }


  filterInputChanged(e) {
    this.filter = e.target.value;
    if (this.config.remoteOptions) {
      this.filterRemoteOptions(this.filter)
    } else {
       this.filterLocalOptions(this.filter)
    }
  }

  renderValue(value) {
    for (let el of this.fieldEl.children) {
      el.removeEventListener("click", this.removeValueFromMultiple, true);
      el.removeEventListener("click", this.resetValue, true);
      el.remove();
    }

    // Make sure the field is empty
    this.fieldEl.innerHTML = '';

    if (this.config.multiple) {
      this.renderMultipleValue(value);
    } else {
      this.renderSingleValue(value);
    }
  }


  renderValueContent(el, option) {
    if (!option) return;
    if (this.config.renderValueCallback) {
      let valueEl = this.config.renderValueCallback(option, this);
      if (typeof(valueEl) === 'string') {
        el.innerHTML = valueEl;
      } else {
        el.append(valueEl);
      }
    } else {
      el.el.innerHTML = option.label;
    }
  }

  renderSingleValue(value) {
    this.fieldEl.innerHTML = '';
    if (!value || value.length === 0) {
      this.renderPrompt();
      return;
    }

    let el = document.createElement('div');
    el.className = "slektr-single-value";

    let option = findOption(value, this.options);
    this.renderValueContent(el, option);
    this.fieldEl.append(el);

    if (this.config.allowBlank) {
      let deleteButton = document.createElement('button');
      deleteButton.className = 'slektr-single-option-delete';
      this.fieldEl.appendChild(deleteButton);

      let deleteIcon = deleteIconElement();
      deleteButton.appendChild(deleteIcon);
      deleteButton.addEventListener("click", this.resetValue, true);

    }
  }

  renderMultipleValue(values) {
    if (!values || values.length === 0) {
      this.renderPrompt();
      return;
    }

    for (let value of values) {
      let el = document.createElement('div');
      el.className = "slektr-multiple-option";

      let badge = document.createElement('div');
      badge.className = 'slektr-multiple-option-label';

      let option = findOption(value, this.options);
      this.renderValueContent(badge, option);
      el.appendChild(badge);

      let deleteButton = document.createElement('button');
      deleteButton.className = 'slektr-multiple-option-delete';
      el.appendChild(deleteButton);

      deleteButton.slektr_value = value;
      let deleteIcon = deleteIconElement();
      deleteButton.appendChild(deleteIcon);
      deleteButton.addEventListener("click", this.removeValueFromMultiple, true);

      this.fieldEl.appendChild(el);
    }
  }

  renderPrompt() {
    let spam = document.createElement('spam');
    spam.className = 'slektr-propmt';
    let placeholder = this.config.placeholder || "Select option"
    spam.textContent = placeholder;
    this.fieldEl.appendChild(spam);
  }

  buildElement() {
    let el = document.createElement('div');

    el.className = ['slektr'].concat(Array.from(this.originalEl.classList)).unique().join(' ');
    this.originalEl.after(el);
    this.slektrEl = el;

    // Insert the main field
    this.buildField();

    if (!this.value || (this.config.multiple && this.value.length === 0)) {
      this.renderPrompt();
    } else {
      this.renderValue(this.value);
    }
  }

  buildField() {
    let el = document.createElement('div');
    el.addEventListener("click", this.toggleOptions, false);
    let extraClassName = this.config.multiple ? 'slektr-field-multiple' : 'slektr-field-single'
    el.className = 'slektr-field ' + extraClassName;
    this.slektrEl.append(el);
    this.fieldEl = el;
  }


  scrollToSelectedOption(value) {
    let offset = findOffset(this.optionsContainerListEl, el => el.slektr_option && el.slektr_option.value === value);
    let elementHeight = this.optionsContainerListEl.clientHeight;
    let yPosition = offset - (elementHeight / 2);
    yPosition = Math.max(0, yPosition);
    this.optionsContainerListEl.scrollTo(0, yPosition);
  }

  buildOptionsContainer() {
    let el = document.createElement('div');
    el.className = 'slektr-options-container';
    let style = {};
    style.width = this.slektrEl.clientWidth + 'px';
    el.setAttribute('style', compileStyle(style));
    this.slektrEl.append(el);
    this.buildOptionsFilter(el);

    let list = document.createElement('div');
    list.className = 'slektr-options-container-list';
    el.append(list);

    this.optionsContainerEl = el;
    this.optionsContainerListEl = list;
  }

  buildOptionsFilter(container) {
    let el = document.createElement('div');
    el.className = 'slektr-options-filter-container';
    container.append(el);

    let input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Enter search text');
    input.className = 'slektr-options-filter-input';
    el.append(input);
    input.focus();
    this.filterInput = input;
    this.filterInput.addEventListener('input', this.filterInputChanged);
  }

  buildOptionGroup(group, level=0) {
    let el = document.createElement('div');
    el.dataset.level = level;
    el.className = 'slektr-option-group';
    el.slektrGroup = group;

    el.style.paddingLeft = level * 10 + 'px';
    el.appendChild(document.createTextNode(group.label));

    let groupOptions = this.buildOptions(group.options, level + 1)
    groupOptions.splice(0, 0, el);
    return groupOptions;
  }

  buildOption(option, level=0) {
    let attributes = {value: option.value}
    let el = document.createElement('div', attributes);
    el.style.paddingLeft = level * 10 + 'px';

    el.dataset.level = level;
    let classList =  ['slektr-option']

    if (this.isOptionSelected(option.value)) {
      classList.push('selected');
    }

    el.className = classList.join(' ');
    el.appendChild(document.createTextNode(option.label));
    el.slektr_option = option;

    return el;
  }

  buildOptions(options, level=0) {
    let optionsEl = [];
    for (let opt of options) {
      if (opt.group) {
        optionsEl = optionsEl.concat(this.buildOptionGroup(opt, level));
      } else {
        optionsEl.push(this.buildOption(opt, level));
      }
    }
    return optionsEl;
  }
}

const FETCH_REMOTE_OPTIONS_TIMEOUT = 300;
const KEY_ARROW_DOWN = 40;
const KEY_ARROW_UP = 38;
const KEY_ENTER = 13;

function buildElement(source_el) {
  let el = document.createElement('div');
  return el;
}

function buildConfigFromElement(el) {
  let config = {};
  config.multiple = el.multiple;

  for (let key of Object.keys(el.dataset)) {
    let config_key = camelize(key);
    config[config_key] = el.dataset[key];
  }
  return config;
}

function extractOptions(el) {
  let options = [];

  for (let child of el.children) {
    if (child.tagName.toUpperCase() === 'OPTGROUP') {
      let groupOptions = extractOptions(child);
      let groupData = {group: true, label: child.label, options: groupOptions};
      options.push(groupData);
    } else {
      options.push({label: child.label, value: child.value});
    }
  }

  return options;
}


function findOption(value, options) {
  for (let opt of options) {
    if (opt.group) {
      let option =findOption(value, opt.options);
      if (option !== undefined) return option;
    } else {
      // We use == to compare integers and strings
      if (opt.value == value) {
        return opt;
      }
    }
  }
  return undefined;
}

function compileStyle(style) {
  let entries = Object.keys(style).map(key => {
    return `${key}: ${style[key]}`;
  });

  return entries.join('; ');
}

function findOffset(container, callback) {
  let offset = 0;
  for (let el of container.children) {
    if (callback(el)) {
      return offset;
    }
    offset = offset + el.clientHeight;
  }
  return 0;
}


function filterOptions(options, callback) {
  let filteredOptions = [];
  for (let option of options) {
    if (option.group) {
      let group_options = filterOptions(option.options, callback);
      if (group_options.length > 0) {
        let group = {group: true, label: option.label, options: group_options};
        filteredOptions.push(group);
      }
    } else {
      if (callback(option)) {
        filteredOptions.push(option);
      }
    }
  }
  return filteredOptions;
}


function setOptionsForMultiple(el, value) {
  for (let child of el) {
    if (el.tagName.toLowerCase() === 'optgroup') {
      setOptionsForMultiple(child, value);
    } else {

      child.selected = value.findIndex(v=> v == child.value) !== -1;
    }
  }

}

function camelize(str) {
  if (!str.includes('_')) return str;
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

const DELETE_ICON_PATH = 'M36,12c13.255,0,24,10.745,24,24c0,13.255-10.745,24-24,24S12,49.255,12,36C12,22.745,22.745,12,36,12z M40.243,44.485	c1.171,1.171,3.071,1.172,4.243,0c1.172-1.172,1.171-3.071,0-4.243C44.253,40.01,42.063,37.82,40.243,36	c1.82-1.82,4.01-4.01,4.243-4.243c1.171-1.171,1.172-3.071,0-4.243c-1.171-1.171-3.071-1.171-4.243,0	C40.01,27.747,37.82,29.937,36,31.757c-1.82-1.82-4.01-4.01-4.243-4.243c-1.171-1.171-3.071-1.172-4.243,0	c-1.172,1.172-1.171,3.071,0,4.243c0.232,0.232,2.423,2.423,4.243,4.243c-1.82,1.82-4.01,4.01-4.243,4.243	c-1.171,1.171-1.171,3.071,0,4.243c1.172,1.172,3.071,1.171,4.243,0c0.232-0.232,2.423-2.423,4.243-4.243	C37.82,42.063,40.01,44.253,40.243,44.485z'

function deleteIconElement(opt={}) {
  let size = opt.size || 24;

  let path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute("d", DELETE_ICON_PATH);

  let svg= document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('x', 0);
  svg.setAttribute('y', 0);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 72 72');

  svg.appendChild(path)
  return svg;
}
