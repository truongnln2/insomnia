
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import classnames from 'classnames';
import React, { PureComponent } from 'react';

import { AUTOBIND_CFG } from '../../../common/constants';
import { database } from '../../../common/database';
import { fnOrString } from '../../../common/misc';
import type { RenderKey } from '../../../common/render';
import { metaSortKeySort } from '../../../common/sorting';
import * as models from '../../../models';
import { BaseModel } from '../../../models';
import { isRequest, Request } from '../../../models/request';
import { isRequestGroup, RequestGroup } from '../../../models/request-group';
import { Workspace } from '../../../models/workspace';
import { ArgumentValue } from '../../../templating/parser';
import { NunjucksParsedFilterArg } from '../../../templating/utils';
import * as templateUtils from '../../../templating/utils';
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem } from '../base/dropdown';
import { HelpTooltip } from '../help-tooltip';
import { AppliedNunjucksParsedFilter } from './filter-row-editor';

enum ArgumentValueType {
  Literal,
  Environment,
  Variable,
}

type NunjucksParsedFilterArgValue = NunjucksParsedFilterArg & {
  argParsedValue: ArgumentValue;
  argEditingType: ArgumentValueType;
};

interface Props {
  filter: AppliedNunjucksParsedFilter;
  workspace: Workspace;
  variables: RenderKey[];
  filterTests: string[];
  onUpdate: (values: ArgumentValue[]) => void;
}

