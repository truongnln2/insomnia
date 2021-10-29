import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { createRef, PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { generateId } from '../../../common/misc';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { Workspace } from '../../../models/workspace';
import * as templating from '../../../templating';
import {
  ArgumentValue,
  ParsedFilter,
  ParsedVariableFilter,
  parseVariableAndFilter,
  stringifyVariableAndFilter,
} from '../../../templating/parser';
import { NunjucksParsedFilter } from '../../../templating/utils';
import { AppliedNunjucksParsedFilter, FilterRowEditor } from './filter-row-editor';

const StyledFiltersContainer = styled.ul`
  // This is the actual row
  .filter-editor__row-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    padding-bottom: var(--padding-sm);
    box-sizing: border-box;

    &.filter-editor__row-wrapper--dragging {
      // Set opacity on children so we can still see the separator
      & > * {
        opacity: 0.2;
      }
    }

    &.filter-editor__row-wrapper--dragging-below::after,
    &.filter-editor__row-wrapper--dragging-above::before {
      position: absolute;
      height: 0;
      right: 0;
      left: 0;
      border-bottom: 2px dotted var(--color-surprise);
      content: ' ';
      display: block;
    }

    // So the line appears on the next row
    &.filter-editor__row-wrapper--dragging-below::after {
      bottom: -1px; // half border thickness
    }

    // So the line appears on the next row
    &.filter-editor__row-wrapper--dragging-above::before {
      top: -1px; // half border thickness
    }

    // Style last row the same no matter if focused or not.
    &.filter-editor__row-wrapper--clicker input {
      border-color: var(--hl-sm) !important;
    }
  }

  .filter-editor__drag {
    width: var(--line-height-sm);
    min-width: var(--line-height-sm);
    text-align: center;
    box-sizing: border-box;
    overflow: hidden;

    // Remove hover effect
    &,
    &:hover {
      color: var(--hl);
    }
  }

  .filter-header {
    width: calc(100% - var(--line-height-sm));
    min-width: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 0 var(--padding-sm) 0 0;
    box-sizing: border-box;
    > h4 {
      width: 100%;
    }
  }

  .filter-arguments {
    width: 100%;
    border-bottom: 1px solid var(--hl-sm);
    padding: 0 var(--padding-lg);
  }
`;

interface Props {
  handleRender: HandleRender;
  handleGetRenderContext: HandleGetRenderContext;
  defaultValue: string;
  onChange: Function;
  workspace: Workspace;
}

interface State {
  variables: any[];
  parsedValue: ParsedVariableFilter[];
  filterTests: string[];
  value: string;
  preview: string;
  error: string;
  variableSource: string;
  filterDefinitions: NunjucksParsedFilter[];
  appliedFilters: AppliedNunjucksParsedFilter[];
  isUserChooseCustom: boolean;
  isParseError: boolean;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class VariableEditor extends PureComponent<Props, State> {
  textAreaRef = createRef<HTMLTextAreaElement>();
  _select: HTMLSelectElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      variables: [],
      parsedValue: [],
      filterTests: [],
      filterDefinitions: [],
      appliedFilters: [],
      value: props.defaultValue,
      preview: '',
      error: '',
      variableSource: '',
      isUserChooseCustom: false,
      isParseError: true,
    };
  }

  componentDidMount() {
    this._update(this.state.value, true);

    this._resize();
  }

  componentDidUpdate() {
    this._resize();
  }

  _handleChange(e) {
    const name = e.target.value;
    const { parsedValue } = this.state;
    if (name === '<custom>') {
      this._update(parsedValue, false, true);
    } else {
      parsedValue[0].value = name;
      this._update(parsedValue, false, false);
    }
  }

  _handleChangeCustom(e) {
    const name = e.target.value;
    this._update(name, false, true);
  }

  _resize() {
    setTimeout(() => {
      const element = this.textAreaRef.current;
      if (element) {
        element.style.cssText = 'height:auto';
        element.style.cssText = `height:${element.scrollHeight}px;overflow:hidden`;
      }
    }, 200);
  }

  _setSelectRef(n: HTMLSelectElement) {
    this._select = n;
    // Let it render, then focus the input
    setTimeout(() => {
      this._select?.focus();
    }, 100);
  }

  async _update(rawData: string | ParsedVariableFilter[], noCallback = false, isUserChangeToCustom: boolean | null = null) {
    const { handleRender } = this.props;
    let { isParseError, isUserChooseCustom } = this.state;
    let parsedData;
    let value = '';
    if (typeof rawData === 'string') {
      parsedData = parseVariableAndFilter(rawData);
      value = rawData;
    } else {
      parsedData = rawData;
    }
    if (parsedData) {
      value = stringifyVariableAndFilter(parsedData);
    }

    let preview = '';
    let error = '';

    try {
      preview = await handleRender(value);
    } catch (err) {
      error = err.message;
    }

    const context = await this.props.handleGetRenderContext();
    const filterDefinitions = await templating.getFilterDefinitions();
    const filterTests = await templating.getTestDefinitions();
    filterDefinitions.sort(f => f.isPlugin ? 1 : -1);
    const variables = context.keys.sort((a: any, b: any) => {
      if (a.meta?.type < b.meta?.type) {
        return -1;
      } else if (a.meta?.type > b.meta?.type) {
        return 1;
      } else {
        if (a.meta?.name < b.meta?.name) {
          return -1;
        } else if (a.meta?.name > b.meta?.name) {
          return 1;
        } else {
          return a.name < b.name ? -1 : 1;
        }
      }
    });
    let variableSource = '';
    const appliedFilters: AppliedNunjucksParsedFilter[] = [];
    if (parsedData) {
      const variable = parsedData[0];
      const filters = parsedData.slice(1);
      variableSource = context.context.getKeysContext().keyContext[variable.value] || '';
      filters.forEach((f, i) => {
        const fd = filterDefinitions.find(fi => fi.name === f.name);
        if (fd) {
          appliedFilters.push({
            ...fd,
            id: generateId('filter'),
            argsValues: f.args,
            metaSort: i,
          });
        }
        return null;
      });
      isParseError = parsedData.length > (appliedFilters.length + 1);
    }
    if (isUserChangeToCustom != null) {
      isUserChooseCustom = isUserChangeToCustom;
    }

    // Hack to skip updating if we unmounted for some reason
    if (this._select) {
      this.setState({
        parsedValue: parsedData || [],
        filterTests,
        preview,
        error,
        variables,
        value: value,
        filterDefinitions: filterDefinitions.sort(f => f.isPlugin ? 1 : -1),
        appliedFilters,
        variableSource,
        isParseError,
        isUserChooseCustom,
      });
    }

    // Call the callback if we need to
    if (!noCallback) {
      this.props.onChange(value);
    }
  }

  _handleAddFilter(e) {
    const filterName = e.target.value;
    const { appliedFilters, filterDefinitions } = this.state;
    const filter = filterDefinitions.find(f => f.name === filterName);
    if (filter) {
      this._updateAppliedFilters([
        ...appliedFilters,
        {
          ...filter,
          argsValues: filter.args?.map(a => ({ dataType: 'primitive', value: a.defaultValue || '' })) || [],
          metaSort: appliedFilters.length,
          id: generateId('filter'),
        },
      ]);
    }
  }

  _handleChangeFilter(index: number, argValues: ArgumentValue[]) {
    const { appliedFilters } = this.state;
    const filter = appliedFilters[index];
    filter.argsValues = argValues;
    this._updateAppliedFilters(appliedFilters);
  }

  _handleDeleteFilter(filter) {
    const { appliedFilters } = this.state;
    this._updateAppliedFilters(appliedFilters.filter(p => p.id !== filter.id));
  }

  _handleMoveFilter(filterToMove, filterToTarget, targetOffset) {
    if (filterToMove.id === filterToTarget.id) {
      // Nothing to do
      return;
    }

    const withoutFilter = this.state.appliedFilters.filter(p => p.id !== filterToMove.id);
    let toIndex = withoutFilter.findIndex(p => p.id === filterToTarget.id);

    // If we're moving below, add 1 to the index
    if (targetOffset < 0) {
      toIndex += 1;
    }

    const filters = [
      ...withoutFilter.slice(0, toIndex),
      Object.assign({}, filterToMove),
      ...withoutFilter.slice(toIndex),
    ];
    filters.forEach((f, i) => { f.metaSort = i; });
    this._updateAppliedFilters(filters);
  }

  _updateAppliedFilters(appliedFilters: AppliedNunjucksParsedFilter[]) {
    const { parsedValue } = this.state;
    const variable = parsedValue[0];
    const filtes: ParsedFilter[] = appliedFilters.map(f => ({
      dataType: 'filter',
      name: f.name,
      args: f.argsValues,
    }));
    this._update([
      variable,
      ...filtes,
    ]);
  }

  _renderFilterItem(filter: AppliedNunjucksParsedFilter, index: number) {
    const { variables, filterTests } = this.state;
    const { workspace } = this.props;
    return (
      <FilterRowEditor
        key={index}
        filter={filter}
        workspace={workspace}
        index={index}
        onChange={this._handleChangeFilter}
        onDelete={this._handleDeleteFilter}
        onMove={this._handleMoveFilter}
        variables={variables}
        filterTests={filterTests}
      />
    );
  }

  render() {
    const {
      error,
      value,
      preview,
      variables,
      filterDefinitions,
      variableSource,
      appliedFilters,
      isParseError,
      isUserChooseCustom,
      parsedValue,
    } = this.state;
    const isCustom = isParseError || isUserChooseCustom;
    const isRootVariable = !isCustom && variables.find(v => parsedValue[0].value === v.name);
    const selectValue = isCustom ? '<custom>' : isRootVariable ? parsedValue[0].value?.toString() : 'inline';
    const variableStyle: React.CSSProperties = {};
    if (isParseError) {
      variableStyle.display = 'none';
    }
    return (
      <div>
        <div className="form-control form-control--outlined" style={variableStyle}>
          <label>
            Environment Variable
            <select ref={this._setSelectRef} value={selectValue} onChange={this._handleChange}>
              <option value={'<custom>'}>-- Custom --</option>
              <option value={'inline'}>-- Local variable --</option>
              {variables.map((v, i) => (
                <option key={`${i}::${v.name}`} value={v.name}>
                  [{v.meta?.type?.substr(0, 3)}]({v.meta?.name}) {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!isCustom && !isRootVariable && <div className="form-control form-control--outlined">
          <label>
            Inline Variable
            <input type="text" defaultValue={parsedValue[0].value?.toString()} onChange={this._handleChange} />
          </label>
        </div>}
        {!isCustom && appliedFilters.length > 0 && (
          <>
            <div className="form-control form-control--outlined">
              <label>Applied filters:</label>
            </div>
            <StyledFiltersContainer>
              {appliedFilters.map(this._renderFilterItem)}
            </StyledFiltersContainer>
          </>
        )}
        {!isCustom && (
          <div className="form-control form-control--outlined">
            <label>
              Add filter
              <select value={''} onChange={this._handleAddFilter}>
                <option value={''}>-- Select a filter to add --</option>
                {filterDefinitions.map((v, i) => (
                  <option key={`${i}::${v.name}`} value={v.name}>
                    [{v.isPlugin ? 'Plugin' : 'Builtin'}] {v.displayName || v.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {isCustom && (
          <div className="form-control form-control--outlined">
            <input type="text" defaultValue={value} onChange={this._handleChangeCustom} />
          </div>
        )}
        <div className="form-control form-control--outlined">
          <label>
            Live Preview {variableSource && ` - {source: ${variableSource} }`}
            {error ? (
              <textarea className="danger" value={error || 'Error'} readOnly />
            ) : (
              <textarea ref={this.textAreaRef} value={preview || ''} readOnly />
            )}
          </label>
        </div>
      </div>
    );
  }
}

export default VariableEditor;
