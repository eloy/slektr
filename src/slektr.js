class Slektr {
  constructor(el, config={}) {
    if (el.dataset.slektr) {
      throw("Slektr is already initialized");
    }

    this.config = Object.assign({}, buildConfigFromElement(el), config);

    el.dataset.slektr = true;

    this.originalEl = el;

    this.toggleOptions = this.toggleOptions.bind(this);
    this.selectOption = this.selectOption.bind(this);
    this.onMouseEnterOption = this.onMouseEnterOption.bind(this);
    this.onMouseLeaveOption = this.onMouseLeaveOption.bind(this);
    this.unselectOptionFromMultiple = this.unselectOptionFromMultiple.bind(this);
    this.resetValue = this.resetValue.bind(this);
    this.filterInputChanged = this.filterInputChanged.bind(this);

    this.initOptions();

    if (this.config.multiple) {
      this.value = this.originalEl.value.split(',').filter(item => item && item.length > 0);
    } else {
      this.value = this.originalEl.value;
    }

    // Create the new element and insert it after the original select
    this.buildElement();


    // hide the element
    //el.style.display = 'none';
    el.remove();

    window.slektr = this;
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
  }

  renderValue(value) {
    for (let el of this.fieldEl.children) {
      el.removeEventListener("click", this.unselectOptionFromMultiple, true);
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

  toggleOptions() {
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

  showOptions() {
    this.buildOptionsContainer();
    let optionsEl = this.buildOptions(this.getCurrentOptions());
    for (let opt of optionsEl) {
      this.optionsContainerListEl.appendChild(opt);
    }

    this.scrollToSelectedOption(this.value);
    this.optionsContainerListEl.addEventListener("click", this.selectOption);
    this.optionsContainerListEl.addEventListener("mouseenter", this.onMouseEnterOption, true);
    this.optionsContainerListEl.addEventListener("mouseleave", this.onMouseLeaveOption, true);
    this.optionsDisplayed = true;
  }

  hideOptions() {
    this.optionsContainerListEl.removeEventListener("click", this.selectOption);
    this.optionsContainerListEl.removeEventListener("mouseenter", this.onMouseEnterOption, true);
    this.optionsContainerListEl.removeEventListener("mouseleave", this.onMouseLeaveOption, true);
    if (this.filterInput) {
      this.filterInput.addEventListener('input', this.filterInputChanged);
    }

    this.filter = undefined;
    this.filteredOptions = undefined;

    this.optionsContainerListEl.remove();
    this.optionsContainerEl.remove();
    this.optionsDisplayed = false;
  }

  resetOptions() {
    let optionsEl = this.buildOptions(this.getCurrentOptions());
    this.optionsContainerListEl.replaceChildren(...optionsEl);
  }

  resetValue(e) {
    e.preventDefault();
    e.stopPropagation();
    this.value = undefined;
    this.renderValue(this.value);
  }

  unselectOptionFromMultiple(e) {
    e.preventDefault();
    e.stopPropagation();
    let value = e.target.slektr_value;
    let index = this.value.indexOf(value);
    this.value.splice(index, 1);
    this.renderValue(this.value);
  }


  selectOption(e) {
    let option = e.target.slektr_option;

    let value = option.hasOwnProperty('value') ? option.value : option.label;
    if (this.config.multiple) {
      if (this.value.indexOf(value) === -1) {
        this.value.push(value);
      }
    } else {
      this.value = value;
    }

    this.renderValue(this.value);
    this.hideOptions();
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
    this.filteredOptions = filterOptions(this.options, new RegExp(this.filter, 'i'));
    this.resetOptions();
  }

  onMouseEnterOption(e) {
    e.target.className = e.target.className + ' current_selection';
  }

  onMouseLeaveOption(e) {
    e.target.className = Array.from(e.target.classList).filter(c => c != 'current_selection').join(' ');
  }

  renderSingleValue(value) {
    this.fieldEl.innerHTML = '';
    if (!value || value.length === 0) {
      this.renderPrompt();
      return;
    }

    let el = document.createElement('div');
    el.className = "slektr-single-value";

    let label = getOptionLabel(value, this.options);
    el.setHTML(label);

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
    for (let value of values) {
      let label = getOptionLabel(value, this.options);
      let el = document.createElement('div');
      el.className = "slektr-multiple-option";

      let spam = document.createElement('spam');
      spam.className = 'slektr-multiple-option-label';
      spam.setHTML(label);

      el.appendChild(spam);

      let deleteButton = document.createElement('button');
      deleteButton.className = 'slektr-multiple-option-delete';
      el.appendChild(deleteButton);

      deleteButton.slektr_value = value;
      let deleteIcon = deleteIconElement();
      deleteButton.appendChild(deleteIcon);
      deleteButton.addEventListener("click", this.unselectOptionFromMultiple, true);

      this.fieldEl.appendChild(el);
    }
  }

  renderPrompt() {
    let spam = document.createElement('spam');
    spam.className = 'slektr-propmt';
    spam.setHTML("Select an option");
    this.fieldEl.appendChild(spam);
  }

  buildElement() {
    let el = document.createElement('div');

    // Copy attributes
    el.className = this.originalEl.className;
    el.id = this.originalEl.id;

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



function buildElement(source_el) {
  let el = document.createElement('div');
  return el;
}

function buildConfigFromElement(el) {
  let config = {};
  config.multiple = el.multiple;
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


function getOptionLabel(value, options) {
  for (let opt of options) {
    if (opt.group) {
      let label = getOptionLabel(value, opt.options);
      if (label !== undefined) return label;
    } else {
      if (opt.value === value) {
        return opt.label;
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


function filterOptions(options, regexp) {
  let filteredOptions = [];
  for (let option of options) {
    if (option.group) {
      let group_options = filterOptions(option.options, regexp);
      if (group_options.length > 0) {
        let group = {group: true, label: option.label, options: group_options};
        filteredOptions.push(group);
      }
    } else {
      if (regexp.test(option.label)) {
        filteredOptions.push(option);
      }
    }
  }
  return filteredOptions;
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
window.addEventListener('load', function () {
  var elements = document.getElementsByClassName('slektr');
  if (!elements) return;
  for (let el of elements) {
    if (!el.dataset.slektr) {
      new Slektr(el, {allowBlank: true});
    }
  }
});
