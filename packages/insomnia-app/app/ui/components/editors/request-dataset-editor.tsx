import { autoBindMethodsForReact } from 'class-autobind-decorator';
import {
  ListGroup, ToggleSwitch,
} from 'insomnia-components';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import * as models from '../../../models';
import { Environment } from '../../../models/environment';
import { Request } from '../../../models/request';
import { RequestDataSet } from '../../../models/request-dataset';
import { Workspace } from '../../../models/workspace';
import { WrapperProps } from '../wrapper';
import DatasetRowEditor from './dataset-row-editor';

const StyledDatasetActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  > .jump-right {
    margin-left: auto;
  }
`;

interface Props {
  request: Request;
  handleGetRenderContext: HandleGetRenderContext;
  handleRender: HandleRender;
  handleGenerateCode: Function;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
  workspace: Workspace;
  environmentId: string;
  onSendWithDataset: (r: Request, headers: RequestDataSet) => void;
  wrapperProps: WrapperProps;
}

interface State {
  toggleIconRotation: number;
  baseDataset?: RequestDataSet;
  otherDatasets: RequestDataSet[];
  subEnvironments: Environment[];
  toggleEnvironmentFilter: boolean;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class RequestDatasetEditor extends PureComponent<Props, State> {
  _triggerTimeout: any = null;
  state: State = {
    toggleIconRotation: -90,
    otherDatasets: [],
    subEnvironments: [],
    toggleEnvironmentFilter: false,
  };

  constructor(props: Props) {
    super(props);
    this._load();
  }

  async _addNewDataSet() {
    const { otherDatasets, baseDataset } = this.state;
    if (baseDataset) {
      const dataset = await models.requestDataset.create({
        parentId: baseDataset.parentId,
      });
      this._onChange(
        baseDataset,
        [
          ...otherDatasets,
          dataset,
        ],
      );
    }
  }

  async _load() {
    const { request, workspace } = this.props;
    const rootEnvironment = await models.environment.getOrCreateForParentId(workspace._id);
    const subEnvironments = await models.environment.findByParentId(rootEnvironment._id);
    const baseDataset = await models.requestDataset.getOrCreateForRequest(request);
    let datasets = await models.requestDataset.findByParentId(request._id);
    datasets = datasets.filter(ds => ds._id !== baseDataset._id);
    this.setState({
      subEnvironments,
      baseDataset,
      otherDatasets: datasets,
      toggleEnvironmentFilter: request.settingDatasetFilter || false,
    });
  }

  async onBaseDatasetChanged(dataset: RequestDataSet) {
    const { otherDatasets, baseDataset } = this.state;
    if (baseDataset) {
      const bdsKeys = Object.keys(dataset.environment);
      const updatedDataset = await models.requestDataset.update(baseDataset, {
        environment: dataset.environment,
      });
      const newDatasetResults = otherDatasets.map(ds => {
        const dsEnvironment = bdsKeys.reduce(
          (obj, key) => Object.assign(obj, {
            [key]: Object.assign({
              value: '',
              description: '',
            }, ds.environment[key], {
              id: key,
              name: dataset.environment[key].name,
              metaSortKey: dataset.environment[key].metaSortKey,
            }),
          }), {});
        (ds as any).new = true;
        return models.requestDataset.update(ds, {
          environment: dsEnvironment,
        });
      });
      let newDatasets = await Promise.all(newDatasetResults);
      newDatasets = newDatasets.map(ds => Object.assign(ds, { new: true }));
      this._onChange(updatedDataset, newDatasets);
    }
  }

  _onChange(baseDataset: RequestDataSet, otherDatasets: RequestDataSet[]) {
    this.setState(
      { baseDataset, otherDatasets },
    );
  }

  async onDatasetChanged(dataset: RequestDataSet) {
    const { otherDatasets, baseDataset } = this.state;
    let updatingDataset = otherDatasets.filter(ds => ds._id === dataset._id)[0];
    if (updatingDataset && baseDataset) {
      const index = otherDatasets.indexOf(updatingDataset);
      updatingDataset = await models.requestDataset.update(updatingDataset, {
        environment: dataset.environment,
        name: dataset.name,
        description: dataset.description,
        applyEnv: dataset.applyEnv,
      });
      const newDatasets = otherDatasets.map(ds => ds._id === updatingDataset._id ? updatingDataset : ds);
      otherDatasets[index] = updatingDataset;
      this._onChange(baseDataset, newDatasets);
    }
  }

  async onDeleteDataset(dataset: RequestDataSet) {
    const { otherDatasets, baseDataset } = this.state;
    const deletingDataset = otherDatasets.filter(ds => ds._id === dataset._id)[0];
    if (deletingDataset && baseDataset) {
      await models.requestDataset.remove(deletingDataset);
      const newDatasets = otherDatasets.filter(ds => ds._id !== dataset._id);
      this._onChange(baseDataset, newDatasets);
    }
  }

  onSendWithDataset(dataset: RequestDataSet) {
    const { onSendWithDataset } = this.props;
    onSendWithDataset(this.props.request, dataset);
  }

  _handleGenerateCodeWithDataset(dataset: RequestDataSet) {
    const { handleGenerateCode, request } = this.props;
    handleGenerateCode(request, dataset);
  }

  _updateToggleEnvironmentFilter() {
    const { toggleEnvironmentFilter } = this.state;
    models.request.update(this.props.request, {
      settingDatasetFilter: !toggleEnvironmentFilter,
    });
    this.setState({
      toggleEnvironmentFilter: !toggleEnvironmentFilter,
    });
  }

  render() {
    const { baseDataset, otherDatasets, toggleEnvironmentFilter } = this.state;
    const {
      handleGetRenderContext,
      handleRender,
      isVariableUncovered,
      nunjucksPowerUserMode,
    } = this.props;
    const { activeEnvironment } = this.props.wrapperProps;
    return (
      <div className="pad">
        <div className="scrollable">
          <h4>Base dataset</h4>
          {baseDataset && <DatasetRowEditor
            wrapperProps={this.props.wrapperProps}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            dataset={baseDataset}
            isBaseDataset={true}
            onChanged={this.onBaseDatasetChanged}
          />}
          <hr />
          <StyledDatasetActionsContainer className="pod">
            <button className="btn btn--clicky faint" onClick={this._addNewDataSet}>
              Add new dataset
            </button>
            <ToggleSwitch
              labelClassName="jump-right"
              checked={toggleEnvironmentFilter}
              label={'Filter by env'}
              onChange={this._updateToggleEnvironmentFilter}
            />
          </StyledDatasetActionsContainer>
          <ListGroup>
            {otherDatasets.filter(ds => !toggleEnvironmentFilter || !ds.applyEnv || ds.applyEnv === activeEnvironment?._id)
              .map(dataset => (
                <DatasetRowEditor
                  key={dataset._id}
                  wrapperProps={this.props.wrapperProps}
                  nunjucksPowerUserMode={nunjucksPowerUserMode}
                  isVariableUncovered={isVariableUncovered}
                  handleRender={handleRender}
                  handleGetRenderContext={handleGetRenderContext}
                  onGenerateCodeWithDataset={this._handleGenerateCodeWithDataset}
                  dataset={dataset}
                  isBaseDataset={false}
                  onChanged={this.onDatasetChanged}
                  onDeleteDataset={this.onDeleteDataset}
                  onSendWithDataset={this.onSendWithDataset}
                />
              ))}
          </ListGroup>
        </div>
      </div>
    );
  }
}

export default RequestDatasetEditor;