interface State {
  argsType: NunjucksParsedFilterArgValue[];
  loadingDocs: boolean;
  allDocs: Record<string, BaseModel[]>;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class PluginFilterArgumentsEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const { variables, filter, workspace } = props;
    const { args, argsValues } = filter;
    this.state = {
      loadingDocs: false,
      allDocs: {},
      argsType: !args ? [] : args.map((arg, i) => {
        const a = argsValues[i];
        const thisArg = arg;
        let type = ArgumentValueType.Literal;
        if (a && a.dataType === 'variable') {
          const variable = variables.find(v => v.name === a.value);
          if (variable) {
            type = ArgumentValueType.Environment;
          } else {
            type = ArgumentValueType.Variable;
          }
        }
        return {
          ...thisArg,
          argParsedValue: a || { dataType: 'primitive', value: thisArg.defaultValue },
          argEditingType: type,
          value: ((!a ? thisArg.defaultValue : a.value) || ''),
        };
      }),
    };
    setTimeout(() => this._refreshModels(workspace), 100);
  }

  _handleChange(e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>) {
    const parent = e.currentTarget.parentNode;
    let argIndex = -1;

    if (parent instanceof HTMLElement) {
      const index = parent && parent.getAttribute('data-arg-index');
      argIndex = typeof index === 'string' ? parseInt(index, 10) : -1;
    }

    // Handle special types
    if (e.currentTarget.getAttribute('data-encoding') === 'base64') {
      return this._updateArg(
        templateUtils.encodeEncoding(e.currentTarget.value, 'base64'),
        argIndex,
        ArgumentValueType.Literal,
      );
    }

    // Handle normal types
    if (e.currentTarget.type === 'number') {
      return this._updateArg(parseFloat(e.currentTarget.value), argIndex, ArgumentValueType.Literal);
    } else if (e.currentTarget.type === 'checkbox') {
      // @ts-expect-error -- TSCONVERSION .checked doesn't exist on HTMLSelectElement
      return this._updateArg(e.currentTarget.checked, argIndex, ArgumentValueType.Literal);
    } else {
      return this._updateArg(e.currentTarget.value, argIndex, ArgumentValueType.Literal);
    }
  }

  _handleChangeEnvironmentVariable(e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>) {
    return this._handleChangeVariable(e, ArgumentValueType.Environment);
  }

  _handleChangeInlineVariable(e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>) {
    return this._handleChangeVariable(e, ArgumentValueType.Variable);
  }

  async _handleChangeVariable(e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>, type: ArgumentValueType) {
    const parent = e.currentTarget.parentNode;
    let argIndex = -1;

    if (parent instanceof HTMLElement) {
      const index = parent && parent.getAttribute('data-arg-index');
      argIndex = typeof index === 'string' ? parseInt(index, 10) : -1;
    }
    return this._updateArg(e.currentTarget.value, argIndex, type);
  }

  async _handleChangeArgVariable(options: { argIndex: number; type: ArgumentValueType }) {
    const { type, argIndex } = options;
    const { variables } = this.props;
    const { argsType } = this.state;

    const argData = argsType[argIndex];
    const existingValue = argData.value;

    if (type === ArgumentValueType.Environment) {
      const variable = variables.find(v => v.value === existingValue);
      const firstVariable = variables.length ? variables[0].name : '';
      const value = variable ? variable.name : firstVariable;
      return this._updateArg(value || 'my_variable', argIndex, ArgumentValueType.Environment);
    } if (type === ArgumentValueType.Variable) {
      return this._updateArg(existingValue, argIndex, ArgumentValueType.Variable);
    } else {
      const variable = variables.find(v => v.name === existingValue);
      const value = variable ? variable.value : (argData.defaultValue || '');
      return this._updateArg(value, argIndex, ArgumentValueType.Literal);
    }
  }

  async _updateArg(
    argValue: string | number | boolean,
    argIndex: number,
    type: ArgumentValueType,
  ) {
    const { argsType } = this.state;
    const argData = argsType[argIndex];
    // Update it
    argData.value = argValue;
    argData.argEditingType = type;
    const getDataType = (a: any) => {
      switch (a.argEditingType) {
        case ArgumentValueType.Environment:
        case ArgumentValueType.Variable:
          return 'variable';
        case ArgumentValueType.Literal:
        default:
          return 'primitive';
      }
    };
    this.props.onUpdate(
      argsType.map(a => ({ dataType: getDataType(a), value: a.value })),
    );
    this.setState({
      argsType: [...argsType],
    });
  }

  async _refreshModels(workspace: Workspace) {
    this.setState({
      loadingDocs: true,
    });
    const allDocs = {};

    for (const type of models.types()) {
      allDocs[type] = [];
    }

    for (const doc of await database.withDescendants(workspace, models.request.type)) {
      allDocs[doc.type].push(doc);
    }

    const requests = allDocs[models.request.type] || [];
    const requestGroups = allDocs[models.requestGroup.type] || [];

    const sortedReqs = this._sortRequests(requests.concat(requestGroups), workspace._id);

    allDocs[models.request.type] = sortedReqs;
    this.setState({
      allDocs,
      loadingDocs: false,
    });
  }

  _sortRequests(_models: (Request | RequestGroup)[], parentId: string) {
    let sortedModels: (Request | RequestGroup)[] = [];

    _models
      .filter(model => model.parentId === parentId)
      .sort(metaSortKeySort)
      .forEach(model => {
        if (isRequest(model)) sortedModels.push(model);
        if (isRequestGroup(model)) { sortedModels = sortedModels.concat(this._sortRequests(_models, model._id)); }
      });

    return sortedModels;
  }

  renderArgVariable(path: string) {
    const { variables } = this.props;

    return (
      <select value={path || ''} onChange={this._handleChangeEnvironmentVariable}>
        {variables.map((v, i) => (
          <option key={`${i}::${v.name}`} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
    );
  }

  renderArgInlineVariable(argDefinition: NunjucksParsedFilterArgValue) {
    return (
      <input
        type="text"
        defaultValue={argDefinition.value.toString() || ''}
        placeholder={argDefinition.placeholder || ''}
        onChange={this._handleChangeInlineVariable}
        data-encoding={'utf8'}
      />
    );
  }

  renderArgString(argDefinition: NunjucksParsedFilterArgValue) {
    return (
      <input
        type="text"
        defaultValue={argDefinition.value.toString() || ''}
        placeholder={argDefinition.placeholder || ''}
        onChange={this._handleChange}
        data-encoding={'utf8'}
      />
    );
  }

  renderArgNumber(argDefinition: NunjucksParsedFilterArgValue) {
    return (
      <input
        type="number"
        defaultValue={argDefinition.value.toString() || '0'}
        placeholder={argDefinition.placeholder || ''}
        onChange={this._handleChange}
      />
    );
  }

  renderArgBoolean(checked: boolean) {
    return <input type="checkbox" checked={checked} onChange={this._handleChange} />;
  }

  renderArgEnum(argDefinition: NunjucksParsedFilterArgValue, argDatas: NunjucksParsedFilterArgValue[]) {
    const options = argDefinition.options || [];
    const value = argDefinition.value.toString();
    let unsetOption: any = null;

    if (!options.find(o => o.value === value)) {
      unsetOption = <option value="">-- Select Option --</option>;
    }

    return (
      <select value={value} onChange={this._handleChange}>
        {unsetOption}
        {options.map(option => {
          let label: string;
          const { description } = option;

          if (description) {
            label = `${fnOrString(option.displayName, argDatas)} – ${description}`;
          } else {
            label = fnOrString(option.displayName, argDatas);
          }

          return (
            // @ts-expect-error -- TSCONVERSION boolean not accepted by option
            <option key={option.value.toString()} value={option.value}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  resolveRequestGroupPrefix(requestGroupId: string, allRequestGroups: any[]) {
    let prefix = '';
    let reqGroup: any;

    do {
      // Get prefix from inner most request group.
      reqGroup = allRequestGroups.find(rg => rg._id === requestGroupId);

      if (reqGroup == null) {
        break;
      }

      const name = typeof reqGroup.name === 'string' ? reqGroup.name : '';
      prefix = `[${name}] ` + prefix;
      requestGroupId = reqGroup.parentId;
    } while (true);

    return prefix;
  }

  renderArgModel(value: string, modelType: string, defaultSelector: string, defaultValue: string) {
    const { filterTests } = this.props;
    const id = value || 'n/a';
    if (modelType === 'nunjucks-test') {
      return (
        <select value={id} onChange={this._handleChange}>
          <option value={defaultValue}>{defaultSelector}</option>
          {filterTests.map((test: any, index) => {
            return (
              <option key={index} value={test}>{test}</option>
            );
          })}
        </select>
      );
    }
    const { allDocs, loadingDocs } = this.state;
    const docs = allDocs[modelType] || [];

    if (loadingDocs) {
      return (
        <select disabled={loadingDocs}>
          <option>Loading...</option>
        </select>
      );
    }

    return (
      <select value={id} onChange={this._handleChange}>
        <option value={defaultValue}>{defaultSelector}</option>
        {docs.map((doc: any) => {
          let namePrefix: string | null = null;

          // Show parent folder with name if it's a request
          if (isRequest(doc)) {
            const requests = allDocs[models.request.type] || [];
            const request: any = requests.find(r => r._id === doc._id);
            const method = request && typeof request.method === 'string' ? request.method : 'GET';
            const parentId = request ? request.parentId : 'n/a';
            const allRequestGroups = allDocs[models.requestGroup.type] || [];
            const requestGroupPrefix = this.resolveRequestGroupPrefix(parentId, allRequestGroups);
            namePrefix = `${requestGroupPrefix + method} `;
          }

          const docName = typeof doc.name === 'string' ? doc.name : 'Unknown Request';
          return (
            <option key={doc._id} value={doc._id}>
              {namePrefix}
              {docName}
            </option>
          );
        })}
      </select>
    );
  }

  renderArg(
    argDefinition: NunjucksParsedFilterArgValue,
    argDatas: NunjucksParsedFilterArgValue[],
    argIndex: number,
  ) {
    // Decide whether or not to show it
    if (typeof argDefinition.hide === 'function' && argDefinition.hide(argDatas)) {
      return null;
    }

    let argData: NunjucksParsedFilterArgValue;

    if (argIndex < argDatas.length) {
      argData = argDatas[argIndex];
    } else {
      return null;
    }

    if (!argData) {
      console.error('Failed to find argument to set default', {
        argDefinition,
        argDatas,
        argIndex,
      });
      return null;
    }

    const strValue = templateUtils.decodeEncoding(argData.value?.toString() || '');
    let argInput;
    let isVariable = false;
    let isVariableAllowed = true;
    if (argDefinition.argEditingType === ArgumentValueType.Environment) {
      isVariable = true;
      argInput = this.renderArgVariable(argDefinition.value.toString() || '');
    } else if (argDefinition.argEditingType === ArgumentValueType.Variable) {
      isVariable = true;
      argInput = this.renderArgInlineVariable(argDefinition);
    } else if (argDefinition.type === 'string') {
      argInput = this.renderArgString(argDefinition);
    } else if (argDefinition.type === 'boolean') {
      argInput = this.renderArgBoolean(
        argDefinition.value === true || argDefinition.value === 'true'
      );
    } else if (argDefinition.type === 'number') {
      argInput = this.renderArgNumber(argDefinition);
    } else if (argDefinition.type === 'enum') {
      isVariableAllowed = false;
      argInput = this.renderArgEnum(argDefinition, argDatas);
    } else if (argDefinition.type === 'model') {
      isVariableAllowed = false;
      const model = typeof argDefinition.model === 'string' ? argDefinition.model : 'unknown';
      const defaultSelector = typeof argDefinition.placeholder === 'string' ? argDefinition.placeholder : '-- Select Item --';
      const defaultValue = typeof argDefinition.defaultValue === 'string' ? argDefinition.defaultValue : 'n/a';
      const modelId = typeof strValue === 'string' ? strValue : 'unknown';
      argInput = this.renderArgModel(modelId, model, defaultSelector, defaultValue);
    } else {
      return null;
    }

    const help =
      typeof argDefinition.help === 'string' || typeof argDefinition.help === 'function'
        ? fnOrString(argDefinition.help, argDatas)
        : '';
    const displayName =
      typeof argDefinition.displayName === 'string' ||
        typeof argDefinition.displayName === 'function'
        ? fnOrString(argDefinition.displayName, argDatas)
        : '';
    let validationError = '';
    const canValidate = argDefinition.type === 'string' || argDefinition.type === 'number';

    if (canValidate && typeof argDefinition.validate === 'function') {
      validationError = argDefinition.validate(strValue) || '';
    }

    const formControlClasses = classnames({
      'form-control': true,
      'form-control--thin': argDefinition.type === 'boolean',
      'form-control--outlined': argDefinition.type !== 'boolean',
    });
    const type = argDefinition.argEditingType;
    return (
      <div key={argIndex} className="form-row">
        <div className={formControlClasses}>
          <label data-arg-index={argIndex}>
            {fnOrString(displayName, argDatas)}
            {isVariable && <span className="faded space-left">(Variable)</span>}
            {help && <HelpTooltip className="space-left">{help}</HelpTooltip>}
            {validationError && <span className="font-error space-left">{validationError}</span>}
            {argInput}
          </label>
        </div>
        {isVariableAllowed ? (
          <div
            className={classnames('form-control form-control--outlined width-auto', {
              'form-control--no-label': argDefinition.type !== 'boolean',
            })}
          >
            <Dropdown right>
              <DropdownButton className="btn btn--clicky">
                <i className="fa fa-cog" />
              </DropdownButton>
              <DropdownDivider>Input Type</DropdownDivider>
              <DropdownItem
                value={{
                  type: ArgumentValueType.Literal,
                  argIndex,
                }}
                onClick={this._handleChangeArgVariable}
              >
                <i className={'fa ' + (type === ArgumentValueType.Literal ? 'fa-check' : '')} /> Static Value
              </DropdownItem>
              <DropdownItem
                value={{
                  type: ArgumentValueType.Environment,
                  argIndex,
                }}
                onClick={this._handleChangeArgVariable}
              >
                <i className={'fa ' + (type === ArgumentValueType.Environment ? 'fa-check' : '')} /> Environment Variable
              </DropdownItem>
              <DropdownItem
                value={{
                  type: ArgumentValueType.Variable,
                  argIndex,
                }}
                onClick={this._handleChangeArgVariable}
              >
                <i className={'fa ' + (type === ArgumentValueType.Variable ? 'fa-check' : '')} /> Local Variable
              </DropdownItem>
            </Dropdown>
          </div>
        ) : null}
      </div>
    );
  }

  render() {
    const { argsType } = this.state;
    return (
      <>
        {
          argsType.map((argDefinition, index) =>
            this.renderArg(argDefinition, argsType, index),
          )
        }
      </>
    );
  }
}
